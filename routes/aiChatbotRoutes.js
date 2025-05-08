// backend/routes/aiChatbotRoutes.js
const express = require('express');
// *** Import the renamed function ***
const { askGoogleAI } = require('../controllers/aiChatbotController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/ai-chatbot/ask
// *** Use the renamed function ***
router.post('/ask', authMiddleware, askGoogleAI);

module.exports = router;