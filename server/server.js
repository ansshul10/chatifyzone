const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const groupRoutes = require('./routes/group');
const cors = require('cors');
const Message = require('./models/Message');
const AnonymousSession = require('./models/AnonymousSession');
const User = require('./models/User');
const Group = require('./models/Group');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
});

connectDB();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/group', groupRoutes);

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
  console.log('User connected:', socket.id);

  socket.on('join', async (userId) => {
    try {
      if (!userId) return socket.emit('error', { msg: 'No user ID provided' });
      socket.join(userId);
      userSocketMap.set(userId, socket.id);

      const username = socket.handshake.query.username;
      if (!username) return socket.emit('error', { msg: 'Username is required' });

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
          .populate('friends', 'username online status')
          .populate('friendRequests', 'username')
          .populate('blockedUsers', 'username');
        if (user) {
          socket.emit('blockedUsersUpdate', user.blockedUsers);
          socket.emit('friendsUpdate', user.friends);
          socket.emit('friendRequestsUpdate', user.friendRequests);
        } else {
          return socket.emit('error', { msg: 'User not found' });
        }
      }

      io.emit('userStatus', { userId, status: 'online' });
      const previousMessages = await getPreviousMessages(userId);
      socket.emit('loadPreviousMessages', previousMessages);
      const onlineUsers = await getOnlineUsers();
      io.emit('userListUpdate', onlineUsers);
    } catch (err) {
      console.error('Error in join event:', err);
      socket.emit('error', { msg: 'Failed to join' });
    }
  });

  socket.on('sendMessage', async ({ sender, receiver, content }) => {
    try {
      if (!sender || !receiver || !content) return socket.emit('error', { msg: 'Missing message data' });

      const senderExists = sender.startsWith('anon-') ? await AnonymousSession.findOne({ anonymousId: sender }) : await User.findById(sender);
      const receiverExists = receiver.startsWith('anon-') ? await AnonymousSession.findOne({ anonymousId: receiver }) : await User.findById(receiver);

      if (sender.startsWith('anon-') && !receiver.startsWith('anon-')) return socket.emit('error', { msg: 'Anonymous users cannot send messages to registered users' });
      if (!senderExists || !receiverExists) return socket.emit('error', { msg: 'User not found' });

      if (!sender.startsWith('anon-')) {
        const receiverUser = await User.findById(receiver);
        if (receiverUser && receiverUser.blockedUsers.includes(sender)) return socket.emit('error', { msg: 'You are blocked by this user' });
      }

      const message = new Message({ sender, receiver, content, isAnonymous: sender.startsWith('anon-'), deliveredAt: new Date() });
      await message.save();
      io.to(receiver).emit('receiveMessage', message);
      io.to(sender).emit('receiveMessage', message);
      io.to(receiver).emit('notification', { text: `New message from ${senderExists.username}`, senderId: sender });
    } catch (err) {
      console.error('Error sending message:', err);
      socket.emit('error', { msg: 'Failed to send message' });
    }
  });

  socket.on('joinGroup', async ({ groupId, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) return socket.emit('error', { msg: 'Group not found' });
      if (!group.members.includes(userId) && !group.isPublic) return socket.emit('error', { msg: 'You are not a member of this group' });

      socket.join(groupId);
      console.log(`User ${userId} joined group ${groupId}`);

      socket.emit('loadGroupMessages', group.messages || []);
    } catch (err) {
      console.error('Error joining group:', err);
      socket.emit('error', { msg: 'Failed to join group' });
    }
  });

  socket.on('sendGroupMessage', async ({ groupId, userId, content }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) return socket.emit('error', { msg: 'Group not found' });
      if (!group.members.includes(userId)) return socket.emit('error', { msg: 'You are not a member of this group' });

      const message = { sender: userId, content, createdAt: new Date() };
      group.messages = group.messages || [];
      group.messages.push(message);
      await group.save();

      io.to(groupId).emit('receiveGroupMessage', message);
    } catch (err) {
      console.error('Error sending group message:', err);
      socket.emit('error', { msg: 'Failed to send group message' });
    }
  });

  socket.on('leaveGroup', async ({ groupId, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) return socket.emit('error', { msg: 'Group not found' });
      if (!group.members.includes(userId)) return socket.emit('error', { msg: 'You are not a member of this group' });

      group.members = group.members.filter(member => member.toString() !== userId);
      await group.save();
      await User.findByIdAndUpdate(userId, { $pull: { groups: groupId } });

      socket.leave(groupId);
      socket.emit('actionResponse', { type: 'leaveGroup', success: true, msg: 'Left group successfully' });
      io.to(groupId).emit('groupUpdate', group);
    } catch (err) {
      console.error('Error leaving group:', err);
      socket.emit('error', { msg: 'Failed to leave group' });
    }
  });

  socket.on('deleteGroup', async ({ groupId, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) return socket.emit('error', { msg: 'Group not found' });
      if (group.creator.toString() !== userId) return socket.emit('error', { msg: 'Only the creator can delete the group' });

      await Group.deleteOne({ _id: groupId });
      await User.updateMany({ groups: groupId }, { $pull: { groups: groupId } });

      io.to(groupId).emit('actionResponse', { type: 'deleteGroup', success: true, msg: 'Group has been deleted' });
      io.in(groupId).socketsLeave(groupId);
      console.log(`Group ${groupId} deleted by ${userId}`);
    } catch (err) {
      console.error('Error deleting group:', err);
      socket.emit('error', { msg: 'Failed to delete group' });
    }
  });

  socket.on('reactionUpdate', async ({ messageId, userId, reaction }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', { msg: 'Message not found' });

      message.reactions = message.reactions || {};
      message.reactions[userId] = reaction;
      await message.save();

      io.to(message.sender).emit('reactionUpdate', { messageId, reactions: message.reactions });
      io.to(message.receiver).emit('reactionUpdate', { messageId, reactions: message.reactions });
    } catch (err) {
      console.error('Error updating reaction:', err);
      socket.emit('error', { msg: 'Failed to update reaction' });
    }
  });

  socket.on('messageRead', async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', { msg: 'Message not found' });
      if (message.receiver.toString() !== userId) return;

      message.readAt = new Date();
      await message.save();

      io.to(message.sender).emit('messageRead', { messageId, readAt: message.readAt });
    } catch (err) {
      console.error('Error marking message as read:', err);
      socket.emit('error', { msg: 'Failed to mark message as read' });
    }
  });

  socket.on('deleteMessage', async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', { msg: 'Message not found' });
      if (message.sender.toString() !== userId) return socket.emit('error', { msg: 'Only the sender can delete the message' });

      await Message.deleteOne({ _id: messageId });
      io.to(message.sender).emit('messageDeleted', { messageId });
      io.to(message.receiver).emit('messageDeleted', { messageId });
    } catch (err) {
      console.error('Error deleting message:', err);
      socket.emit('error', { msg: 'Failed to delete message' });
    }
  });

  socket.on('blockUser', async ({ userId, blockedId }) => {
    try {
      const user = await User.findById(userId);
      if (!user) return socket.emit('error', { msg: 'User not found' });
      if (user.blockedUsers.includes(blockedId)) return socket.emit('error', { msg: 'User already blocked' });

      user.blockedUsers.push(blockedId);
      user.friends = user.friends.filter((friend) => friend.toString() !== blockedId);
      await user.save();

      await User.findByIdAndUpdate(blockedId, { $pull: { friends: userId } });
      socket.emit('blockedUsersUpdate', user.blockedUsers);
      socket.emit('friendsUpdate', user.friends);
      io.to(blockedId).emit('friendRemoved', { friendId: userId });
    } catch (err) {
      console.error('Error blocking user:', err);
      socket.emit('error', { msg: 'Failed to block user' });
    }
  });

  socket.on('unblockUser', async ({ userId, unblockedId }) => {
    try {
      const user = await User.findById(userId);
      if (!user) return socket.emit('error', { msg: 'User not found' });

      user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== unblockedId);
      await user.save();

      socket.emit('blockedUsersUpdate', user.blockedUsers);
    } catch (err) {
      console.error('Error unblocking user:', err);
      socket.emit('error', { msg: 'Failed to unblock user' });
    }
  });

  socket.on('sendFriendRequest', async ({ senderId, receiverId }) => {
    try {
      const sender = await User.findById(senderId);
      const receiver = await User.findById(receiverId);
      if (!sender || !receiver) return socket.emit('error', { msg: 'User not found' });
      if (receiver.friendRequests.includes(senderId) || receiver.friends.includes(senderId)) return socket.emit('error', { msg: 'Friend request already sent or already friends' });
      if (receiver.blockedUsers.includes(senderId)) return socket.emit('error', { msg: 'You are blocked by this user' });

      receiver.friendRequests.push(senderId);
      await receiver.save();

      io.to(receiverId).emit('friendRequestReceived', { senderId, senderUsername: sender.username });
      io.to(senderId).emit('friendRequestSent', { receiverId });
    } catch (err) {
      console.error('Error sending friend request:', err);
      socket.emit('error', { msg: 'Failed to send friend request' });
    }
  });

  socket.on('acceptFriendRequest', async ({ userId, friendId }) => {
    try {
      const user = await User.findById(userId);
      const friend = await User.findById(friendId);
      if (!user || !friend) return socket.emit('error', { msg: 'User not found' });

      user.friendRequests = user.friendRequests.filter((id) => id.toString() !== friendId);
      user.friends.push(friendId);
      friend.friends.push(userId);
      await user.save();
      await friend.save();

      socket.emit('friendsUpdate', user.friends);
      io.to(friendId).emit('friendsUpdate', friend.friends);
      io.to(friendId).emit('friendRequestAccepted', { userId });
    } catch (err) {
      console.error('Error accepting friend request:', err);
      socket.emit('error', { msg: 'Failed to accept friend request' });
    }
  });

  socket.on('declineFriendRequest', async ({ userId, friendId }) => {
    try {
      const user = await User.findById(userId);
      if (!user) return socket.emit('error', { msg: 'User not found' });

      user.friendRequests = user.friendRequests.filter((id) => id.toString() !== friendId);
      await user.save();

      socket.emit('friendRequestsUpdate', user.friendRequests);
    } catch (err) {
      console.error('Error declining friend request:', err);
      socket.emit('error', { msg: 'Failed to decline friend request' });
    }
  });

  socket.on('removeFriend', async ({ userId, friendId }) => {
    try {
      const user = await User.findById(userId);
      const friend = await User.findById(friendId);
      if (!user || !friend) return socket.emit('error', { msg: 'User not found' });

      user.friends = user.friends.filter((id) => id.toString() !== friendId);
      friend.friends = friend.friends.filter((id) => id.toString() !== userId);
      await user.save();
      await friend.save();

      socket.emit('friendsUpdate', user.friends);
      io.to(friendId).emit('friendsUpdate', friend.friends);
      io.to(friendId).emit('friendRemoved', { friendId: userId });
    } catch (err) {
      console.error('Error removing friend:', err);
      socket.emit('error', { msg: 'Failed to remove friend' });
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
      console.log('User disconnected:', userId);
    } catch (err) {
      console.error('Error in disconnect event:', err);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
