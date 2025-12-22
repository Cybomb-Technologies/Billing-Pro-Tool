import mongoose from 'mongoose';

const TenantSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true // e.g., "Downtown Branch"
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true // e.g., "acme-downtown" - used for identification
  },
  dbURI: {
    type: String,
    required: true // The isolated database connection string
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'archived'],
    default: 'active'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
TenantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Tenant = mongoose.model('Tenant', TenantSchema);

export default Tenant;
