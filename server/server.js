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
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5000', methods: ['GET', 'POST'] },
});

connectDB();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

const userSocketMap = new Map();

const getOnlineUsers = async () => {
  const registeredUsers = await User.find({}).select('_id username online');
  const anonymousUsers = await AnonymousSession.find({}).select('anonymousId username status');
  const allUsers = [
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
  ].filter(user => user.id && user.username);
  console.log('getOnlineUsers result:', allUsers);
  return allUsers;
};

const getPreviousMessages = async (userId) => {
  return await Message.find({ $or: [{ sender: userId }, { receiver: userId }] }).sort({ createdAt: 1 });
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', async (userId) => {
    try {
      if (!userId) {
        console.log('No userId provided');
        return socket.emit('error', { msg: 'No user ID provided' });
      }
      socket.join(userId);
      userSocketMap.set(userId, socket.id);

      const username = socket.handshake.query.username;
      if (!username) {
        console.log('No username provided in query');
        return socket.emit('error', { msg: 'Username is required' });
      }

      if (userId.startsWith('anon-')) {
        let session = await AnonymousSession.findOne({ anonymousId: userId });
        if (!session) {
          session = new AnonymousSession({ anonymousId: userId, username, status: 'online' });
          await session.save();
          console.log('New anonymous session created:', session);
        } else {
          session.status = 'online';
          if (session.username !== username) {
            session.username = username;
            await session.save();
            console.log('Anonymous user username updated:', session);
          } else {
            await session.save();
            console.log('Anonymous user updated to online:', session);
          }
        }
      } else {
        const user = await User.findByIdAndUpdate(userId, { online: true }, { new: true });
        if (user) {
          socket.emit('blockedUsersUpdate', user.blockedUsers.map((id) => id.toString()));
          console.log('Registered user updated to online:', user.username);
        } else {
          console.log('Registered user not found:', userId);
          return socket.emit('error', { msg: 'User not found' });
        }
      }

      io.emit('userStatus', { userId, status: 'online' });
      const previousMessages = await getPreviousMessages(userId);
      socket.emit('loadPreviousMessages', previousMessages);
      const onlineUsers = await getOnlineUsers();
      io.emit('userListUpdate', onlineUsers);
      console.log('Emitted userListUpdate after join:', onlineUsers);
    } catch (err) {
      console.error('Error in join event:', err);
      socket.emit('error', { msg: 'Failed to join' });
    }
  });

  socket.on('sendMessage', async ({ sender, receiver, content }) => {
    try {
      if (!sender || !receiver || !content) {
        return socket.emit('error', { msg: 'Missing message data' });
      }

      const senderExists = sender.startsWith('anon-') ? await AnonymousSession.findOne({ anonymousId: sender }) : await User.findById(sender);
      const receiverExists = receiver.startsWith('anon-') ? await AnonymousSession.findOne({ anonymousId: receiver }) : await User.findById(receiver);

      if (!senderExists || !receiverExists) {
        return socket.emit('error', { msg: 'User not found' });
      }

      if (!sender.startsWith('anon-')) {
        const receiverUser = await User.findById(receiver);
        if (receiverUser && receiverUser.blockedUsers.includes(sender)) {
          return socket.emit('error', { msg: 'You are blocked by this user' });
        }
      }

      const message = new Message({ sender, receiver, content, isAnonymous: sender.startsWith('anon-'), deliveredAt: new Date() });
      await message.save();
      io.to(receiver).emit('receiveMessage', message);
      io.to(sender).emit('receiveMessage', message);
      io.to(receiver).emit('notification', { text: `New message from ${senderExists.username}` });
    } catch (err) {
      console.error('Error sending message:', err);
      socket.emit('error', { msg: 'Failed to send message' });
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

  socket.on('typing', ({ sender, receiver }) => {
    io.to(receiver).emit('userTyping', { sender });
  });

  socket.on('stopTyping', ({ sender, receiver }) => {
    io.to(receiver).emit('userStoppedTyping', { sender });
  });

  socket.on('messageRead', async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && message.receiver === userId && !message.readAt) {
        message.readAt = new Date();
        await message.save();
        io.to(message.sender).emit('messageRead', message);
        io.to(message.receiver).emit('messageRead', message);
      }
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  });

  socket.on('blockUser', async ({ userId, targetId }) => {
    try {
      if (userId.startsWith('anon-')) return socket.emit('error', { msg: 'Anonymous users cannot block others' });
      const user = await User.findById(userId);
      if (!user) return socket.emit('error', { msg: 'User not found' });
      if (!user.blockedUsers) user.blockedUsers = [];
      if (user.blockedUsers.includes(targetId)) {
        socket.emit('actionResponse', { type: 'block', success: false, msg: 'User already blocked' });
      } else {
        user.blockedUsers.push(targetId);
        await user.save();
        socket.emit('blockedUsersUpdate', user.blockedUsers.map((id) => id.toString()));
        socket.emit('actionResponse', { type: 'block', success: true, msg: 'User blocked successfully' });
        io.to(targetId).emit('error', { msg: 'You have been blocked by a user' });
      }
    } catch (err) {
      console.error('Error blocking user:', err);
      socket.emit('actionResponse', { type: 'block', success: false, msg: 'Failed to block user' });
    }
  });

  socket.on('unblockUser', async ({ userId, targetId }) => {
    try {
      if (userId.startsWith('anon-')) return socket.emit('error', { msg: 'Anonymous users cannot unblock others' });
      const user = await User.findById(userId);
      if (!user) return socket.emit('error', { msg: 'User not found' });
      if (!user.blockedUsers || !user.blockedUsers.some((id) => id.toString() === targetId)) {
        socket.emit('actionResponse', { type: 'unblock', success: false, msg: 'User is not blocked' });
      } else {
        user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== targetId);
        await user.save();
        socket.emit('blockedUsersUpdate', user.blockedUsers.map((id) => id.toString()));
        socket.emit('actionResponse', { type: 'unblock', success: true, msg: 'User unblocked successfully' });
      }
    } catch (err) {
      console.error('Error unblocking user:', err);
      socket.emit('actionResponse', { type: 'unblock', success: false, msg: 'Failed to unblock user' });
    }
  });

  socket.on('addFriend', async ({ userId, friendId }) => {
    try {
      if (userId.startsWith('anon-')) return socket.emit('error', { msg: 'Anonymous users cannot add friends' });
      const user = await User.findById(userId);
      const friend = await User.findById(friendId);
      if (!friend) return socket.emit('actionResponse', { type: 'friend', success: false, msg: 'User not found' });
      if (user.friends.includes(friendId)) {
        socket.emit('actionResponse', { type: 'friend', success: false, msg: 'Already friends' });
      } else {
        user.friends.push(friendId);
        await user.save();
        socket.emit('actionResponse', { type: 'friend', success: true, msg: 'Friend added successfully' });
        const onlineUsers = await getOnlineUsers();
        io.emit('userListUpdate', onlineUsers);
      }
    } catch (err) {
      console.error('Error adding friend:', err);
      socket.emit('actionResponse', { type: 'friend', success: false, msg: 'Failed to add friend' });
    }
  });

  socket.on('reportUser', async ({ userId, targetId }) => {
    try {
      if (userId.startsWith('anon-')) return socket.emit('error', { msg: 'Anonymous users cannot report others' });
      const user = await User.findById(userId);
      if (!user) return socket.emit('error', { msg: 'User not found' });
      console.log(`User ${userId} reported ${targetId}`);
      socket.emit('actionResponse', { type: 'report', success: true, msg: 'User reported successfully' });
    } catch (err) {
      console.error('Error reporting user:', err);
      socket.emit('actionResponse', { type: 'report', success: false, msg: 'Failed to report user' });
    }
  });

  socket.on('logout', async (userId) => {
    try {
      if (!userId) return;
      if (userId.startsWith('anon-')) {
        await AnonymousSession.findOneAndDelete({ anonymousId: userId });
        await Message.deleteMany({ sender: userId, isAnonymous: true });
        userSocketMap.delete(userId);
        const onlineUsers = await getOnlineUsers();
        io.emit('userListUpdate', onlineUsers);
        console.log('Anonymous user logged out, updated user list:', onlineUsers);
      } else {
        await User.findByIdAndUpdate(userId, { online: false }, { new: true });
        userSocketMap.delete(userId);
        io.emit('userStatus', { userId, status: 'offline' });
        const onlineUsers = await getOnlineUsers();
        io.emit('userListUpdate', onlineUsers);
        console.log('Registered user logged out, updated user list:', onlineUsers);
      }
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
        userSocketMap.delete(userId);
        const onlineUsers = await getOnlineUsers();
        io.emit('userListUpdate', onlineUsers);
        console.log('Anonymous user disconnected, updated user list:', onlineUsers);
      } else {
        await User.findByIdAndUpdate(userId, { online: false }, { new: true });
        userSocketMap.delete(userId);
        io.emit('userStatus', { userId, status: 'offline' });
        const onlineUsers = await getOnlineUsers();
        io.emit('userListUpdate', onlineUsers);
        console.log('Registered user disconnected, updated user list:', onlineUsers);
      }
    } catch (err) {
      console.error('Error in disconnect event:', err);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
