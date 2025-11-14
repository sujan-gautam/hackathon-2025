const { pipeline } = require('@xenova/transformers');
const winkNLP = require('wink-nlp');
const winkModel = require('wink-eng-lite-web-model');
const htmlToText = require('html-to-text');
const striptags = require('striptags');
const { parse, isValid, format } = require('date-fns');

// --- ENHANCED: DEFENSIVE CHECK FOR MODEL INTEGRITY ---
if (!winkModel || typeof winkModel !== 'object' || Object.keys(winkModel).length === 0) {
    throw new Error('Wink model failed to load. Please ensure "wink-eng-lite-web-model" is installed and exporting the model data correctly.');
}

// Enhanced configuration
const CONFIG = {
    CACHE_TTL: 15 * 60 * 1000, // 15 minutes cache
    MAX_TEXT_LENGTH: 10000, // Limit text processing length
    CONFIDENCE_THRESHOLD: 0.1,
    BATCH_SIZE: 5,
    TIMEOUT: 30000, // 30 seconds timeout per operation
};

// Cache implementation for expensive operations
const cache = new Map();
const nlp = winkNLP(winkModel);

// Enhanced pipeline management with error handling and fallbacks
let pipelines = {
    zeroShotClassifier: null,
    sentimentAnalyzer: null,
    nerPipeline: null,
    featureExtractor: null,
    loaded: false,
    loading: false
};

const loadPipelines = async () => {
    if (pipelines.loaded) return pipelines;
    if (pipelines.loading) {
        // Wait if already loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        return pipelines;
    }

    pipelines.loading = true;
    try {
        console.log('Loading NLP pipelines...');
        
        // Load pipelines in parallel with timeout
        const pipelinePromises = [
            pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli')
                .then(p => pipelines.zeroShotClassifier = p)
                .catch(err => console.warn('Zero-shot classifier failed to load:', err.message)),
            
            pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english')
                .then(p => pipelines.sentimentAnalyzer = p)
                .catch(err => console.warn('Sentiment analyzer failed to load:', err.message)),
            
            pipeline('ner', 'Xenova/bert-base-NER')
                .then(p => pipelines.nerPipeline = p)
                .catch(err => console.warn('NER pipeline failed to load:', err.message)),
            
            pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
                .then(p => pipelines.featureExtractor = p)
                .catch(err => console.warn('Feature extractor failed to load:', err.message))
        ];

        await Promise.race([
            Promise.all(pipelinePromises),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Pipeline loading timeout')), 60000)
            )
        ]);

        pipelines.loaded = true;
        console.log('NLP pipelines loaded successfully');
    } catch (error) {
        console.error('Failed to load NLP pipelines:', error);
        // Set fallback flags
        pipelines.loaded = true; // Mark as loaded to prevent retries
    } finally {
        pipelines.loading = false;
    }

    return pipelines;
};

// Enhanced text preprocessing
const preprocessText = (text, maxLength = CONFIG.MAX_TEXT_LENGTH) => {
    if (!text || typeof text !== 'string') return '';
    
    return text
        .replace(/[\u200b\u200c\u200d\u200e\u200f\uFEFF]/g, '') // Remove zero-width chars
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[^\w\s@.,!?$%&*+-\/:=<>]/g, '') // Clean special chars but keep basic punctuation
        .trim()
        .substring(0, maxLength); // Limit length
};

// Enhanced HTML cleaning with better preservation of structure
const cleanHtmlToText = (html) => {
    if (!html) return '';
    
    try {
        // First pass: strip tags but preserve basic structure
        const stripped = striptags(html, [], '\n');
        
        // Enhanced html-to-text configuration
        return htmlToText.htmlToText(stripped, {
            wordwrap: false,
            ignoreHref: true,
            ignoreImage: true,
            uppercaseHeadings: false,
            preserveNewlines: true,
            decodeOptions: { isAttributeValue: false },
            format: {
                heading: (elem, walk, builder) => {
                    builder.addLineBreak();
                    walk(elem.children, builder);
                    builder.addLineBreak();
                },
                paragraph: (elem, walk, builder) => {
                    walk(elem.children, builder);
                    builder.addLineBreak();
                },
                lineBreak: (elem, walk, builder) => {
                    builder.addLineBreak();
                }
            }
        }).trim();
    } catch (error) {
        console.error('HTML cleaning failed, using fallback:', error);
        // Fallback: basic tag stripping
        return striptags(html).replace(/\s+/g, ' ').trim();
    }
};

// Enhanced signature detection with multiple strategies
const removeSignature = (text) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    if (lines.length <= 3) return text; // Too short to have signature
    
    // Strategy 1: Look for common signature indicators
    const sigIndicators = [
        /^\s*--\s*$/, // Classic signature separator
        /^\s*best\s+(regards|wishes),?$/i,
        /^\s*(thanks|thank you|cheers),?$/i,
        /^\s*sincerely,?$/i,
        /^\s*yours,?$/i,
        /^\s*sent from my\s+/i,
        /^\s*get outlook\s+/i,
        /^\s*confidentiality notice/i,
        /^\s*this email is confidential/i,
    ];
    
    // Strategy 2: Look for contact information patterns
    const contactPatterns = [
        /^\s*\w+@\w+\.\w+/, // Email
        /^\s*(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/, // Phone
        /^\s*www\.\w+\.\w+/i, // Website
        /^\s*linkedin\.com\/in\/\w+/i, // LinkedIn
    ];
    
    // Strategy 3: Look for legal/disclaimer text
    const legalPatterns = [
        /copyright\s+©?\s*\d{4}/i,
        /all rights reserved/i,
        /confidentiality notice/i,
        /this message is intended only/i,
        /if you received this email in error/i,
    ];
    
    let sigStartIndex = -1;
    
    // Check from bottom up for efficiency
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
        const line = lines[i].trim();
        
        if (sigIndicators.some(pattern => pattern.test(line)) ||
            contactPatterns.some(pattern => pattern.test(line)) ||
            legalPatterns.some(pattern => pattern.test(line))) {
            sigStartIndex = i;
            break;
        }
        
        // Additional check: if line looks like a name (Title Case)
        if (i === lines.length - 1 && /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(line)) {
            sigStartIndex = i;
            break;
        }
    }
    
    if (sigStartIndex !== -1) {
        return lines.slice(0, sigStartIndex).join('\n').trim();
    }
    
    return text;
};

// Enhanced entity extraction with multiple strategies
const extractEntities = (text = "") => {
    const processedText = preprocessText(text);
    if (!processedText) {
        return { names: [], organizations: [], dates: [], times: [], locations: [], products: [] };
    }

    const cacheKey = `entities_${Buffer.from(processedText).toString('base64').substring(0, 50)}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
        return cached.data;
    }

    try {
        const doc = nlp.readDoc(processedText);
        const entities = {
            names: new Set(),
            organizations: new Set(),
            dates: new Set(),
            times: new Set(),
            locations: new Set(),
            products: new Set(),
        };

        // Extract from winkNLP entities
        const ents = doc.entities();
        if (ents && ents.length > 0) {
            ents.forEach(ent => {
                if (!ent || !ent.type || !ent.value) return;

                const type = ent.type.toUpperCase();
                const value = ent.value.trim();
                if (!value || value.length < 2) return;

                switch (type) {
                    case "PERSON":
                        entities.names.add(value);
                        break;
                    case "ORGANIZATION":
                    case "ORG":
                        entities.organizations.add(value);
                        break;
                    case "DATE":
                        entities.dates.add(value);
                        break;
                    case "TIME":
                        entities.times.add(value);
                        break;
                    case "LOCATION":
                    case "GPE":
                        entities.locations.add(value);
                        break;
                }
            });
        }

        // Enhanced pattern-based extraction
        extractPatternBasedEntities(processedText, entities);
        
        // Normalize and validate dates
        const parsedDates = Array.from(entities.dates).map(d => {
            try {
                // Try multiple date formats
                const formats = ['PPP', 'PP', 'P', 'yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy'];
                for (const fmt of formats) {
                    try {
                        const parsed = parse(d, fmt, new Date());
                        if (isValid(parsed)) {
                            return format(parsed, 'yyyy-MM-dd');
                        }
                    } catch { /* Try next format */ }
                }
                return null;
            } catch {
                return null;
            }
        }).filter(Boolean);

        const result = {
            names: Array.from(entities.names).filter(name => name.length > 1),
            organizations: Array.from(entities.organizations).filter(org => org.length > 1),
            dates: parsedDates,
            times: Array.from(entities.times),
            locations: Array.from(entities.locations),
            products: Array.from(entities.products),
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;

    } catch (error) {
        console.error('Entity extraction failed:', error);
        return { names: [], organizations: [], dates: [], times: [], locations: [], products: [] };
    }
};

// Enhanced pattern-based entity extraction
const extractPatternBasedEntities = (text, entities) => {
    // Extract email addresses
    const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    if (emailMatches) {
        emailMatches.forEach(email => {
            const namePart = email.split('@')[0];
            if (namePart.length > 2 && !namePart.match(/\d/)) {
                entities.names.add(namePart.replace(/[._-]/g, ' ').trim());
            }
        });
    }

    // Extract product names (common in promotional emails)
    const productPatterns = [
        /\b(Del Monte|Icy Hot|Butterfinger|Honest|Uber Eats|Target|Fetch Rewards?)\b/gi,
        /\b(\w+\s+(Points|Rewards|Offers|Deals|Discounts))\b/gi,
    ];
    
    productPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(match => entities.products.add(match.trim()));
        }
    });

    // Extract company names from email domains
    const domainMatches = text.match(/\b@(\w+)\.(com|org|net|edu)\b/gi);
    if (domainMatches) {
        domainMatches.forEach(domain => {
            const company = domain.replace('@', '').split('.')[0];
            if (company.length > 2) {
                entities.organizations.add(company.charAt(0).toUpperCase() + company.slice(1));
            }
        });
    }
};

// Enhanced sentiment analysis with fallback
const analyzeSentiment = async (text) => {
    const processedText = preprocessText(text);
    if (!processedText) {
        return getNeutralSentiment();
    }

    const cacheKey = `sentiment_${Buffer.from(processedText).toString('base64').substring(0, 50)}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
        return cached.data;
    }

    try {
        await loadPipelines();
        
        if (!pipelines.sentimentAnalyzer) {
            return fallbackSentimentAnalysis(processedText);
        }

        const result = await Promise.race([
            pipelines.sentimentAnalyzer(processedText, { topk: 3 }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Sentiment analysis timeout')), CONFIG.TIMEOUT)
            )
        ]);

        const top = Array.isArray(result) ? result[0] : result;
        if (!top) return getNeutralSentiment();

        const label = normalizeSentimentLabel(top.label);
        const score = parseFloat(top.score.toFixed(4));

        const sentimentResult = {
            label,
            score,
            confidence: score,
            details: Array.isArray(result) ? result : [top],
        };

        cache.set(cacheKey, { data: sentimentResult, timestamp: Date.now() });
        return sentimentResult;

    } catch (error) {
        console.warn('Sentiment analysis failed, using fallback:', error.message);
        return fallbackSentimentAnalysis(processedText);
    }
};

// Enhanced intent classification with domain-specific categories
const classifyIntent = async (text) => {
    const processedText = preprocessText(text);
    if (!processedText) return [];

    const cacheKey = `intent_${Buffer.from(processedText).toString('base64').substring(0, 50)}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
        return cached.data;
    }

    try {
        await loadPipelines();
        
        if (!pipelines.zeroShotClassifier) {
            return fallbackIntentClassification(processedText);
        }

        // Enhanced candidate labels for email classification
        const candidateLabels = [
            'promotional_offers',
            'transactional_receipt',
            'customer_support',
            'newsletter_update',
            'personal_communication',
            'business_proposal',
            'meeting_scheduling',
            'job_application',
            'sales_inquiry',
            'technical_support',
            'billing_invoice',
            'shipping_delivery',
            'account_notification',
            'security_alert',
            'social_invitation'
        ];

        const result = await Promise.race([
            pipelines.zeroShotClassifier(processedText, candidateLabels, {
                hypothesis_template: 'This email is about {}.',
                multi_label: true,
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Intent classification timeout')), CONFIG.TIMEOUT)
            )
        ]);

        const intents = result.labels.map((label, i) => ({
            intent: label,
            confidence: parseFloat(result.scores[i].toFixed(4)),
        })).filter(i => i.confidence > CONFIG.CONFIDENCE_THRESHOLD)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 3); // Return top 3 intents

        cache.set(cacheKey, { data: intents, timestamp: Date.now() });
        return intents;

    } catch (error) {
        console.warn('Intent classification failed, using fallback:', error.message);
        return fallbackIntentClassification(processedText);
    }
};

// Enhanced NER with better entity consolidation
const extractNER = async (text) => {
    const processedText = preprocessText(text);
    if (!processedText) return { names: [], organizations: [], locations: [] };

    const cacheKey = `ner_${Buffer.from(processedText).toString('base64').substring(0, 50)}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
        return cached.data;
    }

    try {
        await loadPipelines();
        
        if (!pipelines.nerPipeline) {
            return extractEntities(processedText); // Fallback to winkNLP
        }

        const result = await Promise.race([
            pipelines.nerPipeline(processedText),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('NER timeout')), CONFIG.TIMEOUT)
            )
        ]);

        const entities = {
            names: new Set(),
            organizations: new Set(),
            locations: new Set(),
        };

        let currentEntity = null;

        result.forEach(token => {
            const [prefix, label] = token.entity.split('-');
            const cleanWord = token.word.replace(/##/g, '');

            if (prefix === 'B') {
                // Save previous entity
                if (currentEntity) {
                    addEntityToSet(currentEntity, entities);
                }
                currentEntity = { text: cleanWord, type: label };
            } else if (prefix === 'I' && currentEntity && currentEntity.type === label) {
                currentEntity.text += cleanWord.startsWith("'") ? cleanWord : ' ' + cleanWord;
            } else {
                if (currentEntity) {
                    addEntityToSet(currentEntity, entities);
                }
                currentEntity = prefix === 'B' ? { text: cleanWord, type: label } : null;
            }
        });

        // Add the last entity
        if (currentEntity) {
            addEntityToSet(currentEntity, entities);
        }

        const nerResult = {
            names: Array.from(entities.names),
            organizations: Array.from(entities.organizations),
            locations: Array.from(entities.locations),
        };

        cache.set(cacheKey, { data: nerResult, timestamp: Date.now() });
        return nerResult;

    } catch (error) {
        console.warn('NER failed, using fallback:', error.message);
        return extractEntities(processedText);
    }
};

// Helper function for NER
const addEntityToSet = (entity, entities) => {
    const trimmedText = entity.text.trim();
    if (trimmedText.length < 2) return;

    switch (entity.type) {
        case 'PER':
            entities.names.add(trimmedText);
            break;
        case 'ORG':
            entities.organizations.add(trimmedText);
            break;
        case 'LOC':
        case 'GPE':
            entities.locations.add(trimmedText);
            break;
    }
};

// Fallback implementations
const getNeutralSentiment = () => ({
    label: 'NEUTRAL',
    score: 0.5,
    confidence: 0.5,
    details: [
        { label: 'NEUTRAL', score: 1 },
        { label: 'POSITIVE', score: 0 },
        { label: 'NEGATIVE', score: 0 }
    ]
});

const normalizeSentimentLabel = (label) => {
    const upperLabel = label.toUpperCase();
    if (upperLabel.includes('POSITIVE')) return 'POSITIVE';
    if (upperLabel.includes('NEGATIVE')) return 'NEGATIVE';
    if (upperLabel.includes('NEUTRAL')) return 'NEUTRAL';
    return 'NEUTRAL';
};

const fallbackSentimentAnalysis = (text) => {
    const positiveWords = ['great', 'good', 'excellent', 'amazing', 'happy', 'pleased', 'fresh', 'bonus', 'reward'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'angry', 'disappointed', 'problem', 'issue'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach(word => {
        if (positiveWords.some(pw => word.includes(pw))) positiveScore++;
        if (negativeWords.some(nw => word.includes(nw))) negativeScore++;
    });
    
    const total = positiveScore + negativeScore;
    const score = total > 0 ? (positiveScore - negativeScore) / total : 0;
    
    const label = score > 0.1 ? 'POSITIVE' : score < -0.1 ? 'NEGATIVE' : 'NEUTRAL';
    
    return {
        label,
        score: Math.abs(score),
        confidence: Math.abs(score),
        details: [
            { label: 'POSITIVE', score: Math.max(0, score) },
            { label: 'NEGATIVE', score: Math.max(0, -score) },
            { label: 'NEUTRAL', score: 1 - Math.abs(score) }
        ]
    };
};

const fallbackIntentClassification = (text) => {
    const lowerText = text.toLowerCase();
    const intents = [];
    
    if (lowerText.match(/\b(points|reward|offer|deal|discount|bonus|promo)\b/)) {
        intents.push({ intent: 'promotional_offers', confidence: 0.85 });
    }
    if (lowerText.match(/\b(receipt|invoice|bill|payment|purchase|order)\b/)) {
        intents.push({ intent: 'transactional_receipt', confidence: 0.8 });
    }
    if (lowerText.match(/\b(help|support|problem|issue|question|contact)\b/)) {
        intents.push({ intent: 'customer_support', confidence: 0.75 });
    }
    if (lowerText.match(/\b(newsletter|update|news|announcement)\b/)) {
        intents.push({ intent: 'newsletter_update', confidence: 0.7 });
    }
    
    return intents.length > 0 ? intents : [{ intent: 'personal_communication', confidence: 0.5 }];
};

// Cache management utilities
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
};

const getCacheStats = () => ({
    size: cache.size,
    ttl: CONFIG.CACHE_TTL,
});

// Batch processing for multiple texts
const batchProcess = async (texts, operation) => {
    const results = [];
    for (let i = 0; i < texts.length; i += CONFIG.BATCH_SIZE) {
        const batch = texts.slice(i, i + CONFIG.BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(text => operation(text).catch(err => {
                console.error(`Batch processing failed for text:`, err);
                return null;
            }))
        );
        results.push(...batchResults);
        
        // Rate limiting
        if (i + CONFIG.BATCH_SIZE < texts.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return results;
};

module.exports = {
    cleanHtmlToText,
    removeSignature,
    extractEntities,
    analyzeSentiment,
    classifyIntent,
    extractNER,
    clearCache,
    getCacheStats,
    batchProcess,
    preprocessText,
    CONFIG,
};