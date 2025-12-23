// invoices.js
import express from 'express';
 
import { auth } from '../middleware/auth.js';
import pkg from 'csv-writer';
import { logActivity } from '../services/activityLogger.js';
const createObjectCsvStringifier = pkg.createObjectCsvStringifier;

const router = express.Router();

// 1. Get all invoices with filtering, pagination, and DATE RANGE support (matches /api/invoices)
router.get('/', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
    const { status, customer, page = 1, limit = 50, search, start, end } = req.query;
    
    let filter = {};
    
    // Status Filter (handle 'deleted' specially)
    if (status) {
        if (status === 'deleted') {
            filter.isDeleted = true;
        } else if (status !== 'all') {
            filter.status = status;
            // Default: Only show non-deleted items unless 'deleted' is explicitly requested
            filter.isDeleted = { $ne: true }; 
        } else {
             // 'all' status: still exclude deleted ones by default to keep list clean
             filter.isDeleted = { $ne: true };
        }
    } else {
        // No status provided: default to non-deleted
        filter.isDeleted = { $ne: true };
    }

    
    // Customer Filter (if used)
    if (customer) {
      filter.customer = customer;
    }
    
    // Search Filter (existing logic)
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    // DATE RANGE FILTER (Logic for History Page)
    if (start || end) {
        filter.createdAt = {};
        if (start) {
            // Find invoices created ON or AFTER the start date
            filter.createdAt.$gte = new Date(new Date(start).setHours(0, 0, 0, 0)); 
        }
        if (end) {
            // Find invoices created ON or BEFORE the end date
            filter.createdAt.$lte = new Date(new Date(end).setHours(23, 59, 59, 999));
        }
    }

    const invoices = await Invoice.find(filter)
      .populate('customer')
      .populate('createdBy')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(filter);

    res.json({
      invoices,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: error.message });
  }
});

// 2. Create invoice (matches POST /api/invoices)
router.post('/', auth, async (req, res) => {
  try {
    const { Invoice, Product } = req.tenantModels;
    console.log('Creating invoice with data:', req.body);
    
    const invoice = new Invoice({
      ...req.body,
      createdBy: req.user.id
    });
    
    // 1. Save the new invoice document
    await invoice.save();
    
    // 2. DEDUCT STOCK FOR EACH ITEM IN THE INVOICE
    const stockUpdatePromises = invoice.items.map(item => {
        // Use $inc with negative quantity to deduct stock
        // NOTE: item.product holds the Product ObjectId
        return Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity }
        }, { new: true });
    });

    // Execute all stock deduction updates concurrently
    await Promise.all(stockUpdatePromises);
    console.log('Stock successfully deducted for invoiced products.');
    
    // 3. Populate the customer and product data for the response
    await invoice.populate('customer');
    await invoice.populate('items.product');
    
    console.log('Invoice created successfully:', invoice);
    
    // Log Activity
    logActivity({
      req,
      action: 'CREATE',
      module: 'INVOICE',
      description: `Created invoice #${invoice.invoiceNumber} for ${invoice.customer?.name || 'Unknown'}`,
      targetId: invoice._id,
      metadata: { invoiceNumber: invoice.invoiceNumber, total: invoice.total }
    });
    
    
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.errors 
    });
  }
});

// 3. Create formatted invoice bill (matches POST /api/invoices/formatted-bill)
// This route now saves the formattedData, which includes companyName and branchName 
// as per the updated Invoice model.
router.post('/formatted-bill', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
    const { invoiceId, formattedData } = req.body;
    
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      { formattedBill: formattedData },
      { new: true }
    ).populate('customer');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Error creating formatted bill:', error);
    res.status(400).json({ message: error.message });
  }
});

// =========================================================================
// NEW: Get Invoice Statistics (Global Totals)
// This must be BEFORE /:id to prevent matching "stats" as an ID
router.get('/stats', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
    const commonFilter = { isDeleted: { $ne: true } };

    // 1. Total Active Invoices
    const totalCount = await Invoice.countDocuments(commonFilter);

    // 2. Aggregation for Revenue & Status Counts
    const stats = await Invoice.aggregate([
      { $match: commonFilter },
      {
        $facet: {
          revenue: [
            { $group: { _id: null, total: { $sum: "$total" } } }
          ],
          statusCounts: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    const totalRevenue = stats[0].revenue[0]?.total || 0;
    const statusMap = stats[0].statusCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.json({
      totalCount,
      totalRevenue,
      paidCount: statusMap['paid'] || 0,
      pendingCount: statusMap['pending'] || 0,
      overdueCount: statusMap['overdue'] || 0,
      draftCount: statusMap['draft'] || 0
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// =========================================================================
// FIX APPLIED: MOVED THIS ROUTE BEFORE THE DYNAMIC ID ROUTES
// 4. Export invoices to CSV (matches GET /api/invoices/export)
router.get('/export', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
    const invoices = await Invoice.find()
      .populate('customer')
      .populate('createdBy');

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'invoiceNumber', title: 'Invoice Number' },
        { id: 'customerName', title: 'Customer Name' },
        { id: 'customerPhone', title: 'Customer Phone' },
        { id: 'customerEmail', title: 'Customer Email' },
        { id: 'customerGST', title: 'Customer GST' },
        { id: 'subtotal', title: 'Subtotal' },
        { id: 'taxAmount', title: 'Tax Amount' },
        { id: 'total', title: 'Total' },
        { id: 'gstType', title: 'GST Type' },
        { id: 'status', title: 'Status' },
        { id: 'dueDate', title: 'Due Date' },
        { id: 'createdAt', title: 'Created Date' }
      ]
    });

    const records = invoices.map(invoice => ({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer?.name || 'N/A',
      customerPhone: invoice.customer?.phone || 'N/A',
      customerEmail: invoice.customer?.email || 'N/A',
      customerGST: invoice.customer?.gstNumber || 'N/A',
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxDetails?.totalTax || 0,
      total: invoice.total,
      gstType: invoice.taxDetails?.gstType === 'cgst_sgst' ? 'CGST+SGST' : 'IGST',
      status: invoice.status,
      dueDate: invoice.dueDate?.toISOString().split('T')[0] || 'N/A',
      createdAt: invoice.createdAt?.toISOString().split('T')[0] || 'N/A'
    }));

    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
    res.send(csvString);
  } catch (error) {
    console.error('Error exporting invoices:', error);
    res.status(500).json({ message: error.message });
  }
});
// =========================================================================

// 5. Get single invoice (matches GET /api/invoices/:id)
router.get('/:id', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('createdBy')
      .populate('items.product');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: error.message });
  }
});

// 6. Update invoice (matches PUT /api/invoices/:id)
router.put('/:id', auth, async (req, res) => {
  try {
    const { Invoice, Product } = req.tenantModels;
    // 1. Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Only Admins can edit invoices.' });
    }

    // A. FETCH OLD INVOICE & RESTORE STOCK
    const oldInvoice = await Invoice.findById(req.params.id);
    if (!oldInvoice) {
        return res.status(404).json({ message: 'Invoice not found' });
    }

    // Restore stock for old items
    const restorePromises = oldInvoice.items.map(item => {
        return Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity } // Add back the quantity
        });
    });
    await Promise.all(restorePromises);


    // B. DEDUCT STOCK FOR NEW ITEMS (from req.body)
    const newItems = req.body.items || [];
    const deductPromises = newItems.map(item => {
        return Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity } // Subtract the new quantity
        });
    });
    await Promise.all(deductPromises);


    // C. UPDATE INVOICE DOCUMENT
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('customer items.product');
    
    console.log(`Invoice ${invoice.invoiceNumber} updated. Stock adjusted.`);

    // Log Activity
    logActivity({
      req,
      action: 'UPDATE',
      module: 'INVOICE',
      description: `Updated invoice #${invoice.invoiceNumber}`,
      targetId: invoice._id,
      metadata: { invoiceNumber: invoice.invoiceNumber, total: invoice.total }
    });

    res.json(invoice);

  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(400).json({ message: error.message });
  }
});

// 7. Delete invoice (matches DELETE /api/invoices/:id)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
    // Soft Delete: Mark as deleted instead of removing
    const invoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true },
        { new: true }
    );
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // NOTE: Stock replenishment logic could be here, but for soft delete maybe we keep stock deducted?
    // User said "even after invoice is deleted its showing in history... if delete not needed just remove it"
    // Usually invalid invoices should return stock, but for simple soft-delete to hide from view we might not want to mess with stock yet unless requested.
    // Let's assume Soft Delete just "Hides" it. If they want to "Void" it, that's different.
    // Given the request "is it necessary to use delete option while all the invoices are important we can just make it as draft right?",
    // simply hiding it from the main list is the safest first step.
    
    res.json({ message: 'Invoice moved to trash (soft deleted)' });

    // Log Activity
    logActivity({
      req,
      action: 'SOFT_DELETE',
      module: 'INVOICE',
      description: `Moved invoice #${invoice.invoiceNumber} to trash`,
      targetId: invoice._id,
      metadata: { invoiceNumber: invoice.invoiceNumber }
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: error.message });
  }
});

// 8. Update invoice status (matches PATCH /api/invoices/:id/status)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
    const { status } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('customer items.product');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json(invoice);

    // Log Activity
    logActivity({
      req,
      action: 'UPDATE',
      module: 'INVOICE',
      description: `Updated invoice #${invoice.invoiceNumber} status to ${status}`,
      targetId: invoice._id,
      metadata: { invoiceNumber: invoice.invoiceNumber, status }
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(400).json({ message: error.message });
  }
});

// 9. Restore invoice (matches PATCH /api/invoices/:id/restore)
router.patch('/:id/restore', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
    // 1. Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Only Admins can restore invoices.' });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false },
      { new: true }
    ).populate('customer items.product');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Error restoring invoice:', error);
    res.status(400).json({ message: error.message });
  }
});

export default router;