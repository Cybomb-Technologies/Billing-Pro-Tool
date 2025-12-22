// routes/settings.js
import express from 'express';
 
import { auth, authorize } from '../middleware/auth.js'; 
import { logActivity } from '../services/activityLogger.js';

const router = express.Router();

// Middleware to ensure only authenticated Admins can access all settings routes
router.use(auth); 
router.use(authorize('admin')); 

// GET /api/settings
// Fetch the single global settings document. USES UPSERT TO ENSURE IT EXISTS.
router.get('/', async (req, res) => {
    try {
        const { Settings } = req.tenantModels;
        // Find the global settings document or create it if it doesn't exist
        const settings = await Settings.findOneAndUpdate(
            { settingsId: 'global_settings' },
            {}, // No updates needed, just find or create
            { upsert: true, new: true, runValidators: true } 
        );

        // Destructure to remove MongoDB IDs and internal fields from the response
        const { _id, settingsId, __v, createdAt, ...settingsData } = settings.toObject();

        res.json(settingsData);
    } catch (error) {
        console.error('Error fetching global settings:', error);
        res.status(500).json({ message: 'Failed to retrieve settings.', error: error.message });
    }
});

// PATCH /api/settings/:category
// Update a specific category of settings (company, preferences, or payment)
router.patch('/:category', async (req, res) => {
    const { Settings } = req.tenantModels;
    const { category } = req.params;
    const updates = req.body;

    // Added 'company' and 'payment' here to reflect frontend tabs
    const allowedCategories = ['company', 'preferences', 'payment']; 

    if (!allowedCategories.includes(category)) {
        return res.status(400).json({ message: `Invalid settings category: ${category}` });
    }

    try {
        // Construct the update object to target the nested field 
        // This logic correctly maps {gstIn: '...'} to { 'company.gstIn': '...' }
        const updateObject = {};
        for (const key in updates) {
            updateObject[`${category}.${key}`] = updates[key];
        }

        const settings = await Settings.findOneAndUpdate(
            { settingsId: 'global_settings' },
            { $set: updateObject, updatedAt: new Date() },
            // Ensures the document exists if this is the first save
            { new: true, runValidators: true, useFindAndModify: false, upsert: true } 
        );
        
        if (!settings) {
            return res.status(500).json({ message: 'Failed to create or update global settings document.' });
        }

        // Log Activity
        logActivity({
            req,
            action: 'UPDATE',
            module: 'SETTINGS', // Or OTHER mapped to SETTINGS? Enum in ActivityLog allows 'OTHER'. 
            // We should ideally add SETTINGS to Enum, but OTHER is fine or extend Enum if possible.
            // Using 'OTHER' but description clarifies.
            description: `Updated ${category} settings`,
            metadata: { category, updates: Object.keys(updates) }
        });

        // Return only the updated category data
        res.json({ message: `${category} settings updated successfully.`, data: settings[category] });

    } catch (error) {
        console.error(`Error updating ${category} settings:`, error);
        // Specifically check for validation errors which might occur with new fields
        if (error.name === 'ValidationError') {
             return res.status(400).json({ message: `Validation failed: ${error.message}` });
        }
        res.status(500).json({ message: `Failed to update ${category} settings.`, error: error.message });
    }
});

export default router;