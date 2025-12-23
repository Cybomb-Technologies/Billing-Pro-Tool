// models/Customer.js
import mongoose from 'mongoose';
import { parse } from 'postcss';

const customerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  // NEW FIELD: Business Name
  businessName: {
    type: String,
    trim: true,
    index: true,
    sparse: true, // Index for fast searching
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: true, // Changed to true to mandatory phone
    trim: true,
    validate: {
      validator: function(phone) {
        if (!phone) return false; // Fix: Phone is now required
        // Remove all non-digit characters and check length
        const digitsOnly = phone.replace(/\D/g, '');
        return digitsOnly.length >= 10;
      },
      message: 'Phone number must contain at least 10 digits'
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  taxId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Normalize phone number before saving
  if (this.phone) {
    this.phone = this.phone.replace(/\D/g, '');
  }
  
  next();
});

// Validate GST number format
customerSchema.path('gstNumber').validate(function(gstNumber) {
  if (!gstNumber) return true; // GST number is optional
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstNumber);
}, 'Invalid GST number format');

export const CustomerSchema = customerSchema;
export default mongoose.model('Customer', customerSchema);