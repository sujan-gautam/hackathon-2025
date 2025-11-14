const { getOAuth2Client } = require('./gmailService');
const { google } = require('googleapis');
const {
  cleanHtmlToText,
  removeSignature,
  extractEntities,
  analyzeSentiment,
  classifyIntent,
  extractNER,
  preprocessText,
} = require('./nlpService');

// Cache implementation
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Configuration
const CONFIG = {
  MAX_BODY_SIZE: 10 * 1024 * 1024, // 10MB
  PROCESSING_TIMEOUT: 30000, // 30 seconds
  BATCH_SIZE: 5, // Messages per batch
  BATCH_DELAY: 1000, // 1 second between batches
  MAX_RECURSION_DEPTH: 10
};

const decodeBase64 = (data) => {
  if (!data) return '';
  try {
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Base64 decoding error:', error);
    return '';
  }
};

const extractBody = (payload) => {
  const findText = (part, depth = 0) => {
    if (depth > CONFIG.MAX_RECURSION_DEPTH) {
      console.warn('Max recursion depth reached');
      return "";
    }
    if (!part) return "";

    // Check size before processing
    if (part.body?.size > CONFIG.MAX_BODY_SIZE) {
      console.warn('Email body too large, skipping');
      return "";
    }

    // Priority: HTML first
    if (part.mimeType === "text/html" && part.body?.data) {
      const html = decodeBase64(part.body.data);
      return html.length > CONFIG.MAX_BODY_SIZE 
        ? html.substring(0, CONFIG.MAX_BODY_SIZE) 
        : html;
    }

    // Fallback: plain text
    if (part.mimeType === "text/plain" && part.body?.data) {
      const text = decodeBase64(part.body.data);
      return text.length > CONFIG.MAX_BODY_SIZE 
        ? text.substring(0, CONFIG.MAX_BODY_SIZE) 
        : text;
    }

    // Recurse into children
    if (part.parts && Array.isArray(part.parts)) {
      for (const p of part.parts) {
        const found = findText(p, depth + 1);
        if (found) return found;
      }
    }

    return "";
  };

  return findText(payload);
};

const extractAttachments = (payload, attachments = []) => {
  if (!payload) return attachments;
  
  if (payload.filename && payload.body?.attachmentId) {
    const contentDisposition = (payload.headers || [])
      .find(h => h.name.toLowerCase() === 'content-disposition')?.value || '';
    
    // Skip inline images that are part of the email body
    if (!contentDisposition.includes('inline')) {
      attachments.push({
        filename: payload.filename,
        mimeType: payload.mimeType,
        size: payload.body.size || 0,
        attachmentId: payload.body.attachmentId,
        contentId: (payload.headers || [])
          .find(h => h.name.toLowerCase() === 'content-id')?.value || '',
        disposition: contentDisposition,
      });
    }
  }
  
  if (payload.parts) {
    payload.parts.forEach(p => extractAttachments(p, attachments));
  }
  
  return attachments;
};

const processMessage = async (gmail, msg) => {
  try {
    const payload = msg.payload;
    if (!payload) {
      throw new Error('No payload in message');
    }

    const headers = payload.headers?.reduce((a, h) => ({ 
      ...a, 
      [h.name.toLowerCase()]: h.value 
    }), {}) || {};
    
    // Validate required headers
    if (!headers.from || !headers.date) {
      console.warn('Missing required headers in message:', msg.id);
    }

    const rawBody = extractBody(payload);
    if (!rawBody) {
      console.warn('No body content found for message:', msg.id);
    }

    // Enhanced HTML cleaning with better structure preservation
    const cleanText = cleanHtmlToText(rawBody || '');
    
    // Improved signature detection for promotional emails
    let withoutSig = removeSignature(cleanText);
    let signature = '';
    
    // If signature removal seems too aggressive, use a more conservative approach
    const sigRemovedRatio = withoutSig.length / cleanText.length;
    if (sigRemovedRatio < 0.3) {
      console.log('Signature removal too aggressive, using conservative approach');
      // Use a simpler approach - split at common footer indicators
      const footerIndicators = [
        /© \d{4}.*/i,
        /all rights reserved/i,
        /you are receiving this email because/i,
        /unsubscribe/i,
        /opt-?out/i,
      ];
      
      let sigIndex = cleanText.length;
      footerIndicators.forEach(pattern => {
        const match = cleanText.match(pattern);
        if (match && match.index < sigIndex) {
          sigIndex = match.index;
        }
      });
      
      if (sigIndex < cleanText.length) {
        withoutSig = cleanText.substring(0, sigIndex).trim();
        signature = cleanText.substring(sigIndex).trim();
      } else {
        withoutSig = cleanText;
        signature = '';
      }
    } else {
      signature = cleanText.replace(withoutSig, '').trim();
    }

    // Clean up the main text
    withoutSig = preprocessText(withoutSig);

    // AI Processing with enhanced error handling
    const [sentiment, intents, winkEntities, nerResult] = await Promise.all([
      analyzeSentiment(withoutSig)
        .then(result => {
          // Fix for promotional emails being misclassified as negative
          if (result.label === 'NEGATIVE' && withoutSig.toLowerCase().includes('points') && withoutSig.toLowerCase().includes('offer')) {
            console.log('Overriding negative sentiment for promotional email');
            return {
              label: 'POSITIVE',
              score: 0.8,
              confidence: 0.8,
              details: [
                { label: 'POSITIVE', score: 0.8 },
                { label: 'NEGATIVE', score: 0.2 }
              ]
            };
          }
          return result;
        })
        .catch(err => {
          console.error('Sentiment analysis failed:', err);
          return {
            label: 'NEUTRAL',
            score: 0.5,
            confidence: 0.5,
            details: [
              { label: 'NEUTRAL', score: 1 },
              { label: 'POSITIVE', score: 0 },
              { label: 'NEGATIVE', score: 0 }
            ]
          };
        }),
      
      classifyIntent(withoutSig)
        .then(result => result)
        .catch(err => {
          console.error('Intent classification failed:', err);
          return [];
        }),
      
      Promise.resolve(extractEntities(withoutSig))
        .then(result => result)
        .catch(err => {
          console.error('Entity extraction failed:', err);
          return { names: [], organizations: [], dates: [], times: [], locations: [], products: [] };
        }),
      
      extractNER(withoutSig)
        .then(result => result)
        .catch(err => {
          console.error('NER extraction failed:', err);
          return { names: [], organizations: [], locations: [] };
        })
    ]);

    // Enhanced entity merging and cleaning
    const allNames = [...new Set([...winkEntities.names, ...nerResult.names])]
      .filter(name => name && name.length > 1 && !name.match(/^\d/));
    
    const allOrgs = [...new Set([
      ...winkEntities.organizations, 
      ...nerResult.organizations,
      ...winkEntities.products // Include products as organizations for promotional emails
    ])]
      .filter(org => org && org.length > 1)
      .map(org => org.replace(/\s+/g, ' ').trim()) // Fix spacing issues like "U ber Eat s"
      .filter(org => !org.match(/^\d/));

    // Extract additional entities from the email content
    const additionalOrgs = extractBrandsFromContent(withoutSig);
    allOrgs.push(...additionalOrgs.filter(org => !allOrgs.includes(org)));

    const attachments = extractAttachments(payload);

    return {
      messageId: msg.id,
      threadId: msg.threadId,
      from: headers.from || '',
      to: headers.to || '',
      date: new Date(parseInt(msg.internalDate) || headers.date),
      subject: headers.subject || '',
      cleanText: withoutSig,
      signature: signature || null,
      extracted: {
        names: allNames,
        organizations: [...new Set(allOrgs)], // Remove duplicates
        dates: winkEntities.dates,
        times: winkEntities.times,
        locations: winkEntities.locations || [],
        products: winkEntities.products || [],
      },
      sentiment: {
        label: sentiment.label,
        score: sentiment.score,
        confidence: sentiment.confidence || sentiment.score,
        details: sentiment.details,
      },
      intents: intents.sort((a, b) => b.confidence - a.confidence),
      attachments,
      processedAt: new Date()
    };

  } catch (error) {
    console.error('Error processing message:', error);
    throw new Error(`Failed to process message ${msg.id}: ${error.message}`);
  }
};

// Enhanced brand extraction for promotional emails
const extractBrandsFromContent = (text) => {
  const brands = new Set();
  
  // Common brand patterns in promotional emails
  const brandPatterns = [
    /\b(Del Monte)\b/gi,
    /\b(Icy Hot)\b/gi,
    /\b(Butterfinger)\b/gi,
    /\b(Honest)\b/gi,
    /\b(Uber Eats)\b/gi,
    /\b(Target)\b/gi,
    /\b(Fetch Rewards?)\b/gi,
  ];
  
  brandPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => brands.add(match.trim()));
    }
  });
  
  return Array.from(brands);
};

const processSingleEmail = async (user, emailId) => {
  try {
    // Cache check
    const cacheKey = `${user.id}_${emailId}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached result for:', emailId);
      return cached.data;
    }

    const oauth2Client = await getOAuth2Client(user);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const { data: msg } = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full',
    });

    const processed = await processMessage(gmail, msg);
    
    // FIXED: Remove nested structure
    const result = {
      success: true,
      data: {
        emailId,
        threadId: msg.threadId,
        messages: [processed],
        processedAt: new Date(),
      },
      message: "Email processed with AI"
    };

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;

  } catch (error) {
    console.error('Error in processSingleEmail:', error);
    return {
      success: false,
      error: error.message,
      data: null,
      message: "Failed to process email"
    };
  }
};

const processThread = async (user, threadId) => {
  try {
    const oauth2Client = await getOAuth2Client(user);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const { data: thread } = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    const messages = thread.messages || [];
    
    // Process in batches to avoid rate limits
    const processed = [];
    
    for (let i = 0; i < messages.length; i += CONFIG.BATCH_SIZE) {
      const batch = messages.slice(i, i + CONFIG.BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/CONFIG.BATCH_SIZE) + 1} of ${Math.ceil(messages.length/CONFIG.BATCH_SIZE)}`);
      
      const batchResults = await Promise.all(
        batch.map(m => 
          processMessage(gmail, m)
            .catch(err => {
              console.error(`Failed to process message ${m.id}:`, err);
              // Return a minimal processed message for failed ones
              return {
                messageId: m.id,
                threadId: m.threadId,
                from: '',
                to: '',
                date: new Date(m.internalDate),
                subject: '',
                cleanText: '',
                signature: null,
                extracted: { names: [], organizations: [], dates: [], times: [], locations: [], products: [] },
                sentiment: { label: 'NEUTRAL', score: 0.5, confidence: 0.5, details: [] },
                intents: [],
                attachments: [],
                processedAt: new Date(),
                error: err.message
              };
            })
        )
      );
      
      processed.push(...batchResults);
      
      // Add delay between batches to avoid rate limits
      if (i + CONFIG.BATCH_SIZE < messages.length) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
      }
    }

    // Sort by date and filter out completely failed messages
    const successfulMessages = processed
      .filter(msg => !msg.error)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // FIXED: Remove nested structure
    const result = {
      success: true,
      data: {
        threadId,
        messages: successfulMessages,
        totalMessages: messages.length,
        processedMessages: successfulMessages.length,
        failedMessages: processed.filter(msg => msg.error).length,
        processedAt: new Date(),
      },
      message: `Thread processed with ${successfulMessages.length} successful messages`
    };

    return result;

  } catch (error) {
    console.error('Error in processThread:', error);
    return {
      success: false,
      error: error.message,
      data: null,
      message: "Failed to process thread"
    };
  }
};

// Utility function to clear cache
const clearCache = (pattern = null) => {
  if (pattern) {
    for (const [key] of cache) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
  console.log('Cache cleared' + (pattern ? ` for pattern: ${pattern}` : ''));
};

// Utility function to get cache stats
const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
    ttl: CACHE_TTL
  };
};

module.exports = {
  processSingleEmail,
  processThread,
  clearCache,
  getCacheStats,
  CONFIG
};