const express = require('express');
const { processChat } = require('../controllers/chatController');
const router = express.Router();

// POST route for chat
router.post('/chat', processChat);

module.exports = router;