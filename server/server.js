require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const Message = require('./models/Message');
const AnonymousSession = require('./models/AnonymousSession');
const User = require('./models/User');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Validate environment variables
if (!process.env.MONGO_URI || !process.env.SESSION_SECRET || !process.env.JWT_SECRET) {
  console.error('[Server] Missing critical environment variables');
  process.exit(1);
}

// Ensure temp directory exists for Cloudinary uploads
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Session middleware configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

// Convert session middleware for Socket.IO
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

io.use(wrap(sessionMiddleware));

// Connect to MongoDB
connectDB().then(() => {
  console.log('[Server] MongoDB connected successfully');
}).catch((err) => {
  console.error('[Server] MongoDB connection failed:', err.message);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO Logic
const userSocketMap = new Map();
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Helper to add activity log
const addActivityLog = async (userId, action) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        activityLog: {
          $each: [{ action, timestamp: new Date() }],
          $slice: -5, // Keep last 5 activities
        },
      },
    });
  } catch (err) {
    console.error('[Activity Log] Error:', err.message);
  }
};

// Helper to get online users
const getOnlineUsers = async () => {
  try {
    const registeredUsers = await User.find({}).select('_id username online country gender age isAnonymous');
    const anonymousUsers = await AnonymousSession.find({}).select('anonymousId username status country state age');
    const users = [
      ...registeredUsers.map(user => ({
        id: user._id.toString(),
        username: user.username,
        isAnonymous: false,
        online: user.online,
        country: user.country,
        gender: user.gender,
        age: user.age,
      })),
      ...anonymousUsers.map(session => ({
        id: session.anonymousId,
        username: session.username,
        isAnonymous: true,
        online: session.status === 'online',
        country: session.country,
        gender: null,
        age: session.age,
      })),
    ].filter(user => user.id && user.username);
    console.log('[getOnlineUsers] Users sent:', users);
    return users;
  } catch (err) {
    console.error('[Server] getOnlineUsers error:', err.message);
    return [];
  }
};

// Helper to get previous messages
const getPreviousMessages = async (userId) => {
  try {
    return await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    }).sort({ createdAt: 1 }).lean();
  } catch (err) {
    console.error('[Server] getPreviousMessages error:', err.message);
    return [];
  }
};

// Periodic cleanup of inactive sessions
setInterval(async () => {
  try {
    const now = Date.now();
    const sessions = await sessionMiddleware.store.all();
    for (const session of sessions) {
      const sessionData = JSON.parse(session.session);
      if (sessionData.lastActive && now - sessionData.lastActive > INACTIVITY_TIMEOUT) {
        const userId = sessionData.passport?.user || sessionData.anonymousId;
        if (userId) {
          await handleUserDisconnect(userId);
          await sessionMiddleware.store.destroy(session.sid);
        }
      }
    }
  } catch (err) {
    console.error('[Server] Inactive session cleanup error:', err.message);
  }
}, CLEANUP_INTERVAL);

// Helper to handle user disconnection
const handleUserDisconnect = async (userId) => {
  try {
    if (userId.startsWith('anon-')) {
      await AnonymousSession.findOneAndDelete({ anonymousId: userId });
      await Message.deleteMany({ sender: userId, isAnonymous: true });
    } else {
      await User.findByIdAndUpdate(userId, { online: false, lastActive: new Date() });
    }
    userSocketMap.delete(userId);
    io.emit('userStatus', { userId, status: 'offline' });
    console.log(`[Socket.IO] User disconnected: ${userId}`);
  } catch (err) {
    console.error('[Socket.IO] Disconnect error:', err.message);
  }
};

io.on('connection', (socket) => {
  console.log(`[Socket.IO] User connected: ${socket.id}`);

  socket.on('join', async (userId) => {
    try {
      if (!userId) {
        return socket.emit('error', { msg: 'No user ID provided' });
      }

      socket.join(userId);
      userSocketMap.set(userId, socket.id);

      let userData;
      if (userId.startsWith('anon-')) {
        let session = await AnonymousSession.findOne({ anonymousId: userId });
        if (!session) {
          const username = socket.request.session.username || `Anon_${userId.slice(-4)}`;
          session = new AnonymousSession({ anonymousId: userId, username, status: 'online' });
          await session.save();
        } else {
          session.status = 'online';
          await session.save();
        }
        userData = {
          id: userId,
          username: session.username,
          isAnonymous: true,
          online: true,
          country: session.country,
          gender: null,
          age: session.age,
        };
        console.log(`[Socket.IO] Anonymous user joined: ${userId} (${userData.username})`);
      } else {
        const user = await User.findByIdAndUpdate(
          userId,
          { online: true, lastActive: new Date() },
          { new: true }
        ).populate('friends blockedUsers friendRequests', 'username');

        if (!user) {
          return socket.emit('error', { msg: 'User not found' });
        }

        userData = {
          id: user._id.toString(),
          username: user.username,
          isAnonymous: false,
          online: true,
          country: user.country,
          gender: user.gender,
          age: user.age,
        };

        socket.emit('blockedUsersUpdate', user.blockedUsers.map(u => u._id.toString()));
        socket.emit('friendsUpdate', user.friends.map(f => f._id.toString()));
        socket.emit('friendRequestsUpdate', user.friendRequests.map(r => r._id.toString()));
      }

      socket.request.session.lastActive = Date.now();
      socket.request.session.userId = userId;
      socket.request.session.save();

      socket.emit('userListUpdate', await getOnlineUsers());
      io.emit('userStatus', userData);
      socket.emit('loadPreviousMessages', await getPreviousMessages(userId));

      console.log(`[Socket.IO] User joined: ${userId} (${userData.username})`);
    } catch (err) {
      console.error('[Socket.IO] Join error:', err.message);
      socket.emit('error', { msg: 'Failed to join' });
    }
  });

  socket.on('sendMessage', async ({ sender, receiver, content, audioPath, type }) => {
    try {
      if (!sender || !receiver || (!content && !audioPath)) {
        return socket.emit('error', { msg: 'Missing message data' });
      }

      const senderId = sender.toString();
      const receiverId = receiver.toString();

      const senderExists = senderId.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: senderId })
        : await User.findById(senderId);
      const receiverExists = receiverId.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: receiverId })
        : await User.findById(receiverId);

      if (!senderExists || !receiverExists) {
        return socket.emit('error', { msg: 'User not found' });
      }

      const receiverUser = receiverId.startsWith('anon-') ? null : await User.findById(receiverId);
      if (receiverUser?.blockedUsers.includes(senderId)) {
        return socket.emit('error', { msg: 'You are blocked by this user' });
      }

      const message = new Message({
        sender: senderId,
        receiver: receiverId,
        content: type === 'text' ? content : undefined,
        audioPath: type === 'voice' ? audioPath : undefined,
        type,
        isAnonymous: senderId.startsWith('anon-'),
        deliveredAt: new Date(),
      });
      await message.save();

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      const messageData = {
        ...message.toObject(),
        sender: senderId,
        receiver: receiverId,
        _id: message._id.toString(),
      };

      io.to(senderId).emit('receiveMessage', messageData);
      io.to(receiverId).emit('receiveMessage', messageData);

      console.log(`[Socket.IO] Message sent from ${senderId} to ${receiverId}`);
    } catch (err) {
      console.error('[Socket.IO] SendMessage error:', err.message);
      socket.emit('error', { msg: 'Failed to send message' });
    }
  });

  socket.on('updateMessageStatus', async ({ messageId, userId, status, senderId }) => {
    try {
      if (messageId) {
        const message = await Message.findById(messageId);
        if (!message || message.receiver.toString() !== userId) {
          console.error('[Socket.IO] updateMessageStatus: Unauthorized or message not found:', messageId);
          return socket.emit('error', { msg: 'Unauthorized or message not found' });
        }

        if (status === 'delivered' && !message.deliveredAt) {
          message.deliveredAt = new Date();
        } else if (status === 'read' && !message.readAt) {
          message.readAt = new Date();
        }
        await message.save();

        const messageData = {
          ...message.toObject(),
          sender: message.sender.toString(),
          receiver: message.receiver.toString(),
          _id: message._id.toString(),
        };

        io.to(message.sender.toString()).emit('messageStatusUpdate', messageData);
        io.to(message.receiver.toString()).emit('messageStatusUpdate', messageData);
      } else if (senderId && status === 'read') {
        const messages = await Message.find({
          sender: senderId,
          receiver: userId,
          readAt: null,
        });

        for (const message of messages) {
          message.readAt = new Date();
          await message.save();
          const messageData = {
            ...message.toObject(),
            sender: message.sender.toString(),
            receiver: message.receiver.toString(),
            _id: message._id.toString(),
          };
          io.to(message.sender.toString()).emit('messageStatusUpdate', messageData);
          io.to(message.receiver.toString()).emit('messageStatusUpdate', messageData);
        }
      }
    } catch (err) {
      console.error('[Socket.IO] UpdateMessageStatus error:', err.message);
      socket.emit('error', { msg: 'Failed to update message status' });
    }
  });

  socket.on('editMessage', async ({ messageId, content, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.sender.toString() !== userId) {
        return socket.emit('error', { msg: 'Unauthorized or message not found' });
      }

      message.content = content;
      message.edited = true;
      await message.save();

      const messageData = {
        ...message.toObject(),
        sender: message.sender.toString(),
        receiver: message.receiver.toString(),
        _id: message._id.toString(),
      };

      io.to(message.sender.toString()).emit('messageEdited', messageData);
      io.to(message.receiver.toString()).emit('messageEdited', messageData);
    } catch (err) {
      console.error('[Socket.IO] EditMessage error:', err.message);
      socket.emit('error', { msg: 'Failed to edit message' });
    }
  });

  socket.on('deleteMessage', async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.sender.toString() !== userId) {
        return socket.emit('error', { msg: 'Unauthorized or message not found' });
      }

      await Message.deleteOne({ _id: messageId });

      io.to(message.sender.toString()).emit('messageDeleted', messageId);
      io.to(message.receiver.toString()).emit('messageDeleted', messageId);
    } catch (err) {
      console.error('[Socket.IO] DeleteMessage error:', err.message);
      socket.emit('error', { msg: 'Failed to delete message' });
    }
  });

  socket.on('addReaction', async ({ messageId, emoji, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || ![message.sender.toString(), message.receiver.toString()].includes(userId)) {
        return socket.emit('error', { msg: 'Unauthorized or message not found' });
      }

      message.reactions.set(emoji, (message.reactions.get(emoji) || 0) + 1);
      await message.save();

      const reactionData = {
        messageId,
        reactions: Object.fromEntries(message.reactions),
      };

      io.to(message.sender.toString()).emit('reactionUpdate', reactionData);
      io.to(message.receiver.toString()).emit('reactionUpdate', reactionData);
    } catch (err) {
      console.error('[Socket.IO] AddReaction error:', err.message);
      socket.emit('error', { msg: 'Failed to add reaction' });
    }
  });

  socket.on('typing', ({ sender, receiver, username }) => {
    io.to(receiver).emit('userTyping', { sender, username });
  });

  socket.on('stopTyping', ({ sender, receiver }) => {
    io.to(receiver).emit('userStoppedTyping', { sender });
  });

  socket.on('voice-call-offer', async ({ receiverId, offer, senderId }) => {
    try {
      const receiverExists = receiverId.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: receiverId })
        : await User.findById(receiverId);
      if (!receiverExists) {
        return socket.emit('error', { msg: 'Receiver not found' });
      }

      const senderExists = senderId.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: senderId })
        : await User.findById(senderId);
      if (!senderExists) {
        return socket.emit('error', { msg: 'Sender not found' });
      }

      io.to(receiverId).emit('voice-call-offer', { offer, from: senderId });
      console.log(`[Socket.IO] Voice call offer sent from ${senderId} to ${receiverId}`);
    } catch (err) {
      console.error('[Socket.IO] Voice-call-offer error:', err.message);
      socket.emit('error', { msg: 'Failed to send call offer' });
    }
  });

  socket.on('voice-call-answer', async ({ receiverId, answer, senderId }) => {
    try {
      const receiverExists = receiverId.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: receiverId })
        : await User.findById(receiverId);
      if (!receiverExists) {
        return socket.emit('error', { msg: 'Receiver not found' });
      }

      io.to(receiverId).emit('voice-call-answer', { answer, from: senderId });
      console.log(`[Socket.IO] Voice call answer sent from ${senderId} to ${receiverId}`);
    } catch (err) {
      console.error('[Socket.IO] Voice-call-answer error:', err.message);
      socket.emit('error', { msg: 'Failed to send call answer' });
    }
  });

  socket.on('ice-candidate', async ({ receiverId, candidate }) => {
    try {
      const receiverExists = receiverId.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: receiverId })
        : await User.findById(receiverId);
      if (!receiverExists) {
        return socket.emit('error', { msg: 'Receiver not found' });
      }

      io.to(receiverId).emit('ice-candidate', { candidate });
      console.log(`[Socket.IO] ICE candidate sent to ${receiverId}`);
    } catch (err) {
      console.error('[Socket.IO] ICE-candidate error:', err.message);
      socket.emit('error', { msg: 'Failed to send ICE candidate' });
    }
  });

  socket.on('end-call', async ({ receiverId, senderId }) => {
    try {
      const receiverExists = receiverId.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: receiverId })
        : await User.findById(receiverId);
      if (!receiverExists) {
        return socket.emit('error', { msg: 'Receiver not found' });
      }

      io.to(receiverId).emit('end-call', { from: senderId });
      console.log(`[Socket.IO] End call signal sent from ${senderId} to ${receiverId}`);
    } catch (err) {
      console.error('[Socket.IO] End-call error:', err.message);
      socket.emit('error', { msg: 'Failed to end call' });
    }
  });

  socket.on('callStatusUpdate', async ({ status, from, receiverId }) => {
    try {
      const receiverExists = receiverId.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: receiverId })
        : await User.findById(receiverId);
      if (!receiverExists) {
        return socket.emit('error', { msg: 'Receiver not found' });
      }

      io.to(receiverId).emit('callStatusUpdate', { status, from });
      console.log(`[Socket.IO] Call status update (${status}) sent from ${from} to ${receiverId}`);
    } catch (err) {
      console.error('[Socket.IO] CallStatusUpdate error:', err.message);
      socket.emit('error', { msg: 'Failed to update call status' });
    }
  });

  socket.on('blockUser', async ({ userId, targetId }) => {
    try {
      if (userId.startsWith('anon-')) {
        return socket.emit('error', { msg: 'Anonymous users cannot block others' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return socket.emit('error', { msg: 'User not found' });
      }

      if (!user.blockedUsers.includes(targetId)) {
        user.blockedUsers.push(targetId);
        await user.save();
        await addActivityLog(userId, `Blocked user ${targetId}`);
      }

      socket.emit('blockedUsersUpdate', user.blockedUsers.map(u => u.toString()));
      console.log(`[Socket.IO] User ${userId} blocked ${targetId}`);
    } catch (err) {
      console.error('[Socket.IO] BlockUser error:', err.message);
      socket.emit('error', { msg: 'Failed to block user' });
    }
  });

  socket.on('unblockUser', async ({ userId, targetId }) => {
    try {
      if (userId.startsWith('anon-')) {
        return socket.emit('error', { msg: 'Anonymous users cannot unblock others' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return socket.emit('error', { msg: 'User not found' });
      }

      user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetId);
      await user.save();
      await addActivityLog(userId, `Unblocked user ${targetId}`);

      socket.emit('blockedUsersUpdate', user.blockedUsers.map(u => u.toString()));
      console.log(`[Socket.IO] User ${userId} unblocked ${targetId}`);
    } catch (err) {
      console.error('[Socket.IO] UnblockUser error:', err.message);
      socket.emit('error', { msg: 'Failed to unblock user' });
    }
  });

  socket.on('sendFriendRequest', async ({ userId, friendId }) => {
    try {
      if (userId.startsWith('anon-')) {
        return socket.emit('error', { msg: 'Anonymous users cannot send friend requests' });
      }

      const user = await User.findById(userId);
      const friend = await User.findById(friendId);

      if (!user || !friend) {
        return socket.emit('error', { msg: 'User or friend not found' });
      }

      if (user.friends.includes(friendId) || friend.friendRequests.includes(userId)) {
        return socket.emit('error', { msg: 'Friend request already sent or user is already a friend' });
      }

      friend.friendRequests.push(userId);
      await friend.save();
      await addActivityLog(userId, `Sent friend request to ${friendId}`);

      io.to(friendId).emit('friendRequestsUpdate', friend.friendRequests.map(r => r.toString()));
      console.log(`[Socket.IO] Friend request sent from ${userId} to ${friendId}`);
    } catch (err) {
      console.error('[Socket.IO] SendFriendRequest error:', err.message);
      socket.emit('error', { msg: 'Failed to send friend request' });
    }
  });

  socket.on('unfriend', async ({ userId, friendId }) => {
    try {
      if (userId.startsWith('anon-')) {
        return socket.emit('error', { msg: 'Anonymous users cannot unfriend others' });
      }

      const user = await User.findById(userId);
      const friend = await User.findById(friendId);

      if (!user || !friend) {
        return socket.emit('error', { msg: 'User or friend not found' });
      }

      user.friends = user.friends.filter(id => id.toString() !== friendId);
      friend.friends = friend.friends.filter(id => id.toString() !== userId);
      await user.save();
      await friend.save();
      await addActivityLog(userId, `Unfriended ${friendId}`);

      socket.emit('friendsUpdate', user.friends.map(f => f.toString()));
      io.to(friendId).emit('friendsUpdate', friend.friends.map(f => f.toString()));
      console.log(`[Socket.IO] User ${userId} unfriended ${friendId}`);
    } catch (err) {
      console.error('[Socket.IO] Unfriend error:', err.message);
      socket.emit('error', { msg: 'Failed to unfriend' });
    }
  });

  socket.on('reportUser', async ({ userId, targetId }) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return socket.emit('error', { msg: 'User not found' });
      }

      await addActivityLog(userId, `Reported user ${targetId}`);
      console.log(`[Socket.IO] User ${userId} reported ${targetId}`);
    } catch (err) {
      console.error('[Socket.IO] ReportUser error:', err.message);
      socket.emit('error', { msg: 'Failed to report user' });
    }
  });

  socket.on('clearChatHistory', async ({ userId, targetId }) => {
    try {
      await Message.deleteMany({
        $or: [
          { sender: userId, receiver: targetId },
          { sender: targetId, receiver: userId },
        ],
      });

      socket.emit('loadPreviousMessages', []);
      await addActivityLog(userId, `Cleared chat history with ${targetId}`);
      console.log(`[Socket.IO] Chat history cleared between ${userId} and ${targetId}`);
    } catch (err) {
      console.error('[Socket.IO] ClearChatHistory error:', err.message);
      socket.emit('error', { msg: 'Failed to clear chat history' });
    }
  });

  socket.on('logout', async (userId) => {
    try {
      await handleUserDisconnect(userId);
      socket.request.session.destroy();
      console.log(`[Socket.IO] User logged out: ${userId}`);
    } catch (err) {
      console.error('[Socket.IO] Logout error:', err.message);
      socket.emit('error', { msg: 'Failed to logout' });
    }
  });

  socket.on('getFriends', async (userId) => {
    try {
      if (userId.startsWith('anon-')) {
        return socket.emit('friendsUpdate', []);
      }

      const user = await User.findById(userId).populate('friends', '_id username');
      if (!user) {
        return socket.emit('error', { msg: 'User not found' });
      }

      socket.emit('friendsUpdate', user.friends.map(f => f._id.toString()));
      console.log(`[Socket.IO] Friends list sent to ${userId}`);
    } catch (err) {
      console.error('[Socket.IO] GetFriends error:', err.message);
      socket.emit('error', { msg: 'Failed to fetch friends' });
    }
  });

  socket.on('disconnect', async () => {
    const userId = socket.request.session.userId;
    if (userId) {
      await handleUserDisconnect(userId);
    }
    console.log(`[Socket.IO] Socket disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});

// Error handling for server
server.on('error', (err) => {
  console.error('[Server] Server error:', err.message);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err.message);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});
