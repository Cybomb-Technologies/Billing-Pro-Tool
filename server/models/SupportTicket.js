// models/SupportTicket.js
import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true,
        enum: ['technical', 'billing', 'feature', 'account']
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Closed'],
        default: 'Open'
    },
    // Track the staff user who submitted the ticket (if internal)
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// The pre-save middleware for auto-generating the ticketId has been removed.

export const SupportTicketSchema = supportTicketSchema;
export default mongoose.model('SupportTicket', supportTicketSchema);