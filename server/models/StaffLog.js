// models/StaffLog.js
import mongoose from 'mongoose';

const staffLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming you have a User model
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true,
        // Ensures the logs are associated with the start of the day for easy grouping
        set: (date) => new Date(new Date(date).setHours(0, 0, 0, 0))
    },
    category: {
        type: String,
        required: true,
        enum: ['Invoice Processing', 'Inventory Check', 'Customer Follow-up', 'Report Generation', 'Data Entry', 'Other']
    },
    details: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Completed', 'In Progress', 'Pending'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const StaffLogSchema = staffLogSchema;
export default mongoose.model('StaffLog', staffLogSchema);