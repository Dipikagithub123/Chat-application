const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Send a message
router.post('/', auth, messageController.sendMessage);
// Get messages between two users
router.get('/', auth, messageController.getMessages);
// Delete a message
router.delete('/:id', auth, messageController.deleteMessage);
// Archive chat
router.post('/archive', auth, messageController.archiveChat);
// Undo last message
router.post('/undo', auth, messageController.undoMessage);

module.exports = router; 