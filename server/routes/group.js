const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create a new group
router.post('/create', auth, async (req, res) => {
  const { name, category, isPublic, description } = req.body;
  console.log('Creating group with:', { name, category, isPublic, description, user: req.user });
  try {
    if (!name || !category) throw new Error('Name and category are required');
    const validCategories = ['dance', 'sport', 'movie', 'music', 'gaming', 'tech', 'social', 'other'];
    if (!validCategories.includes(category)) {
      throw new Error(`Invalid category: ${category}. Must be one of ${validCategories.join(', ')}`);
    }

    const group = new Group({
      name,
      category,
      creator: req.user,
      members: [req.user],
      isPublic: isPublic || false,
      description: description || '',
      messages: [] // Ensure messages array is initialized
    });
    await group.save();

    const userUpdate = await User.findByIdAndUpdate(req.user, { $push: { groups: group._id } }, { new: true });
    if (!userUpdate) throw new Error('User not found for update');

    res.status(201).json(group);
  } catch (err) {
    console.error('Error creating group:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Add a member to a group (anyone can join public groups)
router.post('/:groupId/add-member', auth, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user;
  console.log('Adding member to group:', { groupId, userId });
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    if (!group.isPublic && group.creator.toString() !== userId) {
      return res.status(403).json({ msg: 'Only the creator can add members to a private group' });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ msg: 'You are already in the group' });
    }

    group.members.push(userId);
    const userUpdate = await User.findByIdAndUpdate(userId, { $push: { groups: group._id } }, { new: true });
    if (!userUpdate) throw new Error('User not found for update');
    await group.save();

    res.json(group);
  } catch (err) {
    console.error('Error adding member:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Delete a group (creator only)
router.delete('/:groupId', auth, async (req, res) => {
  const { groupId } = req.params;
  console.log('Deleting group:', { groupId, user: req.user });
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    if (group.creator.toString() !== req.user) {
      return res.status(403).json({ msg: 'Only the creator can delete the group' });
    }

    await Group.deleteOne({ _id: groupId });
    await User.updateMany({ groups: groupId }, { $pull: { groups: groupId } });

    res.json({ msg: 'Group deleted successfully' });
  } catch (err) {
    console.error('Error deleting group:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get all groups for a user
router.get('/my-groups', auth, async (req, res) => {
  console.log('Fetching groups for user:', req.user);
  try {
    const groups = await Group.find({ members: req.user })
      .populate('members', 'username')
      .populate('creator', 'username');
    res.json(groups);
  } catch (err) {
    console.error('Error fetching groups:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get public groups
router.get('/public', async (req, res) => {
  console.log('Fetching public groups');
  try {
    const groups = await Group.find({ isPublic: true }).populate('creator', 'username');
    res.json(groups);
  } catch (err) {
    console.error('Error fetching public groups:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
