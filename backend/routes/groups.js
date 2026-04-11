const express = require('express');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/groups - get all groups for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups - create a group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required.' });

    const group = new Group({
      name, description, category,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });
    await group.save();
    await group.populate('members.user', 'name email');
    await group.populate('createdBy', 'name email');
    res.status(201).json({ group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:id - get single group
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email');
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isMember = group.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    res.json({ group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/join/:inviteCode - join via invite
router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.inviteCode.toUpperCase() });
    if (!group) return res.status(404).json({ error: 'Invalid invite code.' });

    const alreadyMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (alreadyMember) return res.status(400).json({ error: 'Already a member.' });

    group.members.push({ user: req.user._id, role: 'member' });
    await group.save();
    await group.populate('members.user', 'name email');
    res.json({ group, message: 'Joined successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:id/invite - add member by email
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const User = require('../models/User');
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const invitedUser = await User.findOne({ email });
    if (!invitedUser) return res.status(404).json({ error: 'User not found with that email.' });

    const alreadyMember = group.members.some(m => m.user.toString() === invitedUser._id.toString());
    if (alreadyMember) return res.status(400).json({ error: 'User is already a member.' });

    group.members.push({ user: invitedUser._id, role: 'member' });
    await group.save();
    await group.populate('members.user', 'name email');
    res.json({ group, message: 'Member added!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:id/balances - calculate balances
router.get('/:id/balances', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members.user', 'name email');
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const expenses = await Expense.find({ group: req.params.id })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email');

    // net[userId] = total paid - total owed
    const net = {};
    group.members.forEach(m => { net[m.user._id.toString()] = 0; });

    expenses.forEach(exp => {
      const payerId = exp.paidBy._id ? exp.paidBy._id.toString() : exp.paidBy.toString();
      // payer gets credited the full amount
      net[payerId] = (net[payerId] || 0) + exp.amount;
      // each person in split gets debited their share
      exp.splits.forEach(split => {
        const uid = split.user._id ? split.user._id.toString() : split.user.toString();
        net[uid] = (net[uid] || 0) - split.amount;
      });
    });

    // Build members array for response (immutable)
    const members = group.members.map(m => ({
      id: m.user._id.toString(),
      name: m.user.name,
      balance: Math.round((net[m.user._id.toString()] || 0) * 100) / 100
    }));

    // Build name lookup
    const nameById = {};
    group.members.forEach(m => { nameById[m.user._id.toString()] = m.user.name; });

    // Direct pair-wise: for each expense, each non-payer owes the payer their share
    // pairNet[fromId][toId] = amount fromId owes toId
    const pairNet = {};
    const initPair = (a, b) => {
      if (!pairNet[a]) pairNet[a] = {};
      if (!pairNet[b]) pairNet[b] = {};
      if (!pairNet[a][b]) pairNet[a][b] = 0;
      if (!pairNet[b][a]) pairNet[b][a] = 0;
    };

    expenses.forEach(exp => {
      const payerId = exp.paidBy._id ? exp.paidBy._id.toString() : exp.paidBy.toString();
      exp.splits.forEach(split => {
        const uid = split.user._id ? split.user._id.toString() : split.user.toString();
        if (uid === payerId) return; // payer doesn't owe themselves
        initPair(uid, payerId);
        pairNet[uid][payerId] += split.amount; // uid owes payerId
      });
    });

    // Resolve each pair: if A owes B and B owes A, net them out
    const seen = new Set();
    const settlements = [];
    Object.keys(pairNet).forEach(fromId => {
      Object.keys(pairNet[fromId]).forEach(toId => {
        const key = [fromId, toId].sort().join('-');
        if (seen.has(key)) return;
        seen.add(key);

        const aOwesB = pairNet[fromId]?.[toId] || 0;
        const bOwesA = pairNet[toId]?.[fromId] || 0;
        const net = aOwesB - bOwesA;

        if (net > 0.01) {
          settlements.push({
            from: nameById[fromId],
            to: nameById[toId],
            amount: Math.round(net * 100) / 100
          });
        } else if (net < -0.01) {
          settlements.push({
            from: nameById[toId],
            to: nameById[fromId],
            amount: Math.round(Math.abs(net) * 100) / 100
          });
        }
      });
    });

    res.json({ balances: members, settlements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
