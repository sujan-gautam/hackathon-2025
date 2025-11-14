// services/gmailService.js (updated to handle attachment content as base64 instead of decoded string)
const { google } = require('googleapis');
const User = require('../models/userModel');

/**
 * Create OAuth2 client + auto refresh token
 */
const getOAuth2Client = async (user) => {
  if (!user.accessToken) {
    throw new Error('No Gmail access token found');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.API_URL}/api/auth/google/callback`
  );

  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken || undefined,
  });

  try {
    await oauth2Client.getAccessToken(); // forces refresh if needed
  } catch (err) {
    console.error('Gmail auth failed:', err.message);
    throw new Error('Gmail authentication expired — reconnect Google account.');
  }

  return oauth2Client;
};

/**
 * Fetch paginated list of emails with enhanced details including body, attachments, and metadata
 */
const getGmailEmails = async (user, options = {}) => {
  const { pageToken, maxResults = 10, labelIds = ['INBOX'] } = options;

  const oauth2Client = await getOAuth2Client(user);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds,
      maxResults,
      pageToken,
    });

    const messages = response.data.messages || [];

    // Fetch details for each email with full parsing
    const messageDetails = await Promise.all(
      messages.map(async ({ id, threadId }) => {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'full',
        });

        const msgData = fullMsg.data;
        const payload = msgData.payload;
        const headers = parseHeaders(payload.headers);
        const attachments = extractAttachments(payload);
        const body = extractEmailBody(payload);

        return {
          id,
          threadId,
          subject: headers.subject || '',
          from: headers.from || '',
          to: headers.to || '',
          date: headers.date || '',
          snippet: msgData.snippet,
          labels: msgData.labelIds,
          internalDate: msgData.internalDate, // Additional metadata: timestamp in ms
          sizeEstimate: msgData.sizeEstimate, // Additional metadata: approx size in bytes
          historyId: msgData.historyId, // Additional metadata: for tracking changes
          headers: headers, // Full headers as object for all metadata
          body, // Full body (HTML or plain)
          attachments, // Array of attachments including files and images
        };
      })
    );

    return {
      messages: messageDetails,
      nextPageToken: response.data.nextPageToken,
      total: response.data.resultSizeEstimate,
    };
  } catch (err) {
    console.error('Gmail API Error:', err.response?.data || err.message);
    throw new Error(`Failed to fetch emails: ${err.message}`);
  }
};

/**
 * Get a single email by ID with enhanced details
 */
const getEmailById = async (user, emailId) => {
  const oauth2Client = await getOAuth2Client(user);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full',
    });

    const msg = response.data;
    const payload = msg.payload;
    const headers = parseHeaders(payload.headers);
    const attachments = extractAttachments(payload);
    const body = extractEmailBody(payload);

    return {
      id: msg.id,
      threadId: msg.threadId,
      subject: headers.subject || '',
      from: headers.from || '',
      to: headers.to || '',
      date: headers.date || '',
      snippet: msg.snippet,
      labels: msg.labelIds,
      internalDate: msg.internalDate, // Additional metadata
      sizeEstimate: msg.sizeEstimate, // Additional metadata
      historyId: msg.historyId, // Additional metadata
      headers: headers, // Full headers
      body,
      attachments,
    };
  } catch (err) {
    console.error('Get email error:', err.response?.data || err.message);
    throw new Error(`Failed to get email: ${err.message}`);
  }
};

/**
 * Fetch full thread (previous conversations) by thread ID, including all messages in depth
 */
const getThreadById = async (user, threadId) => {
  const oauth2Client = await getOAuth2Client(user);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const response = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    const thread = response.data;
    const messages = thread.messages || [];

    // Parse each message in the thread
    const parsedMessages = messages.map((msg) => {
      const payload = msg.payload;
      const headers = parseHeaders(payload.headers);
      const attachments = extractAttachments(payload);
      const body = extractEmailBody(payload);

      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: headers.subject || '',
        from: headers.from || '',
        to: headers.to || '',
        date: headers.date || '',
        snippet: msg.snippet,
        labels: msg.labelIds,
        internalDate: msg.internalDate,
        sizeEstimate: msg.sizeEstimate,
        historyId: msg.historyId,
        headers: headers,
        body,
        attachments,
      };
    });

    return {
      threadId: thread.id,
      messages: parsedMessages, // All messages in chronological order (previous convos)
      historyId: thread.historyId,
    };
  } catch (err) {
    console.error('Get thread error:', err.response?.data || err.message);
    throw new Error(`Failed to get thread: ${err.message}`);
  }
};

/**
 * Extract headers into a clean object
 */
const parseHeaders = (headers = []) => {
  const map = {};
  headers.forEach((h) => {
    map[h.name.toLowerCase()] = h.value;
  });
  return map;
};

/**
 * Recursively extract email body (prefer HTML, fallback to plain text)
 */
const extractEmailBody = (payload, mimeTypePreference = ['text/html', 'text/plain']) => {
  if (!payload) return '';

  // If no parts, decode body if available
  if (!payload.parts && payload.body?.data) {
    return decodeBase64ToString(payload.body.data);
  }

  // Recurse through parts
  for (const preferredType of mimeTypePreference) {
    for (const part of payload.parts || []) {
      if (part.mimeType === preferredType && part.body?.data) {
        return decodeBase64ToString(part.body.data);
      }
      // Recurse into nested multiparts
      if (part.parts) {
        const nestedBody = extractEmailBody(part, mimeTypePreference);
        if (nestedBody) return nestedBody;
      }
    }
  }

  return '';
};

/**
 * Recursively extract attachments (files, images, etc.) including metadata and base64 content
 */
const extractAttachments = (payload, attachments = []) => {
  if (!payload) return attachments;

  // Check current part for attachment
  if (payload.filename && payload.body) {
    attachments.push({
      filename: payload.filename || '',
      mimeType: payload.mimeType || '',
      size: payload.body.size || 0,
      attachmentId: payload.body.attachmentId || null, // For fetching large attachments separately if needed
      content: payload.body.data ? normalizeBase64(payload.body.data) : '', // Base64 content (for binary-safe handling)
      disposition: (payload.headers || []).find(h => h.name.toLowerCase() === 'content-disposition')?.value || '', // e.g., 'attachment' or 'inline'
      contentId: (payload.headers || []).find(h => h.name.toLowerCase() === 'content-id')?.value || '', // For inline images
    });
  }

  // Recurse through parts
  if (payload.parts) {
    for (const part of payload.parts) {
      extractAttachments(part, attachments);
    }
  }

  return attachments;
};

/**
 * Normalize base64url to standard base64
 */
const normalizeBase64 = (data) => {
  if (!data) return '';
  return data.replace(/-/g, '+').replace(/_/g, '/');
};

/**
 * Decode base64 to UTF-8 string (for text content)
 */
const decodeBase64ToString = (data) => {
  const base64 = normalizeBase64(data);
  return Buffer.from(base64, 'base64').toString('utf-8');
};

// Export
module.exports = {
  getGmailEmails,
  getEmailById,
  getThreadById,
  getOAuth2Client,
};