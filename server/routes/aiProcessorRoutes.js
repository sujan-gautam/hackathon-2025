// routes/aiProcessorRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyTokenHandler');
const { processEmail, processThread } = require('../controllers/aiEmailProcessorController');


// AI-powered processing
router.post('/email/:emailId', processEmail);
router.post('/thread/:threadId', processThread);

module.exports = router;