const Message = require('../models/Message');
const User = require('../models/User');

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { sender, receiver, text } = req.body;
    if (!sender || !receiver || !text) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const message = await Message.create({ sender, receiver, text });
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get messages between two users
exports.getMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.query;
    if (!user1 || !user2) {
      return res.status(400).json({ message: 'user1 and user2 are required' });
    }
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
      status: { $ne: 'archived' },
    }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete a message (soft delete)
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (String(message.sender) !== String(userId)) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    message.status = 'deleted';
    await message.save();
    res.json({ message });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Archive chat (all messages between two users)
exports.archiveChat = async (req, res) => {
  try {
    const { user1, user2 } = req.body;
    if (!user1 || !user2) {
      return res.status(400).json({ message: 'user1 and user2 are required' });
    }
    await Message.updateMany({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ]
    }, { status: 'archived' });
    res.json({ message: 'Chat archived' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Undo last message (within 2 minutes)
exports.undoMessage = async (req, res) => {
  try {
    const sender = req.user.id;
    const { receiver } = req.body;
    if (!receiver) {
      return res.status(400).json({ message: 'Receiver is required' });
    }
    // Find last message sent by this user to receiver, not deleted/archived
    const lastMsg = await Message.findOne({
      sender,
      receiver,
      status: { $in: ['sent'] },
    }).sort({ createdAt: -1 });
    if (!lastMsg) return res.status(404).json({ message: 'No message to undo' });
    // Check if within 2 minutes
    const now = new Date();
    if ((now - lastMsg.createdAt) / 1000 > 120) {
      return res.status(400).json({ message: 'Undo window expired' });
    }
    lastMsg.status = 'deleted';
    await lastMsg.save();
    res.json({ message: lastMsg });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 