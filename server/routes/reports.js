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
                    // We might not have name here if not populated, but we can look it up from 'products' array below if populated or needed
                    // Actually, invoices are NOT populated in this find({}). 
                    // We need to match with the 'products' list we fetched concurrently? 
                    // 'products' fetched in Promise.all currently only selects 'stock lowStockThreshold'.
                    // We need 'title/name' for the dashboard list.
                };
            }
            productSalesMap[pId].qty += (parseInt(item.quantity) || 0);
        }
      });
    });

    const lowStockCount = products.filter(p => (p.stock || 0) < (p.lowStockThreshold || 10)).length;

    // Process Top Products
    // We need names. Let's create a map from the 'products' array.
    // Note: 'products' currently select('stock lowStockThreshold'). We need to add 'name' to the query.
    
    // Changing query in replacement to include 'name'
    // This replace block only targets the loop, I need to update the query too.
    // I will do two edits or one big one.
    // To avoid complex multi-edit, I'll return JUST the map or IDs and let frontend/backend handle it? 
    // No, backend should return the final list.
    
    // Efficient way: Get top IDs, then map names.
    const sortedProductIds = Object.keys(productSalesMap).sort((a, b) => productSalesMap[b].qty - productSalesMap[a].qty).slice(0, 5);
    
    // We need to fetch details for these Top 5 IDs. 
    // OR we can just fetch 'name' for ALL active products in the Promise.all query (it's likely not too huge yet).
    // Let's assume fetching name for all active products is fine.
    
    const productDetailMap = products.reduce((map, p) => {
        map[p._id.toString()] = p;
        return map;
    }, {});

    const topSellingProducts = sortedProductIds.map(id => {
        const branchP = productDetailMap[id];
        return {
            name: branchP ? branchP.name : 'Unknown Product',
            totalQuantity: productSalesMap[id].qty,
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