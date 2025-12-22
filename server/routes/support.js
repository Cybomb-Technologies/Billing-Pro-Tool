import express from 'express';

import { auth } from '../middleware/auth.js';
import { sendNewTicketEmail, sendStaffConfirmationEmail, emitNewTicketNotification } from '../utils/notifier.js';

const router = express.Router();

// Helper function to generate a ticket ID
const generateTicketId = async (SupportTicket) => {
    try {
        const count = await SupportTicket.countDocuments();
        return `TKT-${String(count + 1).padStart(5, '0')}`;
    } catch (error) {
        console.error('Error generating ticket ID:', error);
        return `TKT-${Date.now().toString().slice(-6)}`;
    }
};

// POST /api/support/tickets - Submit a new support ticket (Staff & Admin)
router.post('/tickets', auth, async (req, res) => {
    try {
        const { SupportTicket } = req.tenantModels;
        const { name, email, subject, department, message } = req.body;
        
        const ticketId = await generateTicketId(SupportTicket);

        const newTicket = new SupportTicket({
            ticketId,
            customerName: name,
            customerEmail: email,
            subject,
            department,
            message,
            submittedBy: req.user.id // This is a staff or admin user
        });

        const savedTicket = await newTicket.save();

        console.log(`[TICKET CREATED] ID: ${savedTicket.ticketId} | Subject: ${subject} | User: ${req.user.username}`);

        sendNewTicketEmail(savedTicket);
        sendStaffConfirmationEmail(savedTicket);
        emitNewTicketNotification(savedTicket);

        res.status(201).json({
            message: 'Ticket submitted successfully.',
            ticketId: savedTicket.ticketId,
            savedTicket
        });
    } catch (error) {
        console.error('Error submitting support ticket:', error.response?.data || error);
        res.status(400).json({ message: 'Failed to submit ticket.', error: error.message });
    }
});

// PUT /api/support/tickets/:ticketId/status - Update ticket status (Admin Only)
router.put('/tickets/:ticketId/status', auth, async (req, res) => {
    try {
        const { SupportTicket } = req.tenantModels;
        // Enforce admin-only access
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only administrators can update ticket status.' });
        }

        const { ticketId } = req.params;
        const { status } = req.body;

        if (!status || !['Open', 'In Progress', 'Closed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid or missing status provided.' });
        }

        const updatedTicket = await SupportTicket.findOneAndUpdate(
            { ticketId: ticketId },
            { $set: { status: status } },
            { new: true }
        );

        if (!updatedTicket) {
            return res.status(404).json({ message: 'Ticket not found.' });
        }

        console.log(`[TICKET STATUS] Ticket ${ticketId} updated to ${status} by Admin user ${req.user.username}`);
        
        res.json({ 
            message: `Ticket ${ticketId} status updated successfully.`,
            ticket: updatedTicket
        });

    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ message: 'Failed to update ticket status.', error: error.message });
    }
});

// GET /api/support/tickets - Fetch tickets (Role-based access)
router.get('/tickets', auth, async (req, res) => {
    try {
        const { SupportTicket } = req.tenantModels;
        let filter = {};
        // Staff members can only see their own tickets
        if (req.user.role === 'staff') {
            filter.submittedBy = req.user.id;
        }
        // Admins see all tickets (filter remains empty)

        const tickets = await SupportTicket.find(filter)
            .populate('submittedBy', 'username role')
            .sort({ createdAt: -1 });
            
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        res.status(500).json({ message: 'Failed to retrieve tickets.' });
    }
});

export default router;