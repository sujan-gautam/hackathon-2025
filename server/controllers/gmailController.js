// services/gmailService.js
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
 * Fetch paginated list of emails
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

    // Fetch details for each email
    const messageDetails = await Promise.all(
      messages.map(async ({ id, threadId }) => {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'full',
        });

        const payload = fullMsg.data.payload;
        const headers = parseHeaders(payload.headers);

        return {
          id,
          threadId,
          subject: headers.subject || '',
          from: headers.from || '',
          date: headers.date || '',
          snippet: fullMsg.data.snippet,
          labels: fullMsg.data.labelIds,
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
 * Get a single email by ID
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
    const headers = parseHeaders(msg.payload.headers);

    return {
      id: msg.id,
      threadId: msg.threadId,
      subject: headers.subject || '',
      from: headers.from || '',
      to: headers.to || '',
      date: headers.date || '',
      snippet: msg.snippet,
      labels: msg.labelIds,
      body: extractEmailBody(msg.payload),
    };
  } catch (err) {
    console.error('Get email error:', err.response?.data || err.message);
    throw new Error(`Failed to get email: ${err.message}`);
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
 * Extract email body from Gmail API response
 */
const extractEmailBody = (payload) => {
  if (!payload) return '';

  if (payload.parts) {
    // Look for HTML first, then plain
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return base64UrlDecode(part.body.data);
      }
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return base64UrlDecode(part.body.data);
      }
    }
    // Fallback to first part
    if (payload.parts[0]?.body?.data) {
      return base64UrlDecode(payload.parts[0].body.data);
    }
  }

  // Simple message
  return payload.body?.data ? base64UrlDecode(payload.body.data) : '';
};

/**
 * Base64 URL decode helper
 */
const base64UrlDecode = (data) => {
  if (!data) return '';
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
};

// Export
module.exports = {
  getGmailEmails,
  getEmailById,
};
