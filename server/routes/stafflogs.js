// routes/stafflogs.js
import express from 'express';

import { auth } from '../middleware/auth.js'; // Assuming you use auth middleware

import { logActivity } from '../services/activityLogger.js';

const router = express.Router();

// POST /api/logs
// Submit a new task log
router.post('/', auth, async (req, res) => {
    try {
        const { StaffLog } = req.tenantModels;
        const { date, category, details, status } = req.body;
        
        // Use authenticated user info for security and context
        const newLog = new StaffLog({
            userId: req.user.id,
            userName: req.user.username, // Assuming your user object has 'username'
            date,
            category,
            details,
            status
        });

        const savedLog = await newLog.save();

        // Log Activity
        logActivity({
            req,
            action: 'CREATE',
            module: 'STAFF_LOG',
            description: `Staff submitted log: ${category}`,
            targetId: savedLog._id,
            metadata: { date, status }
        });

        res.status(201).json(savedLog);
    } catch (error) {
        console.error('Error creating staff log:', error);
        res.status(400).json({ message: 'Failed to create task log.', error: error.message });
    }
});

// GET /api/logs
// Fetch all logs, primarily filtered by the requesting user (staff ID)
router.get('/', auth, async (req, res) => {
    try {
        const { StaffLog } = req.tenantModels;
        // --- Filtering Logic ---
        const userIdToFilter = req.user.role === 'staff' ? req.user.id : req.query.userId;
        
        let filter = {};
        if (userIdToFilter) {
             filter.userId = userIdToFilter;
        }

        // Optional: Filter by specific date (e.g., /api/logs?date=2025-10-06)
        if (req.query.date) {
            const date = new Date(req.query.date);
            // Set filter for a specific day (start of day to end of day)
            filter.date = {
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lte: new Date(date.setHours(23, 59, 59, 999))
            };
        }

        // Find logs, sorted by date (newest first)
        const logs = await StaffLog.find(filter)
                                   .sort({ createdAt: -1 });
        
        res.json(logs);
    } catch (error) {
        console.error('Error fetching staff logs:', error);
        res.status(500).json({ message: 'Failed to retrieve logs.', error: error.message });
    }
});


// Optional: PUT/PATCH for updating status/details (if needed)

export default router;