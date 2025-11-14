// models/processedEmailModel.js
const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: String,
  mimeType: String,
  size: Number,
  contentId: String,
  disposition: String,
});

const intentSchema = new mongoose.Schema({
  intent: String,
  confidence: { type: Number, min: 0, max: 1 },
});

const sentimentSchema = new mongoose.Schema({
  label: String,
  score: { type: Number, min: -1, max: 1 },
  confidence: { type: Number, min: 0, max: 1 },
});

const extractedSchema = new mongoose.Schema({
  names: [String],
  organizations: [String],
  dates: [Date],
  times: [String],
});

const messageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  threadId: String,
  from: String,
  to: String,
  date: Date,
  subject: String,
  cleanText: String,
  signature: String,
  extracted: extractedSchema,
  sentiment: sentimentSchema,
  intents: [intentSchema],
  attachments: [attachmentSchema],
});

const processedEmailSchema = new mongoose.Schema({
    // 1. Reference to the User who owns this data
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    
    // 2. Original unique IDs
    emailId: { 
        type: String, 
        required: true, 
        // Optional: Add index for faster lookups
        // unique: true // Consider if you only want to store each email once
    }, 
    threadId: String,

    // 3. Metadata
    processedAt: { 
        type: Date, 
        default: Date.now 
    },
    isThread: { 
        type: Boolean, 
        default: false 
    },

    // 4. The core analyzed content
    messages: [messageSchema], // Array of individual messages (one for single email, many for a thread)
}, { 
    timestamps: true // Adds createdAt and updatedAt fields
});

processedEmailSchema.index({ user: 1, emailId: 1 }, { unique: true });
processedEmailSchema.index({ user: 1, threadId: 1 });

module.exports = mongoose.model('ProcessedEmail', processedEmailSchema);