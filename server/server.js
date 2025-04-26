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
const groupRoutes = require('./routes/group');
const Message = require('./models/Message');
const AnonymousSession = require('./models/AnonymousSession');
const User = require('./models/User');
const Group = require('./models/Group');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Validate environment variables
if (!process.env.MONGO_URI || !process.env.SESSION_SECRET || !process.env.JWT_SECRET) {
  console.error('[Server] Missing required environment variables: MONGO_URI, SESSION_SECRET, JWT_SECRET');
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

// Apply session middleware to Express
app.use(sessionMiddleware);

// Convert session middleware for Socket.IO
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Apply session middleware to Socket.IO
io.use(wrap(sessionMiddleware));

// Connect to MongoDB
connectDB().then(() => {
  console.log('[Server] MongoDB connected successfully');
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/group', groupRoutes);

// Socket.IO Logic
const userSocketMap = new Map();

const getOnlineUsers = async () => {
  const registeredUsers = await User.find({}).select('_id username online');
  const anonymousUsers = await AnonymousSession.find({}).select('anonymousId username status');
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
  ].filter((user) => user.id && user.username);
};

const getPreviousMessages = async (userId) => {
  return await Message.find({ $or: [{ sender: userId }, { receiver: userId }] }).sort({ createdAt: 1 });
};

io.on('connection', (socket) => {
  console.log(`[Socket.IO] User connected: ${socket.id}`);

  socket.on('join', async (userId) => {
    try {
      if (!userId) {
        console.error('[Socket.IO Join] No user ID provided');
        socket.emit('error', { msg: 'No user ID provided' });
        return;
      }
      socket.join(userId);
      userSocketMap.set(userId, socket.id);

      const username = socket.request.session.username || socket.handshake.query.username;
      if (!username) {
        console.error('[Socket.IO Join] Username is required');
        socket.emit('error', { msg: 'Username is required' });
        return;
      }

      if (userId.startsWith('anon-')) {
        let session = await AnonymousSession.findOne({ anonymousId: userId });
        if (!session) {
          session = new AnonymousSession({ anonymousId: userId, username, status: 'online' });
          await session.save();
        } else {
          session.status = 'online';
          if (session.username !== username) session.username = username;
          await session.save();
        }
      } else {
        const user = await User.findByIdAndUpdate(userId, { online: true }, { new: true })
          .populate('friends', 'username online')
          .populate('friendRequests', 'username')
          .populate('blockedUsers', 'username');
        if (user) {
          socket.emit('blockedUsersUpdate', user.blockedUsers.map(u => ({ _id: u._id.toString(), username: u.username })));
          socket.emit('friendsUpdate', user.friends.map(f => ({ _id: f._id.toString(), username: f.username })));
          socket.emit('friendRequestsUpdate', user.friendRequests.map(r => ({ _id: r._id.toString(), username: r.username })));
        } else {
          console.error('[Socket.IO Join] User not found:', userId);
          socket.emit('error', { msg: 'User not found' });
          return;
        }
      }

      io.emit('userStatus', { userId, status: 'online' });
      const previousMessages = await getPreviousMessages(userId);
      socket.emit('loadPreviousMessages', previousMessages);
      const onlineUsers = await getOnlineUsers();
      io.emit('userListUpdate', onlineUsers);

      console.log(`[Socket.IO Join] User joined: ${userId} (${username})`);
    } catch (err) {
      console.error('[Socket.IO Join] Error:', err.message);
      socket.emit('error', { msg: 'Failed to join' });
    }
  });

  socket.on('sendMessage', async ({ sender, receiver, content }) => {
    try {
      if (!sender || !receiver || !content) {
        console.error('[Socket.IO SendMessage] Missing message data');
        socket.emit('error', { msg: 'Missing message data' });
        return;
      }

      const senderExists = sender.startsWith('anon-') ? await AnonymousSession.findOne({ anonymousId: sender }) : await User.findById(sender);
      const receiverExists = receiver.startsWith('anon-') ? await AnonymousSession.findOne({ anonymousId: receiver }) : await User.findById(receiver);

      if (sender.startsWith('anon-') && !receiver.startsWith('anon-')) {
        console.error('[Socket.IO SendMessage] Anonymous users cannot message registered users');
        socket.emit('error', { msg: 'Anonymous users cannot send messages to registered users' });
        return;
      }
      if (!senderExists || !receiverExists) {
        console.error('[Socket.IO SendMessage] User not found:', { sender, receiver });
        socket.emit('error', { msg: 'User not found' });
        return;
      }

      if (!sender.startsWith('anon-')) {
        const receiverUser = await User.findById(receiver);
        if (receiverUser && receiverUser.blockedUsers.includes(sender)) {
          console.error('[Socket.IO SendMessage] Sender blocked by receiver:', sender);
          socket.emit('error', { msg: 'You are blocked by this user' });
          return;
        }
      }

      const message = new Message({ sender, receiver, content, isAnonymous: sender.startsWith('anon-'), deliveredAt: new Date() });
      await message.save();
      io.to(receiver).emit('receiveMessage', message);
      io.to(sender).emit('receiveMessage', message);
      io.to(receiver).emit('notification', { text: `New message from ${senderExists.username}`, senderId: sender });

      console.log(`[Socket.IO SendMessage] Message sent from ${sender} to ${receiver}`);
    } catch (err) {
      console.error('[Socket.IO SendMessage] Error:', err.message);
      socket.emit('error', { msg: 'Failed to send message' });
    }
  });

  socket.on('typing', ({ sender, receiver, username }) => {
    io.to(receiver).emit('userTyping', { sender, username });
    console.log(`[Socket.IO Typing] ${username} is typing to ${receiver}`);
  });

  socket.on('stopTyping', ({ sender, receiver }) => {
    io.to(receiver).emit('userStoppedTyping', { sender });
    console.log(`[Socket.IO StopTyping] ${sender} stopped typing to ${receiver}`);
  });

  socket.on('updateMessageStatus', async ({ messageId, userId, status }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        console.error('[Socket.IO UpdateMessageStatus] Message not found:', messageId);
        socket.emit('error', { msg: 'Message not found' });
        return;
      }
      if (message.receiver.toString() !== userId) return;

      if (status === 'delivered' && !message.deliveredAt) {
        message.deliveredAt = new Date();
      } else if (status === 'read' && !message.readAt) {
        message.readAt = new Date();
      }
      await message.save();

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
        console.error('[Socket.IO EditMessage] Message not found:', messageId);
        socket.emit('error', { msg: 'Message not found' });
        return;
      }
      if (message.sender.toString() !== userId) {
        console.error('[Socket.IO EditMessage] Unauthorized edit attempt by:', userId);
        socket.emit('error', { msg: 'Only the sender can edit the message' });
        return;
      }

      message.content = content;
      message.edited = true;
      await message.save();

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
        console.error('[Socket.IO DeleteMessage] Message not found:', messageId);
        socket.emit('error', { msg: 'Message not found' });
        return;
      }
      if (message.sender.toString() !== userId) {
        console.error('[Socket.IO DeleteMessage] Unauthorized delete attempt by:', userId);
        socket.emit('error', { msg: 'Only the sender can delete the message' });
        return;
      }

      await Message.deleteOne({ _id: messageId });
      io.to(message.sender).emit('messageDeleted', messageId);
      io.to(message.receiver).emit('messageDeleted', messageId);
      console.log(`[Socket.IO DeleteMessage] Message ${messageId} deleted by ${userId}`);
    } catch (err) {
      console.error('[Socket.IO DeleteMessage] Error:', err.message);
      socket.emit('error', { msg: 'Failed to delete message' });
    }
  });

  socket.on('joinGroup', async ({ groupId, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        console.error('[Socket.IO JoinGroup] Group not found:', groupId);
        socket.emit('error', { msg: 'Group not found' });
        return;
      }
      if (!group.members.includes(userId)) {
        console.error('[Socket.IO JoinGroup] User not a member:', userId);
        socket.emit('error', { msg: 'You are not a member of this group' });
        return;
      }

      socket.join(groupId);
      socket.emit('loadGroupMessages', { groupId, messages: group.messages });
      console.log(`[Socket.IO JoinGroup] User ${userId} joined group ${groupId}`);
    } catch (err) {
      console.error('[Socket.IO JoinGroup] Error:', err.message);
      socket.emit('error', { msg: 'Failed to join group' });
    }
  });

  socket.on('sendGroupMessage', async ({ groupId, userId, content, sender, createdAt }) => {
    try {
      if (!groupId || !userId || !content || !sender) {
        console.error('[Socket.IO SendGroupMessage] Missing required fields');
        socket.emit('error', { msg: 'Missing required fields' });
        return;
      }

      const group = await Group.findById(groupId);
      if (!group) {
        console.error('[Socket.IO SendGroupMessage] Group not found:', groupId);
        socket.emit('error', { msg: 'Group not found' });
        return;
      }
      if (!group.members.includes(userId)) {
        console.error('[Socket.IO SendGroupMessage] User not a member:', userId);
        socket.emit('error', { msg: 'You are not a member of this group' });
        return;
      }

      const senderData = userId.startsWith('anon-') ? await AnonymousSession.findOne({ anonymousId: userId }) : await User.findById(userId);
      const senderUsername = senderData ? senderData.username : 'Unknown';

      const message = { sender: sender.toString(), content, createdAt: new Date(createdAt), reactions: {}, username: senderUsername };
      group.messages.push(message);
      await group.save();

      const newMessage = group.messages[group.messages.length - 1];
      io.to(groupId).emit('receiveGroupMessage', { ...message, groupId, _id: newMessage._id });
      console.log(`[Socket.IO SendGroupMessage] Message sent to group ${groupId} by ${userId}`);
    } catch (err) {
      console.error('[Socket.IO SendGroupMessage] Error:', err.message);
      socket.emit('error', { msg: 'Failed to send group message' });
    }
  });

  socket.on('editGroupMessage', async ({ groupId, messageId, content, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        console.error('[Socket.IO EditGroupMessage] Group not found:', groupId);
        socket.emit('error', { msg: 'Group not found' });
        return;
      }

      const message = group.messages.id(messageId);
      if (!message) {
        console.error('[Socket.IO EditGroupMessage] Message not found:', messageId);
        socket.emit('error', { msg: 'Message not found' });
        return;
      }
      if (message.sender.toString() !== userId) {
        console.error('[Socket.IO EditGroupMessage] Unauthorized edit attempt by:', userId);
        socket.emit('error', { msg: 'Only the sender can edit the message' });
        return;
      }

      message.content = content;
      message.edited = true;
      await group.save();

      io.to(groupId).emit('groupMessageEdited', { groupId, messageId, content, edited: true });
      console.log(`[Socket.IO EditGroupMessage] Message ${messageId} edited in group ${groupId} by ${userId}`);
    } catch (err) {
      console.error('[Socket.IO EditGroupMessage] Error:', err.message);
      socket.emit('error', { msg: 'Failed to edit group message' });
    }
  });

  socket.on('deleteGroupMessage', async ({ groupId, messageId, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        console.error('[Socket.IO DeleteGroupMessage] Group not found:', groupId);
        socket.emit('error', { msg: 'Group not found' });
        return;
      }

      const message = group.messages.id(messageId);
      if (!message) {
        console.error('[Socket.IO DeleteGroupMessage] Message not found:', messageId);
        socket.emit('error', { msg: 'Message not found' });
        return;
      }
      if (message.sender.toString() !== userId) {
        console.error('[Socket.IO DeleteGroupMessage] Unauthorized delete attempt by:', userId);
        socket.emit('error', { msg: 'Only the sender can delete the message' });
        return;
      }

      group.messages.pull(messageId);
      await group.save();

      io.to(groupId).emit('groupMessageDeleted', { groupId, messageId });
      console.log(`[Socket.IO DeleteGroupMessage] Message ${messageId} deleted in group ${groupId} by ${userId}`);
    } catch (err) {
      console.error('[Socket.IO DeleteGroupMessage] Error:', err.message);
      socket.emit('error', { msg: 'Failed to delete group message' });
    }
  });

  socket.on('addReaction', async ({ messageId, emoji, userId, groupId }) => {
    try {
      if (groupId) {
        const group = await Group.findById(groupId);
        if (!group) {
          console.error('[Socket.IO AddReaction] Group not found:', groupId);
          socket.emit('error', { msg: 'Group not found' });
          return;
        }
        if (!group.members.includes(userId)) {
          console.error('[Socket.IO AddReaction] User not a member:', userId);
          socket.emit('error', { msg: 'You are not a member of this group' });
          return;
        }

        const message = group.messages.id(messageId);
        if (!message) {
          console.error('[Socket.IO AddReaction] Message not found:', messageId);
          socket.emit('error', { msg: 'Message not found' });
          return;
        }

        message.reactions = message.reactions || new Map();
        const currentCount = message.reactions.get(emoji) || 0;
        message.reactions.set(emoji, currentCount + 1);
        await group.save();

        io.to(groupId).emit('reactionUpdate', { messageId, reactions: Object.fromEntries(message.reactions) });
        console.log(`[Socket.IO AddReaction] Reaction added to message ${messageId} in group ${groupId} by ${userId}`);
      } else {
        const message = await Message.findById(messageId);
        if (!message) {
          console.error('[Socket.IO AddReaction] Message not found:', messageId);
          socket.emit('error', { msg: 'Message not found' });
          return;
        }
        if (![message.sender.toString(), message.receiver.toString()].includes(userId)) {
          console.error('[Socket.IO AddReaction] Unauthorized reaction attempt by:', userId);
          socket.emit('error', { msg: 'Unauthorized' });
          return;
        }

        message.reactions = message.reactions || new Map();
        const currentCount = message.reactions.get(emoji) || 0;
        message.reactions.set(emoji, currentCount + 1);
        await message.save();

        io.to(message.sender).emit('reactionUpdate', { messageId, reactions: Object.fromEntries(message.reactions) });
        io.to(message.receiver).emit('reactionUpdate', { messageId, reactions: Object.fromEntries(message.reactions) });
        console.log(`[Socket.IO AddReaction] Reaction added to message ${messageId} by ${userId}`);
      }
    } catch (err) {
      console.error('[Socket.IO AddReaction] Error:', err.message);
      socket.emit('error', { msg: 'Failed to add reaction' });
    }
  });

  socket.on('leaveGroup', async ({ groupId, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        console.error('[Socket.IO LeaveGroup] Group not found:', groupId);
        socket.emit('error', { msg: 'Group not found' });
        return;
      }
      if (!group.members.includes(userId)) {
        console.error('[Socket.IO LeaveGroup] User not a member:', userId);
        socket.emit('error', { msg: 'You are not a member of this group' });
        return;
      }
      if (group.creator === userId) {
        console.error('[Socket.IO LeaveGroup] Creator cannot leave:', userId);
        socket.emit('error', { msg: 'Creator cannot leave the group; delete it instead' });
        return;
      }

      group.members = group.members.filter((member) => member !== userId);
      await group.save();

      socket.leave(groupId);
      io.to(groupId).emit('groupUpdate', group);
      socket.emit('actionResponse', { type: 'leaveGroup', success: true, msg: 'Left group successfully' });
      console.log(`[Socket.IO LeaveGroup] User ${userId} left group ${groupId}`);
    } catch (err) {
      console.error('[Socket.IO LeaveGroup] Error:', err.message);
      socket.emit('error', { msg: 'Failed to leave group' });
    }
  });

  socket.on('deleteGroup', async ({ groupId, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        console.error('[Socket.IO DeleteGroup] Group not found:', groupId);
        socket.emit('error', { msg: 'Group not found' });
        return;
      }
      if (group.creator !== userId) {
        console.error('[Socket.IO DeleteGroup] Unauthorized delete attempt by:', userId);
        socket.emit('error', { msg: 'Only the creator can delete the group' });
        return;
      }

      await Group.deleteOne({ _id: groupId });
      io.to(groupId).emit('groupUpdate', { _id: groupId, deleted: true });
      socket.emit('actionResponse', { type: 'deleteGroup', success: true, msg: 'Group deleted successfully' });
      console.log(`[Socket.IO DeleteGroup] Group ${groupId} deleted by ${userId}`);
    } catch (err) {
      console.error('[Socket.IO DeleteGroup] Error:', err.message);
      socket.emit('error', { msg: 'Failed to delete group' });
    }
  });

  socket.on('blockUser', async ({ userId, targetId }) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error('[Socket.IO BlockUser] User not found:', userId);
        socket.emit('error', { msg: 'User not found' });
        return;
      }
      if (user.blockedUsers.includes(targetId)) {
        console.error('[Socket.IO BlockUser] User already blocked:', targetId);
        socket.emit('error', { msg: 'User already blocked' });
        return;
      }

      user.blockedUsers.push(targetId);
      user.friends = user.friends.filter((friend) => friend.toString() !== targetId);
      await user.save();

      await User.findByIdAndUpdate(targetId, { $pull: { friends: userId } });
      socket.emit('blockedUsersUpdate', user.blockedUsers.map(id => id.toString()));
      socket.emit('friendsUpdate', user.friends);
      io.to(targetId).emit('friendRemoved', { friendId: userId });
      socket.emit('actionResponse', { type: 'block', success: true, msg: 'User blocked successfully', targetId });
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
        console.error('[Socket.IO UnblockUser] User not found:', userId);
        socket.emit('error', { msg: 'User not found' });
        return;
      }
      if (!user.blockedUsers.includes(targetId)) {
        console.error('[Socket.IO UnblockUser] User not blocked:', targetId);
        socket.emit('error', { msg: 'User not blocked' });
        return;
      }

      user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== targetId);
      await user.save();

      socket.emit('blockedUsersUpdate', user.blockedUsers.map(id => id.toString()));
      socket.emit('actionResponse', { type: 'unblock', success: true, msg: 'User unblocked successfully', targetId });
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
        console.error('[Socket.IO SendFriendRequest] User not found:', { userId, friendId });
        socket.emit('error', { msg: 'User not found' });
        return;
      }
      if (receiver.friendRequests.includes(userId) || receiver.friends.includes(userId)) {
        console.error('[Socket.IO SendFriendRequest] Friend request already sent or already friends:', friendId);
        socket.emit('error', { msg: 'Friend request already sent or already friends' });
        return;
      }
      if (receiver.blockedUsers.includes(userId)) {
        console.error('[Socket.IO SendFriendRequest] Sender blocked by receiver:', userId);
        socket.emit('error', { msg: 'You are blocked by this user' });
        return;
      }
      const allowFriendRequests = receiver.privacy?.allowFriendRequests ?? true;
      if (!allowFriendRequests) {
        console.error('[Socket.IO SendFriendRequest] Receiver not accepting friend requests:', friendId);
        socket.emit('error', { msg: 'This user is not accepting friend requests' });
        return;
      }

      receiver.friendRequests.push(userId);
      await receiver.save();

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
        console.error('[Socket.IO AcceptFriendRequest] User not found:', userId);
        socket.emit('error', { msg: 'User not found' });
        return;
      }

      const friendUpdate = await User.findByIdAndUpdate(
        friendId,
        { $push: { friends: userId } },
        { new: true }
      );
      if (!friendUpdate) {
        console.error('[Socket.IO AcceptFriendRequest] Friend not found:', friendId);
        socket.emit('error', { msg: 'Friend not found' });
        return;
      }

      const user = await User.findById(userId).populate('friendRequests', 'username').populate('friends', 'username');
      const friend = await User.findById(friendId).populate('friends', 'username');

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
        console.error('[Socket.IO DeclineFriendRequest] User not found:', userId);
        socket.emit('error', { msg: 'User not found' });
        return;
      }

      const user = await User.findById(userId).populate('friendRequests', 'username');
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
        console.error('[Socket.IO Unfriend] User not found:', { userId, friendId });
        socket.emit('error', { msg: 'User not found' });
        return;
      }

      const user = await User.findById(userId).populate('friends', 'username');
      const friend = await User.findById(friendId).populate('friends', 'username');

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
        await User.findByIdAndUpdate(userId, { online: false }, { new: true });
      }
      userSocketMap.delete(userId);
      io.emit('userStatus', { userId, status: 'offline' });
      const onlineUsers = await getOnlineUsers();
      io.emit('userListUpdate', onlineUsers);
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
