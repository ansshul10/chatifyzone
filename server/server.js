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
  console.warn('[Server] Warning: Missing environment variables (MONGO_URI, SESSION_SECRET, JWT_SECRET).');
}

// Session middleware configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/chatify',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
  },
});

// Update session with lastActive timestamp
app.use((req, res, next) => {
  if (req.session) {
    req.session.lastActive = Date.now();
  }
  next();
});

// Apply session middleware to Express
app.use(sessionMiddleware);

// Convert session middleware for Socket.IO
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Apply session middleware to Socket.IO
io.use(wrap(sessionMiddleware));

// Connect to MongoDB
connectDB().then(() => {
  console.log('[Server] MongoDB connected successfully');
}).catch((err) => {
  console.error('[Server] MongoDB connection failed:', err.message);
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Socket.IO Logic
const userSocketMap = new Map();
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

const getOnlineUsers = async () => {
  try {
    const registeredUsers = await User.find({}).select('_id username online country gender age isAnonymous');
    const anonymousUsers = await AnonymousSession.find({}).select('anonymousId username status');
    const users = [
      ...registeredUsers.map((user) => ({
        id: user._id.toString(),
        username: user.username || `User_${user._id.toString().slice(-4)}`,
        isAnonymous: user.isAnonymous || false,
        online: user.online || false,
        country: user.country || null,
        gender: user.gender || null,
        age: user.age || null,
      })),
      ...anonymousUsers.map((session) => ({
        id: session.anonymousId,
        username: session.username || `Anon_${session.anonymousId.slice(-4)}`,
        isAnonymous: true,
        online: session.status === 'online',
        country: null,
        gender: null,
        age: null,
      })),
    ].filter((user) => user.id && user.username);
    console.log('[Server] getOnlineUsers fetched:', users.length, 'users');
    return users;
  } catch (err) {
    console.error('[Server] getOnlineUsers error:', err.message);
    return [];
  }
};

const getPreviousMessages = async (userId) => {
  try {
    return await Message.find({ $or: [{ sender: userId }, { receiver: userId }] }).sort({ createdAt: 1 });
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
          if (userId.startsWith('anon-')) {
            await AnonymousSession.findOneAndDelete({ anonymousId: userId });
            await Message.deleteMany({ sender: userId, isAnonymous: true });
          } else {
            await User.findByIdAndUpdate(userId, { online: false, lastActive: new Date() }, { new: true });
          }
          const socketId = userSocketMap.get(userId);
          if (socketId) {
            io.to(socketId).emit('logout', { reason: 'Inactivity timeout' });
            userSocketMap.delete(userId);
          }
          await sessionMiddleware.store.destroy(session.sid);
          io.emit('userStatus', { userId, status: 'offline' });
          console.log(`[Server] Logged out inactive user: ${userId}`);
        }
      }
    }
  } catch (err) {
    console.error('[Server] Inactive session cleanup error:', err.message);
  }
}, CLEANUP_INTERVAL);

io.on('connection', (socket) => {
  console.log(`[Socket.IO] User connected: ${socket.id}`);

  socket.on('join', async (userId) => {
    try {
      if (!userId) {
        socket.emit('error', { msg: 'No user ID provided' });
        return;
      }
      socket.join(userId);
      userSocketMap.set(userId, socket.id);

      let username = socket.request.session.username || socket.handshake.query.username;
      let userData = {};
      if (userId.startsWith('anon-')) {
        let session = await AnonymousSession.findOne({ anonymousId: userId });
        if (!session) {
          username = username || `Anon_${userId.slice(-4)}`;
          session = new AnonymousSession({ anonymousId: userId, username, status: 'online' });
          await session.save();
        } else {
          username = session.username;
          session.status = 'online';
          await session.save();
        }
        userData = { id: userId, username, isAnonymous: true, online: true, country: null, gender: null, age: null };
      } else {
        const user = await User.findByIdAndUpdate(
          userId,
          { online: true, lastActive: new Date() },
          { new: true }
        )
          .populate('friends', 'username online')
          .populate('friendRequests', 'username')
          .populate('blockedUsers', 'username');
        if (!user) {
          socket.emit('error', { msg: 'User not found' });
          return;
        }
        username = user.username || `User_${userId.slice(-4)}`;
        userData = {
          id: user._id.toString(),
          username,
          isAnonymous: user.isAnonymous || false,
          online: true,
          country: user.country || null,
          gender: user.gender || null,
          age: user.age || null,
        };
        socket.emit('blockedUsersUpdate', user.blockedUsers.map(u => ({ _id: u._id.toString(), username: u.username })));
        socket.emit('friendsUpdate', user.friends.map(f => ({ _id: f._id.toString(), username: f.username })));
        socket.emit('friendRequestsUpdate', user.friendRequests.map(r => ({ _id: r._id.toString(), username: r.username })));
      }

      socket.request.session.lastActive = Date.now();
      socket.request.session.username = username;
      socket.request.session.save();

      // Send full user list to the joining user
      socket.emit('userListUpdate', await getOnlineUsers());
      // Notify others of status
      io.emit('userStatus', userData);

      const previousMessages = await getPreviousMessages(userId);
      socket.emit('loadPreviousMessages', previousMessages);

      console.log(`[Socket.IO Join] User joined: ${userId} (${username})`);
    } catch (err) {
      console.error('[Socket.IO Join] Error:', err.message);
      socket.emit('error', { msg: 'Failed to join' });
    }
  });

  socket.on('refresh', async (userId) => {
    try {
      if (!userId) {
        socket.emit('error', { msg: 'No user ID provided' });
        return;
      }
      socket.emit('userListUpdate', await getOnlineUsers());
      console.log(`[Socket.IO Refresh] User list sent to: ${userId}`);
    } catch (err) {
      console.error('[Socket.IO Refresh] Error:', err.message);
      socket.emit('error', { msg: 'Failed to refresh user list' });
    }
  });

  socket.on('updateProfile', async ({ userId, updates }) => {
    try {
      if (!userId) {
        socket.emit('error', { msg: 'No user ID provided' });
        return;
      }
      const allowedFields = ['username', 'country', 'gender', 'age', 'bio', 'status'];
      const filteredUpdates = {};
      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }
      if (Object.keys(filteredUpdates).length === 0) {
        socket.emit('error', { msg: 'No valid fields to update' });
        return;
      }
      const user = await User.findByIdAndUpdate(userId, filteredUpdates, { new: true });
      if (!user) {
        socket.emit('error', { msg: 'User not found' });
        return;
      }
      socket.request.session.lastActive = Date.now();
      socket.request.session.save();
      const userData = {
        id: user._id.toString(),
        username: user.username,
        isAnonymous: user.isAnonymous || false,
        online: user.online || false,
        country: user.country || null,
        gender: user.gender || null,
        age: user.age || null,
      };
      io.emit('userStatus', userData);
      socket.emit('actionResponse', { type: 'updateProfile', success: true, msg: 'Profile updated successfully' });
      console.log(`[Socket.IO UpdateProfile] Profile updated for user: ${userId}`);
    } catch (err) {
      console.error('[Socket.IO UpdateProfile] Error:', err.message);
      socket.emit('error', { msg: 'Failed to update profile' });
    }
  });

  socket.on('sendMessage', async ({ sender, receiver, content }) => {
    try {
      if (!sender || !receiver || !content) {
        socket.emit('error', { msg: 'Missing message data' });
        return;
      }

      const senderExists = sender.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: sender })
        : await User.findById(sender);
      const receiverExists = receiver.startsWith('anon-')
        ? await AnonymousSession.findOne({ anonymousId: receiver })
        : await User.findById(receiver);

      if (!senderExists || !receiverExists) {
        socket.emit('error', { msg: 'User not found' });
        return;
      }

      if (sender.startsWith('anon-') && !receiver.startsWith('anon-')) {
        socket.emit('error', { msg: 'Anonymous users cannot message registered users' });
        return;
      }

      if (!sender.startsWith('anon-')) {
        const receiverUser = await User.findById(receiver);
        if (receiverUser && receiverUser.blockedUsers.includes(sender)) {
          socket.emit('error', { msg: 'You are blocked by this user' });
          return;
        }
      }

      const message = new Message({
        sender,
        receiver,
        content,
        isAnonymous: sender.startsWith('anon-'),
        deliveredAt: new Date(),
      });
      await message.save();

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      io.to(sender).emit('receiveMessage', message);
      io.to(receiver).emit('receiveMessage', message);
      io.to(receiver).emit('notification', {
        senderId: sender,
        text: `New message from ${senderExists.username || 'Anonymous'}`,
      });

      console.log(`[Socket.IO SendMessage] Message sent from ${sender} to ${receiver}`);
    } catch (err) {
      console.error('[Socket.IO SendMessage] Error:', err.message);
      socket.emit('error', { msg: 'Failed to send message' });
    }
  });

  socket.on('typing', ({ sender, receiver }) => {
    try {
      io.to(receiver).emit('userTyping', { sender });
      socket.request.session.lastActive = Date.now();
      socket.request.session.save();
      console.log(`[Socket.IO Typing] ${sender} is typing to ${receiver}`);
    } catch (err) {
      console.error('[Socket.IO Typing] Error:', err.message);
      socket.emit('error', { msg: 'Failed to send typing status' });
    }
  });

  socket.on('stopTyping', ({ sender, receiver }) => {
    try {
      io.to(receiver).emit('userStoppedTyping', { sender });
      socket.request.session.lastActive = Date.now();
      socket.request.session.save();
      console.log(`[Socket.IO StopTyping] ${sender} stopped typing to ${receiver}`);
    } catch (err) {
      console.error('[Socket.IO StopTyping] Error:', err.message);
      socket.emit('error', { msg: 'Failed to send stop typing status' });
    }
  });

  socket.on('updateMessageStatus', async ({ messageId, userId, status }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { msg: 'Message not found' });
        return;
      }
      if (message.receiver.toString() !== userId) {
        socket.emit('error', { msg: 'Unauthorized' });
        return;
      }

      if (status === 'delivered' && !message.deliveredAt) {
        message.deliveredAt = new Date();
      } else if (status === 'read' && !message.readAt) {
        message.readAt = new Date();
      }
      await message.save();

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      io.to(message.sender).emit('messageStatusUpdate', message);
      io.to(message.receiver).emit('messageStatusUpdate', message);
      console.log(`[Socket.IO UpdateMessageStatus] Updated status for message ${messageId} to ${status}`);
    } catch (err) {
      console.error('[Socket.IO UpdateMessageStatus] Error:', err.message);
      socket.emit('error', { msg: 'Failed to update message status' });
    }
  });

  socket.on('editMessage', async ({ messageId, content, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { msg: 'Message not found' });
        return;
      }
      if (message.sender.toString() !== userId) {
        socket.emit('error', { msg: 'Only the sender can edit the message' });
        return;
      }

      message.content = content;
      message.edited = true;
      await message.save();

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      io.to(message.sender).emit('messageEdited', message);
      io.to(message.receiver).emit('messageEdited', message);
      console.log(`[Socket.IO EditMessage] Message ${messageId} edited by ${userId}`);
    } catch (err) {
      console.error('[Socket.IO EditMessage] Error:', err.message);
      socket.emit('error', { msg: 'Failed to edit message' });
    }
  });

  socket.on('deleteMessage', async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { msg: 'Message not found' });
        return;
      }
      if (message.sender.toString() !== userId) {
        socket.emit('error', { msg: 'Only the sender can delete the message' });
        return;
      }

      await Message.deleteOne({ _id: messageId });

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      io.to(message.sender).emit('messageDeleted', messageId);
      io.to(message.receiver).emit('messageDeleted', messageId);
      console.log(`[Socket.IO DeleteMessage] Message ${messageId} deleted by ${userId}`);
    } catch (err) {
      console.error('[Socket.IO DeleteMessage] Error:', err.message);
      socket.emit('error', { msg: 'Failed to delete message' });
    }
  });

  socket.on('addReaction', async ({ messageId, emoji, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { msg: 'Message not found' });
        return;
      }
      if (![message.sender.toString(), message.receiver.toString()].includes(userId)) {
        socket.emit('error', { msg: 'Unauthorized' });
        return;
      }

      message.reactions = message.reactions || new Map();
      const currentCount = message.reactions.get(emoji) || 0;
      message.reactions.set(emoji, currentCount + 1);
      await message.save();

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      io.to(message.sender).emit('reactionUpdate', { messageId, reactions: Object.fromEntries(message.reactions) });
      io.to(message.receiver).emit('reactionUpdate', { messageId, reactions: Object.fromEntries(message.reactions) });
      console.log(`[Socket.IO AddReaction] Reaction added to message ${messageId} by ${userId}`);
    } catch (err) {
      console.error('[Socket.IO AddReaction] Error:', err.message);
      socket.emit('error', { msg: 'Failed to add reaction' });
    }
  });

  socket.on('blockUser', async ({ userId, targetId }) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        socket.emit('error', { msg: 'User not found' });
        return;
      }
      if (user.blockedUsers.includes(targetId)) {
        socket.emit('error', { msg: 'User already blocked' });
        return;
      }

      user.blockedUsers.push(targetId);
      user.friends = user.friends.filter((friend) => friend.toString() !== targetId);
      await user.save();

      await User.findByIdAndUpdate(targetId, { $pull: { friends: userId } });

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      socket.emit('blockedUsersUpdate', user.blockedUsers.map(id => id.toString()));
      socket.emit('friendsUpdate', user.friends);
      io.to(targetId).emit('friendRemoved', { friendId: userId });
      socket.emit('actionResponse', { type: 'block', success: true, msg: 'User blocked successfully', targetId });

      io.emit('userStatus', { userId, status: 'blocked', targetId });
      console.log(`[Socket.IO BlockUser] User ${targetId} blocked by ${userId}`);
    } catch (err) {
      console.error('[Socket.IO BlockUser] Error:', err.message);
      socket.emit('error', { msg: 'Failed to block user' });
    }
  });

  socket.on('unblockUser', async ({ userId, targetId }) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        socket.emit('error', { msg: 'User not found' });
        return;
      }
      if (!user.blockedUsers.includes(targetId)) {
        socket.emit('error', { msg: 'User not blocked' });
        return;
      }

      user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== targetId);
      await user.save();

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      socket.emit('blockedUsersUpdate', user.blockedUsers.map(id => id.toString()));
      socket.emit('actionResponse', { type: 'unblock', success: true, msg: 'User unblocked successfully', targetId });

      io.emit('userStatus', { userId, status: 'online', targetId });
      console.log(`[Socket.IO UnblockUser] User ${targetId} unblocked by ${userId}`);
    } catch (err) {
      console.error('[Socket.IO UnblockUser] Error:', err.message);
      socket.emit('error', { msg: 'Failed to unblock user' });
    }
  });

  socket.on('sendFriendRequest', async ({ userId, friendId }) => {
    try {
      const sender = await User.findById(userId);
      const receiver = await User.findById(friendId);
      if (!sender || !receiver) {
        socket.emit('error', { msg: 'User not found' });
        return;
      }
      if (receiver.friendRequests.includes(userId) || receiver.friends.includes(userId)) {
        socket.emit('error', { msg: 'Friend request already sent or already friends' });
        return;
      }
      if (receiver.blockedUsers.includes(userId)) {
        socket.emit('error', { msg: 'You are blocked by this user' });
        return;
      }
      const allowFriendRequests = receiver.privacy?.allowFriendRequests ?? true;
      if (!allowFriendRequests) {
        socket.emit('error', { msg: 'This user is not accepting friend requests' });
        return;
      }

      receiver.friendRequests.push(userId);
      await receiver.save();

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      io.to(friendId).emit('friendRequestReceived', { _id: userId, username: sender.username });
      socket.emit('actionResponse', { type: 'sendFriendRequest', success: true, msg: 'Friend request sent', friendId });
      console.log(`[Socket.IO SendFriendRequest] Friend request sent from ${userId} to ${friendId}`);
    } catch (err) {
      console.error('[Socket.IO SendFriendRequest] Error:', err.message);
      socket.emit('error', { msg: 'Failed to send friend request' });
    }
  });

  socket.on('acceptFriendRequest', async ({ userId, friendId }) => {
    try {
      const userUpdate = await User.findByIdAndUpdate(
        userId,
        { $pull: { friendRequests: friendId }, $push: { friends: friendId } },
        { new: true }
      );
      if (!userUpdate) {
        socket.emit('error', { msg: 'User not found' });
        return;
      }

      const friendUpdate = await User.findByIdAndUpdate(
        friendId,
        { $push: { friends: userId } },
        { new: true }
      );
      if (!friendUpdate) {
        socket.emit('error', { msg: 'Friend not found' });
        return;
      }

      const user = await User.findById(userId).populate('friendRequests', 'username').populate('friends', 'username');
      const friend = await User.findById(friendId).populate('friends', 'username');

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      const updatedFriendRequests = user.friendRequests.map((req) => ({ _id: req._id.toString(), username: req.username }));
      const updatedUserFriends = user.friends.map((f) => ({ _id: f._id.toString(), username: f.username }));
      const updatedFriendFriends = friend.friends.map((f) => ({ _id: f._id.toString(), username: f.username }));

      socket.emit('friendRequestsUpdate', updatedFriendRequests);
      socket.emit('friendsUpdate', updatedUserFriends);
      io.to(friendId).emit('friendsUpdate', updatedFriendFriends);
      io.to(friendId).emit('friendRequestAccepted', { userId });
      socket.emit('actionResponse', { type: 'acceptFriendRequest', success: true, msg: 'Friend request accepted', friendId });
      console.log(`[Socket.IO AcceptFriendRequest] Friend request accepted: ${userId} and ${friendId}`);
    } catch (err) {
      console.error('[Socket.IO AcceptFriendRequest] Error:', err.message);
      socket.emit('error', { msg: 'Failed to accept friend request' });
    }
  });

  socket.on('declineFriendRequest', async ({ userId, friendId }) => {
    try {
      const userUpdate = await User.findByIdAndUpdate(
        userId,
        { $pull: { friendRequests: friendId } },
        { new: true }
      );
      if (!userUpdate) {
        socket.emit('error', { msg: 'User not found' });
        return;
      }

      const user = await User.findById(userId).populate('friendRequests', 'username');

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      const updatedFriendRequests = user.friendRequests.map((req) => ({ _id: req._id.toString(), username: req.username }));

      socket.emit('friendRequestsUpdate', updatedFriendRequests);
      socket.emit('actionResponse', { type: 'declineFriendRequest', success: true, msg: 'Friend request declined', friendId });
      console.log(`[Socket.IO DeclineFriendRequest] Friend request declined: ${userId} declined ${friendId}`);
    } catch (err) {
      console.error('[Socket.IO DeclineFriendRequest] Error:', err.message);
      socket.emit('error', { msg: 'Failed to decline friend request' });
    }
  });

  socket.on('unfriend', async ({ userId, friendId }) => {
    try {
      const userUpdate = await User.findByIdAndUpdate(
        userId,
        { $pull: { friends: friendId } },
        { new: true }
      );
      const friendUpdate = await User.findByIdAndUpdate(
        friendId,
        { $pull: { friends: userId } },
        { new: true }
      );
      if (!userUpdate || !friendUpdate) {
        socket.emit('error', { msg: 'User not found' });
        return;
      }

      const user = await User.findById(userId).populate('friends', 'username');
      const friend = await User.findById(friendId).populate('friends', 'username');

      socket.request.session.lastActive = Date.now();
      socket.request.session.save();

      const updatedUserFriends = user.friends.map((f) => ({ _id: f._id.toString(), username: f.username }));
      const updatedFriendFriends = friend.friends.map((f) => ({ _id: f._id.toString(), username: f.username }));

      socket.emit('friendsUpdate', updatedUserFriends);
      io.to(friendId).emit('friendsUpdate', updatedFriendFriends);
      io.to(friendId).emit('friendRemoved', { friendId: userId });
      socket.emit('actionResponse', { type: 'unfriend', success: true, msg: 'Unfriended successfully', friendId });
      console.log(`[Socket.IO Unfriend] Unfriended: ${userId} and ${friendId}`);
    } catch (err) {
      console.error('[Socket.IO Unfriend] Error:', err.message);
      socket.emit('error', { msg: 'Failed to unfriend' });
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
        await User.findByIdAndUpdate(userId, { online: false, lastActive: new Date() }, { new: true });
      }
      userSocketMap.delete(userId);
      io.emit('userStatus', { userId, status: 'offline' });
      console.log(`[Socket.IO Disconnect] User disconnected: ${userId}`);
    } catch (err) {
      console.error('[Socket.IO Disconnect] Error:', err.message);
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
