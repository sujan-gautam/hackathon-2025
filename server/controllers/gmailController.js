// controllers/gmailController.js
const User = require('../models/userModel');
const { getGmailEmails, getEmailById, getThreadById } = require('../services/gmailService');

const getEmails = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('accessToken refreshToken');

    if (!user?.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected. Please reconnect with Google.',
      });
    }

    const { pageToken, limit = '10' } = req.query;
    const emails = await getGmailEmails(user, {
      pageToken: pageToken?.toString(),
      maxResults: parseInt(limit, 10),
    });

    res.json({
      success: true,
      data: emails,
      message: 'Emails fetched successfully',
    });
  } catch (error) {
    console.error('Get Gmail emails error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch emails',
    });
  }
};

const getSingleEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('accessToken refreshToken');

    if (!user?.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected. Please reconnect with Google.',
      });
    }

    const { emailId } = req.params;
    if (!emailId) {
      return res.status(400).json({
        success: false,
        message: 'Email ID is required',
      });
    }

    const email = await getEmailById(user, emailId);

    res.json({
      success: true,
      data: email,
      message: 'Email fetched successfully',
    });
  } catch (error) {
    console.error('Get single email error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch email',
    });
  }
};

const getThread = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('accessToken refreshToken');

    if (!user?.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected. Please reconnect with Google.',
      });
    }

    const { threadId } = req.params;
    if (!threadId) {
      return res.status(400).json({
        success: false,
        message: 'Thread ID is required',
      });
    }

    const thread = await getThreadById(user, threadId);

    res.json({
      success: true,
      data: thread,
      message: 'Thread fetched successfully',
    });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch thread',
    });
  }
};

module.exports = {
  getEmails,
  getSingleEmail,
  getThread,
};