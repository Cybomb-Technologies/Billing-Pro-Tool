import express from 'express';

import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { User } = req.tenantModels;
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create user (admin only)
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { User } = req.tenantModels;
    // Force role to be 'staff' to prevent creating other admins
    const user = new User({ ...req.body, role: 'staff' });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { User } = req.tenantModels;
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
export default router;