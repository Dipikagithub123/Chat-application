require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const socketio = require('socket.io');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes (to be implemented)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));

// Track connected users: userId -> socket.id
const onlineUsers = new Map();

io.on('connection', (socket) => {
  // Listen for user identification
  socket.on('identify', (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  // Listen for new messages
  socket.on('message', async (msg) => {
    // Save message to DB
    const savedMsg = await Message.create({
      sender: msg.senderId,
      receiver: msg.receiverId,
      text: msg.text,
    });
    // Emit to receiver if online
    const receiverSocketId = onlineUsers.get(msg.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message', {
        ...msg,
        createdAt: savedMsg.createdAt,
        _id: savedMsg._id,
      });
    }
    // Also emit to sender for real-time update
    const senderSocketId = onlineUsers.get(msg.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('message', {
        ...msg,
        createdAt: savedMsg.createdAt,
        _id: savedMsg._id,
      });
    }
  });

  // Real-time delete message
  socket.on('delete-message', async ({ _id, receiverId }) => {
    await Message.findByIdAndUpdate(_id, { status: 'deleted' });
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('delete-message', { _id });
    }
    const senderSocketId = onlineUsers.get([...onlineUsers.entries()].find(([id, sid]) => sid === socket.id)?.[0]);
    if (senderSocketId) {
      io.to(senderSocketId).emit('delete-message', { _id });
    }
  });

  // Real-time undo message
  socket.on('undo-message', ({ receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('undo-message');
    }
    const senderSocketId = onlineUsers.get([...onlineUsers.entries()].find(([id, sid]) => sid === socket.id)?.[0]);
    if (senderSocketId) {
      io.to(senderSocketId).emit('undo-message');
    }
  });

  // WebRTC signaling events
  socket.on('call-user', ({ to, offer }) => {
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call-made', {
        from: [...onlineUsers.entries()].find(([id, sid]) => sid === socket.id)?.[0],
        offer,
      });
    }
  });

  socket.on('answer-call', ({ to, answer }) => {
    const callerSocketId = onlineUsers.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('answer-made', {
        from: [...onlineUsers.entries()].find(([id, sid]) => sid === socket.id)?.[0],
        answer,
      });
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    const peerSocketId = onlineUsers.get(to);
    if (peerSocketId) {
      io.to(peerSocketId).emit('ice-candidate', {
        from: [...onlineUsers.entries()].find(([id, sid]) => sid === socket.id)?.[0],
        candidate,
      });
    }
  });

  socket.on('disconnect', () => {
    // Remove user from onlineUsers
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});