import express from 'express';
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get Dashboard Stats (aggregated)
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const [
      invoices,
      totalProducts,
      totalCustomers,
      products
    ] = await Promise.all([
      Invoice.find({}),
      Product.countDocuments({ isActive: true }),
      Customer.countDocuments({}),
      Product.find({ isActive: true }, 'stock lowStockThreshold name') // Added 'name'
    ]);

    let totalSales = 0;
    let outstandingAR = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    const productSalesMap = {};
    const monthlySales = {}; // New: Track monthly sales

    invoices.forEach(inv => {
      const total = parseFloat(inv.total) || 0;
      const status = (inv.status || '').toLowerCase();
      
      if (status === 'paid') {
        totalSales += total;
        
        // Aggregate Monthly Sales for Chart
        const date = new Date(inv.createdAt);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + total;

      } else if (['pending', 'overdue', 'draft'].includes(status)) {
        outstandingAR += total;
        if (status === 'overdue') overdueCount++;
        if (status === 'pending') pendingCount++;
      }

      // Aggregate product sales
      inv.items?.forEach(item => {
        const pId = item.product?.toString(); // item.product is ObjectId from find({})
        if (pId) {
            if (!productSalesMap[pId]) {
                productSalesMap[pId] = {
                    qty: 0,
                    revenue: 0
                };
            }
            productSalesMap[pId].qty += (parseInt(item.quantity) || 0);
            productSalesMap[pId].revenue += (parseFloat(item.total) || 0);
        }
      });
    });

    const lowStockCount = products.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).length;

    // Process Top Products
    const sortedProductIds = Object.keys(productSalesMap).sort((a, b) => productSalesMap[b].qty - productSalesMap[a].qty).slice(0, 5);
    
    // Create a map for quick product lookup
    const productDetailMap = products.reduce((map, p) => {
        map[p._id.toString()] = p;
        return map;
    }, {});

    const topSellingProducts = sortedProductIds.map(id => {
        const branchP = productDetailMap[id];
        return {
            name: branchP ? branchP.name : 'Unknown Product',
            totalQuantity: productSalesMap[id].qty,
            totalRevenue: productSalesMap[id].revenue, // Added revenue
            stock: branchP ? branchP.stock : 0,
            growth: 0 // Placeholder
        };
    });

    res.json({
        totalSales,
        outstandingAR,
        totalInvoices: invoices.length,
        totalProducts,
        totalCustomers,
        lowStockCount,
        topSellingProducts,
        monthlySales
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get sales report
router.get('/sales', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const invoices = await Invoice.find(filter)
      .populate('customer')
      .populate('items.product');

    const totalSales = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const totalInvoices = invoices.length;

    res.json({
      totalSales,
      totalInvoices,
      invoices,
      period: { startDate, endDate }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;