// models/Settings.js
import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    settingsId: {
        type: String,
        required: true,
        unique: true,
        default: 'global_settings'
    },

    // --- COMPANY INFO: ADDED GST-IN, BRANCH, CURRENCY ---
    company: {
        name: { type: String, default: 'Billing Pro Business Suite' },
        email: { type: String, default: 'contact@billingpro.com' },
        phone: { type: String, default: '+1 (555) 123-4567' },
        address: { type: String, default: '123 Business Way, City, State, 12345' },
        logo: { type: String }, // URL or path to logo
        
        // New Fields
        branchLocation: { type: String },
        gstIn: { type: String },
        currency: { type: String, default: 'INR' } // e.g., INR, USD, EUR
    },

    // --- PAYMENT SETTINGS: ADDED BENEFICIARY, UPI, SWIFT, TERMS ---
    payment: {
        bankName: { type: String },
        accountNumber: { type: String },
        ifsc: { type: String },
        paypalEmail: { type: String },
        
        // New Fields
        beneficiaryName: { type: String },
        upiId: { type: String },
        swiftCode: { type: String },
        terms: { type: String, default: '' }
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensures that we only ever attempt to create one settings document
settingsSchema.pre('save', function (next) {
    if (this.isNew && this.settingsId !== 'global_settings') {
        const error = new Error('Only one settings document is allowed.');
        next(error);
    } else {
        next();
    }
});


export default mongoose.model('Settings', settingsSchema);