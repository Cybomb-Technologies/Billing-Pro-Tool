import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE', 'OTHER']
  },
  module: {
    type: String,
    required: true,
    enum: ['AUTH', 'PRODUCT', 'INVOICE', 'STAFF_LOG', 'SUPPORT', 'BRANCH', 'ORGANIZATION', 'CUSTOMER', 'SETTINGS', 'OTHER']
  },
  description: {
    type: String,
    required: true
  },
  performedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Can be Admin or Staff
    name: String,
    email: String,
    role: String // 'superadmin', 'client-admin', 'staff'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId, // ID of the object being acted upon (Product ID, Invoice ID, etc.)
    default: null
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  tenantId: {
     type: mongoose.Schema.Types.ObjectId, // If specific to a branch
     default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // For any extra details (e.g., changes made)
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster querying
activityLogSchema.index({ organizationId: 1, timestamp: -1 });
activityLogSchema.index({ module: 1 });
activityLogSchema.index({ action: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export { activityLogSchema };
export default ActivityLog;
