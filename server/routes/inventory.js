import express from 'express';

import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get all inventory items
router.get('/', auth, async (req, res) => {
  try {
    const { Inventory } = req.tenantModels;
    const inventory = await Inventory.find().populate('product');
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update inventory
router.put('/:id', auth, async (req, res) => {
  try {
    const { Inventory } = req.tenantModels;
    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('product');
    res.json(inventory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;