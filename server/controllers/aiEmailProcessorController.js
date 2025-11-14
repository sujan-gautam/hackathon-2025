// controllers/aiEmailProcessorController.js
const ProcessedEmail = require('../models/processedEmailModel');
const { processSingleEmail, processThread } = require('../services/aiEmailProcessor');

const processEmail = async (req, res) => {
  try {
    const { emailId } = req.params;
    const user = req.user;

    const result = await processSingleEmail(user, emailId);

    await ProcessedEmail.findOneAndUpdate(
      { user: user._id, emailId },
      {
        $set: {
          ...result,
          user: user._id,
          isThread: false,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: result,
      message: 'Email processed with AI',
    });
  } catch (err) {
    console.error('AI Process email error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'AI processing failed',
    });
  }
};

// FIXED: Renamed to avoid conflict
const processThreadCtrl = async (req, res) => {
  try {
    const { threadId } = req.params;
    const user = req.user;

    const result = await processThread(user, threadId);

    await ProcessedEmail.findOneAndUpdate(
      { user: user._id, threadId },
      {
        $set: {
          ...result,
          user: user._id,
          emailId: result.messages[0]?.messageId,
          isThread: true,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: result,
      message: 'Thread processed with AI',
    });
  } catch (err) {
    console.error('AI Process thread error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'AI thread processing failed',
    });
  }
};

module.exports = { processEmail, processThread: processThreadCtrl };