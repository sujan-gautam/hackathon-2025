// routes/userRoutes.js (or wherever you define your routes)
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyTokenHandler'); 
const { getEmails, getSingleEmail, getThread } = require('../controllers/gmailController');

// Route for listing emails
router.get('/emails', getEmails);

// Route for getting a single email by ID
router.get('/emails/:emailId', getSingleEmail);

// Route for getting a full thread (previous conversations) by thread ID
router.get('/threads/:threadId', getThread);

module.exports = router;