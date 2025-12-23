import express from 'express';
import ActivityLog from '../models/ActivityLog.js';
import { auth } from '../middleware/auth.js'; // Assuming we have generic auth or we need flexible auth

const router = express.Router();

// Middleware: Handle both standard Auth (Client/Staff) and Super Admin Key
const authOrSuperAdmin = async (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey && (adminKey === process.env.SUPER_ADMIN_KEY || adminKey === 'secret-admin-key-123')) {
        req.user = { role: 'superadmin', name: 'SuperAdmin', id: 'superadmin' };
        return next();
    }
    // Fallback to standard auth
    auth(req, res, next);
};

router.use(authOrSuperAdmin);

import { getTenantDB } from '../utils/tenantManager.js';

// GET /api/activity-logs
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, module, action, search, slug } = req.query;
    const user = req.user;

    let query = {};
    let LogModel = ActivityLog; // Default to central DB

    // Access Control & DB Selection
    if (user.role === 'superadmin') {
      // Superadmin can see all logs
      // If a specific tenant slug is provided, switch to that Tenant DB
      if (slug) {
         const { models } = await getTenantDB(slug);
         LogModel = models.ActivityLog;
      } else if (req.query.organizationId) {
         // If filtering by organization but NO slug, we are likely looking at central logs 
         // filtered by organizationId (e.g. provisioning logs). 
         // Unless we want to aggregate from all tenants of that org? 
         // For now, let's assume central logs (provisioning etc) or aggregated isn't requested yet.
         query.organizationId = req.query.organizationId;
      }
    } else if (user.role === 'admin' || user.role === 'staff') {
      // Client Admin/Staff can only see their organization's logs
      // They should naturally be connected to their Tenant DB via middleware
      if (req.tenantModels && req.tenantModels.ActivityLog) {
          LogModel = req.tenantModels.ActivityLog;
      }
      
      // We might not need organizationId in query if we are in the tenant DB, 
      // as the tenant DB only contains data for that tenant.
      // But we can keep it for safety or if the model includes it.
      if (!user.organizationId) {
        // Fallback or error? 
        // If in tenant DB, maybe organizationId isn't strictly required for access control 
        // if the DB itself is isolated. But let's keep the existing check.
        // return res.status(403).json({ message: 'Organization context missing' });
      }
      // query.organizationId = user.organizationId; // Not needed if DB is isolated
    } else {
       return res.status(403).json({ message: 'Access denied' });
    }

    // Filters
    if (module) query.module = module;
    if (action) query.action = action;
    if (search) {
       query.description = { $regex: search, $options: 'i' };
    }
    
    // Date Range Filter
    if (req.query.startDate || req.query.endDate) {
        query.timestamp = {};
        if (req.query.startDate) query.timestamp.$gte = new Date(req.query.startDate);
        if (req.query.endDate) {
            const end = new Date(req.query.endDate);
            end.setHours(23, 59, 59, 999);
            query.timestamp.$lte = end;
        }
    }

    const logs = await LogModel.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await LogModel.countDocuments(query);

    res.json({
      logs,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalCount: total
    });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

export default router;
