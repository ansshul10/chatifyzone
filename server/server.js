const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const cors = require('cors');
const Message = require('./models/Message');
const AnonymousSession = require('./models/AnonymousSession');
const User = require('./models/User');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://chatify10.netlify.app',
    methods: ['GET', 'POST'],
  },
});

// Connect to MongoDB
connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || 'https://chatify10.netlify.app' }));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Map to store userId to socketId associations
const userSocketMap = new Map();

// Function to get all online users
const getOnlineUsers = async () => {
  const registeredUsers = await User.find({ online: true }).select('_id username online');
  const anonymousUsers = await AnonymousSession.find({ status: 'online' }).select('anonymousId username status');

  return [
    ...registeredUsers.map((user) => ({
      id: user._id.toString(),
      username: user.username,
      isAnonymous: false,
      online: user.online,
    })),
    ...anonymousUsers.map((session) => ({
      id: session.anonymousId,
      username: session.username,
      isAnonymous: true,
      online: session.status === 'online',
    })),
  ];
};

// Function to get previous messages for a user
const getPreviousMessages = async (userId) => {
  return await Message.find({
    $or: [{ sender: userId }, { receiver: userId }],
  }).sort({ createdAt: 1 });
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', async (userId) => {
    try {
      if (!userId) return;
      socket.join(userId);
      userSocketMap.set(userId, socket.id);

      if (userId.startsWith('anon-')) {
        const session = await AnonymousSession.findOne({ anonymousId: userId });
        if (session) {
          session.status = 'online';
          await session.save();
        }
      } else {
        await User.findByIdAndUpdate(userId, { online: true }, { new: true });
      }

      io.emit('userStatus', { userId, status: 'online' });
      const previousMessages = await getPreviousMessages(userId);
      socket.emit('loadPreviousMessages', previousMessages);

      const onlineUsers = await getOnlineUsers();
      io.emit('userListUpdate', onlineUsers);
    } catch (err) {
      console.error('Error in join event:', err);
    }
  });

  socket.on('sendMessage', async ({ sender, receiver, content }) => {
    try {
      if (!sender || !receiver || !content) return;
      const senderExists = sender.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: sender })
        : await User.findById(sender);
      const receiverExists = receiver.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: receiver })
        : await User.findById(receiver);
      if (!senderExists || !receiverExists) return;

      const message = new Message({
        sender,
        receiver,
        content,
        isAnonymous: sender.startsWith('anon-'),
      });
      await message.save();
      io.to(receiver).emit('receiveMessage', message);
      io.to(sender).emit('receiveMessage', message);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  });

  socket.on('editMessage', async ({ messageId, content, sender }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.sender !== sender) return;
      message.content = content;
      message.edited = true;
      await message.save();
      io.to(message.receiver).emit('messageEdited', message);
      io.to(message.sender).emit('messageEdited', message);
    } catch (err) {
      console.error('Error editing message:', err);
    }
  });

  socket.on('deleteMessage', async ({ messageId, sender }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.sender !== sender) return;
      await message.deleteOne();
      io.to(message.receiver).emit('messageDeleted', messageId);
      io.to(message.sender).emit('messageDeleted', messageId);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  });

  socket.on('logout', async (userId) => {
    try {
      if (!userId) return;

      if (userId.startsWith('anon-')) {
        await AnonymousSession.findOneAndDelete({ anonymousId: userId });
        await Message.deleteMany({ sender: userId, isAnonymous: true });
      } else {
        await User.findByIdAndUpdate(userId, { online: false }, { new: true });
      }

      userSocketMap.delete(userId);
      io.emit('userStatus', { userId, status: 'offline' });

      const onlineUsers = await getOnlineUsers();
      io.emit('userListUpdate', onlineUsers);
      console.log('User logged out:', userId);
    } catch (err) {
      console.error('Error in logout event:', err);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const userId = [...userSocketMap.entries()].find(([_, sid]) => sid === socket.id)?.[0];
      if (!userId) return;

      if (userId.startsWith('anon-')) {
        await AnonymousSession.findOneAndDelete({ anonymousId: userId });
        await Message.deleteMany({ sender: userId, isAnonymous: true });
      } else {
        await User.findByIdAndUpdate(userId, { online: false }, { new: true });
      }

      userSocketMap.delete(userId);
      io.emit('userStatus', { userId, status: 'offline' });

      const onlineUsers = await getOnlineUsers();
      io.emit('userListUpdate', onlineUsers);
      console.log('User disconnected:', socket.id);
    } catch (err) {
      console.error('Error in disconnect event:', err);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
