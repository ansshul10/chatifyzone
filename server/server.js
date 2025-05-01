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
const Message = require('./models/Message');
const AnonymousSession = require('./models/AnonymousSession');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Validate environment variables
if (!process.env.MONGO_URI || !process.env.SESSION_SECRET || !process.env.JWT_SECRET) {
  console.error('[Server] Missing critical environment variables');
  process.exit(1);
}

// Session middleware configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
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

// Socket.IO Logic
const userSocketMap = new Map();
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = 10 * 60 * 1000;

// Helper to add activity log
const addActivityLog = async (userId, action) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        activityLog: {
          $each: [{ action, timestamp: new Date() }],
          $slice: -5,
        },
      },
    });
  } catch (err) {
    console.error('[Activity Log] Error:', err.message);
  }
};

const getOnlineUsers = async () => {
  try {
    const registeredUsers = await User.find({}).select('_id username online country gender age isAnonymous');
    const anonymousUsers = await AnonymousSession.find({}).select('anonymousId username status');
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
        country: null,
        gender: null,
        age: null,
      })),
    ].filter(user => user.id && user.username);
    return users;
  } catch (err) {
    console.error('[Server] getOnlineUsers error:', err.message);
    return [];
  }
};

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
          country: null,
          gender: null,
          age: null,
        };
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

        socket.emit('blockedUsersUpdate', user.blockedUsers.map(u => ({ _id: u._id.toString(), username: u.username })));
        socket.emit('friendsUpdate', user.friends.map(f => ({ _id: f._id.toString(), username: f.username })));
        socket.emit('friendRequestsUpdate', user.friendRequests.map(r => ({ _id: r._id.toString(), username: r.username })));
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

  socket.on('sendMessage', async ({ sender, receiver, content }) => {
    try {
      if (!sender || !receiver || !content) {
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

      if (senderId.startsWith('anon-') && !receiverId.startsWith('anon-')) {
        return socket.emit('error', { msg: 'Anonymous users cannot message registered users' });
      }

      const receiverUser = receiverId.startsWith('anon-') ? null : await User.findById(receiverId);
      if (receiverUser?.blockedUsers.includes(senderId)) {
        return socket.emit('error', { msg: 'You are blocked by this user' });
      }

      const message = new Message({
        sender: senderId,
        receiver: receiverId,
        content,
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
      console.log('[Socket.IO] updateMessageStatus: Received:', { messageId, userId, status, senderId });
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

        console.log('[Socket.IO] updateMessageStatus: Emitting messageStatusUpdate for single message:', messageData);
        io.to(message.sender.toString()).emit('messageStatusUpdate', messageData);
        io.to(message.receiver.toString()).emit('messageStatusUpdate', messageData);
      } else if (senderId && status === 'read') {
        const messages = await Message.find({
          sender: senderId,
          receiver: userId,
          readAt: null,
        });

        console.log('[Socket.IO] updateMessageStatus: Found', messages.length, 'unread messages to mark as read');
        for (const message of messages) {
          message.readAt = new Date();
          await message.save();
          const messageData = {
            ...message.toObject(),
            sender: message.sender.toString(),
            receiver: message.receiver.toString(),
            _id: message._id.toString(),
          };
          console.log('[Socket.IO] updateMessageStatus: Emitting messageStatusUpdate for message:', messageData._id);
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

  socket.on('clearChatHistory', async ({ userId, targetId }) => {
    try {
      await Message.deleteMany({
        $or: [
          { sender: userId, receiver: targetId },
          { sender: targetId, receiver: userId },
        ],
      });

      socket.emit('actionResponse', {
        type: 'clearChatHistory',
        success: true,
        msg: 'Chat history cleared successfully',
      });

      if (!userId.startsWith('anon-')) {
        await addActivityLog(userId, `Cleared chat history with user ID: ${targetId}`);
      }
    } catch (err) {
      console.error('[Socket.IO] ClearChatHistory error:', err.message);
      socket.emit('error', { msg: 'Failed to clear chat history' });
    }
  });

  socket.on('blockUser', async ({ userId, targetId }) => {
    try {
      const user = await User.findById(userId);
      if (!user || user.blockedUsers.includes(targetId)) {
        return socket.emit('error', { msg: 'User not found or already blocked' });
      }

      user.blockedUsers.push(targetId);
      user.friends = user.friends.filter(friend => friend.toString() !== targetId);
      await user.save();

      await User.findByIdAndUpdate(targetId, { $pull: { friends: userId } });

      socket.emit('blockedUsersUpdate', user.blockedUsers.map(u => ({ _id: u._id.toString(), username: u.username })));
      socket.emit('friendsUpdate', user.friends.map(f => ({ _id: f._id.toString(), username: f.username })));
      io.to(targetId).emit('friendRemoved', { friendId: userId });
      socket.emit('actionResponse', { type: 'block', success: true, msg: 'User blocked successfully' });

      await addActivityLog(userId, `Blocked user ID: ${targetId}`);
    } catch (err) {
      console.error('[Socket.IO] BlockUser error:', err.message);
      socket.emit('error', { msg: 'Failed to block user' });
    }
  });

  socket.on('unblockUser', async ({ userId, targetId }) => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.blockedUsers.includes(targetId)) {
        return socket.emit('error', { msg: 'User not found or not blocked' });
      }

      user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetId);
      await user.save();

      socket.emit('blockedUsersUpdate', user.blockedUsers.map(u => ({ _id: u._id.toString(), username: u.username })));
      socket.emit('actionResponse', { type: 'unblock', success: true, msg: 'User unblocked successfully' });

      await addActivityLog(userId, `Unblocked user ID: ${targetId}`);
    } catch (err) {
      console.error('[Socket.IO] UnblockUser error:', err.message);
      socket.emit('error', { msg: 'Failed to unblock user' });
    }
  });

  socket.on('sendFriendRequest', async ({ userId, friendId }) => {
    try {
      const sender = await User.findById(userId);
      const receiver = await User.findById(friendId);
      if (!sender || !receiver) {
        return socket.emit('error', { msg: 'User not found' });
      }

      if (receiver.friendRequests.includes(userId) || receiver.friends.includes(userId)) {
        return socket.emit('error', { msg: 'Friend request already sent or already friends' });
      }

      if (receiver.blockedUsers.includes(userId)) {
        return socket.emit('error', { msg: 'You are blocked by this user' });
      }

      if (!receiver.privacy?.allowFriendRequests) {
        return socket.emit('error', { msg: 'This user is not accepting friend requests' });
      }

      receiver.friendRequests.push(userId);
      await receiver.save();

      socket.emit('actionResponse', { type: 'sendFriendRequest', success: true, msg: 'Friend request sent' });
      io.to(friendId).emit('friendRequestReceived', { _id: userId, username: sender.username });

      await addActivityLog(userId, `Sent friend request to user ID: ${friendId}`);
    } catch (err) {
      console.error('[Socket.IO] SendFriendRequest error:', err.message);
      socket.emit('error', { msg: 'Failed to send friend request' });
    }
  });

  socket.on('acceptFriendRequest', async ({ userId, friendId }) => {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { friendRequests: friendId }, $push: { friends: friendId } },
        { new: true }
      ).populate('friends friendRequests', 'username');

      const friend = await User.findByIdAndUpdate(
        friendId,
        { $push: { friends: userId } },
        { new: true }
      ).populate('friends', 'username');

      if (!user || !friend) {
        return socket.emit('error', { msg: 'User not found' });
      }

      socket.emit('friendRequestsUpdate', user.friendRequests.map(r => ({ _id: r._id.toString(), username: r.username })));
      socket.emit('friendsUpdate', user.friends.map(f => ({ _id: f._id.toString(), username: f.username })));
      io.to(friendId).emit('friendsUpdate', friend.friends.map(f => ({ _id: f._id.toString(), username: f.username })));
      socket.emit('actionResponse', { type: 'acceptFriendRequest', success: true, msg: 'Friend request accepted' });

      await addActivityLog(userId, `Accepted friend request from user ID: ${friendId}`);
      await addActivityLog(friendId, `Friend request accepted by user ID: ${userId}`);
    } catch (err) {
      console.error('[Socket.IO] AcceptFriendRequest error:', err.message);
      socket.emit('error', { msg: 'Failed to accept friend request' });
    }
  });

  socket.on('declineFriendRequest', async ({ userId, friendId }) => {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { friendRequests: friendId } },
        { new: true }
      ).populate('friendRequests', 'username');

      if (!user) {
        return socket.emit('error', { msg: 'User not found' });
      }

      socket.emit('friendRequestsUpdate', user.friendRequests.map(r => ({ _id: r._id.toString(), username: r.username })));
      socket.emit('actionResponse', { type: 'declineFriendRequest', success: true, msg: 'Friend request declined' });

      await addActivityLog(userId, `Declined friend request from user ID: ${friendId}`);
    } catch (err) {
      console.error('[Socket.IO] DeclineFriendRequest error:', err.message);
      socket.emit('error', { msg: 'Failed to decline friend request' });
    }
  });

  socket.on('unfriend', async ({ userId, friendId }) => {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { friends: friendId } },
        { new: true }
      ).populate('friends', 'username');

      const friend = await User.findByIdAndUpdate(
        friendId,
        { $pull: { friends: userId } },
        { new: true }
      ).populate('friends', 'username');

      if (!user || !friend) {
        return socket.emit('error', { msg: 'User not found' });
      }

      socket.emit('friendsUpdate', user.friends.map(f => ({ _id: f._id.toString(), username: f.username })));
      io.to(friendId).emit('friendsUpdate', friend.friends.map(f => ({ _id: f._id.toString(), username: f.username })));
      socket.emit('actionResponse', { type: 'unfriend', success: true, msg: 'Unfriended successfully' });

      await addActivityLog(userId, `Unfriended user ID: ${friendId}`);
      await addActivityLog(friendId, `Unfriended by user ID: ${userId}`);
    } catch (err) {
      console.error('[Socket.IO] Unfriend error:', err.message);
      socket.emit('error', { msg: 'Failed to unfriend' });
    }
  });

  socket.on('reportUser', async ({ userId, targetId }) => {
    try {
      socket.emit('actionResponse', { type: 'report', success: true, msg: 'User reported successfully' });

      await addActivityLog(userId, `Reported user ID: ${targetId}`);
    } catch (err) {
      console.error('[Socket.IO] ReportUser error:', err.message);
      socket.emit('error', { msg: 'Failed to report user' });
    }
  });

  socket.on('logout', async (userId) => {
    await handleUserDisconnect(userId);
    socket.disconnect();
  });

  socket.on('disconnect', async () => {
    const userId = [...userSocketMap.entries()].find(([_, sid]) => sid === socket.id)?.[0];
    if (userId) {
      await handleUserDisconnect(userId);
    }
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(`[Server Error] ${req.method} ${req.url}:`, err.message);
  res.status(500).json({ msg: 'Server error' });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] Server running on port ${PORT}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Closing server...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('[Server] MongoDB connection closed.');
      process.exit(0);
    });
  });
});
