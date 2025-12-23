import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

import { logActivity } from '../services/activityLogger.js';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { User } = req.tenantModels;
    
    const user = await User.findOne({ email, isActive: true });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`[Auth Login] Generatng token for User: ${user._id}, Tenant: ${req.tenantId}`);

    const token = jwt.sign(
      { userId: user._id, role: user.role, tenantId: req.tenantId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Log Activity (Pass user explicitly since req.user is not yet set)
    logActivity({
      req,
      action: 'LOGIN',
      module: 'AUTH',
      description: `User logged in: ${user.username} (${user.email})`,
      user: { ...user.toObject(), id: user._id }, // Pass user object
      metadata: { role: user.role }
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;