import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  ownerEmail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  // Removed 'subscriptionPlan' (basic/pro/enterprise) as per new requirement
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  password: {
    type: String,
    required: true
  },
  planType: {
    type: String,
    enum: ['self', 'organization'], // 'self' = Single Branch, 'organization' = Multi Branch Panel
    default: 'self'
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

// Update timestamp on save & Hash Password
OrganizationSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  
  next();
});

const Organization = mongoose.model('Organization', OrganizationSchema);

export default Organization;
