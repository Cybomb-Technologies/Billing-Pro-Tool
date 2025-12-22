import mongoose from 'mongoose';
import ActivityLog from '../models/ActivityLog.js';

import { getTenantDB } from '../utils/tenantManager.js';

/**
 * Logs a system activity.
 * 
 * @param {Object} params - The parameters for logging.
 * @param {string} params.action - The type of action (e.g., 'LOGIN', 'CREATE').
 * @param {string} params.module - The module where action occurred (e.g., 'AUTH', 'INVOICE').
 * @param {string} params.description - Human-readable description.
 * @param {Object} params.req - The Express request object (to extract user info).
 * @param {string} [params.targetId] - Optional ID of the affected document.
 * @param {Object} [params.metadata] - Optional extra data.
 */
export const logActivity = async ({ action, module, description, req, targetId = null, metadata = {}, user: explicitUser = null }) => {
  try {
    const user = explicitUser || req.user || {};
    
    // Determine context (Superadmin vs Client/Staff)
    // Superadmin flows might stick user info in different props depending on how auth middleware sets it
    // Assuming standard structure from auth middleware: req.user = { id, email, role, ... }
    
    const performedBy = {
      userId: (mongoose.Types.ObjectId.isValid(user.id || user._id)) ? (user.id || user._id) : null, 
      name: user.name || user.username || 'Unknown', 
      email: user.email,
      role: user.role
    };

    // If it's a superadmin action, organizationId might be null or passed in metadata if acting on a client
    // If it's a client admin/staff, organizationId should be in req.user.organizationId
    
    const organizationId = user.organizationId || metadata.organizationId || null;
    const tenantId = user.tenantId || metadata.tenantId || null;

    // Determine which DB to save to
    let LogModel = ActivityLog; // Default to Central DB

    if (req.tenantModels && req.tenantModels.ActivityLog) {
        // Use the tenant model attached to the request
        LogModel = req.tenantModels.ActivityLog;
    } else if (metadata.slug) {
        // If explicitly targeting a tenant by slug (e.g. from SuperAdmin provisioning)
        try {
            const { models } = await getTenantDB(metadata.slug);
            if (models.ActivityLog) {
                LogModel = models.ActivityLog;
            }
        } catch (err) {
            console.warn(`Could not switch to tenant DB for logging: ${metadata.slug}`, err);
        }
    }

    const logEntry = new LogModel({
      action,
      module,
      description,
      performedBy,
      targetId,
      organizationId,
      tenantId,
      metadata
    });

    await logEntry.save();
    // console.log(`[ACTIVITY] ${module}: ${description}`);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't block the main thread if logging fails
  }
};
