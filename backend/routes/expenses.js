const express = require('express');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/expenses/group/:groupId
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ group: req.params.groupId })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    res.json({ expenses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses - add expense
router.post('/', auth, async (req, res) => {
  try {
    const { groupId, title, amount, category, paidBy, splitType, splits, notes, date } = req.body;

    if (!groupId || !title || !amount || !paidBy)
      return res.status(400).json({ error: 'Missing required fields.' });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    let finalSplits = splits;
    if (splitType === 'equal') {
      const perPerson = amount / group.members.length;
      finalSplits = group.members.map(m => ({
        user: m.user,
        amount: Math.round(perPerson * 100) / 100,
        paid: m.user.toString() === paidBy
      }));
    }

    const expense = new Expense({
      group: groupId, title, amount, category,
      paidBy, splitType, splits: finalSplits,
      notes, date: date || new Date(),
      createdBy: req.user._id
    });
    await expense.save();
    await expense.populate('paidBy', 'name email');
    await expense.populate('splits.user', 'name email');

    res.status(201).json({ expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    if (expense.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only the creator can delete this expense.' });

    await expense.deleteOne();
    res.json({ message: 'Expense deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expenses/summary/:groupId
router.get('/summary/:groupId', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ group: req.params.groupId });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    res.json({ total, count: expenses.length, byCategory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
