// routes/userRoutes.js  (or wherever you define your routes)

const { getGmailEmails } = require('../services/gmailService');

// ADD THIS FUNCTION (NOT export!)
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

// NOW REGISTER THE ROUTE LIKE THIS:
router.get('/gmail/emails', verifyToken, getEmails);   // ← CORRECT!