import { getTenantDB } from '../utils/tenantManager.js';
import Tenant from '../models/master/Tenant.js'; 
import Organization from '../models/master/Organization.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { getTenantModels } from '../utils/modelFactory.js';

/**
 * Middleware to resolve tenant and attach models to request
 */
export const tenantResolver = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      // --- AUTO-RESOLVE FOR SELF-OWNED ORGS ---
      // If no tenant ID is provided, check if it's a Self-Owned organization owner logging in
      if (req.body && req.body.email) {
          const org = await Organization.findOne({ ownerEmail: req.body.email });
          if (org && org.planType === 'self') {
               const tenant = await Tenant.findOne({ organizationId: org._id });
               if (tenant) {
                   // Found the tenant! Connect to it.
                   console.log(`[TenantResolver] 🟢 Auto-resolved self-owned tenant '${tenant.slug}' for ${req.body.email}`);
                   const { models } = await getTenantDB(tenant.slug);
                   req.tenantModels = models;
                   req.tenantId = tenant.slug;
                   return next();
               }
          }
      }
      
      // --- AUTO-RESOLVE FROM TOKEN (For authenticated requests) ---
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
              const token = authHeader.split(' ')[1];
              // Decode without verification first (auth middleware validates it later)
              // or verify if we have the secret handy. Verification is safer.
              const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
              
              if (decoded.tenantId) {
                   console.log(`[TenantResolver] 🟢 Resolved tenant '${decoded.tenantId}' from Token.`);
                   const { models } = await getTenantDB(decoded.tenantId);
                   req.tenantModels = models;
                   req.tenantId = decoded.tenantId;
                   return next();
              }
          } catch (err) {
              // Token invalid or expired - ignore here, let auth middleware handle 401
          }
      }

      // Fallback to default connection (Master DB) or specific behaviour
      // Often Master DB doesn't have 'User' collection for app users, only Admin/SuperAdmin
      // But we attach it anyway to prevent crash if route uses it (though it might be empty)
      req.tenantModels = getTenantModels(mongoose.connection);
      return next();
    }

    // Load Tenant DB
    const { models } = await getTenantDB(tenantId);
    
    // Attach to request
    req.tenantModels = models;
    req.tenantId = tenantId;

    next();
  } catch (error) {
    console.error('Tenant Resolution Error:', error.message);
    res.status(404).json({ message: 'Tenant not found or unavailable', error: error.message });
  }
};
