import express from 'express';

import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get Dashboard Stats (aggregated)
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const { Invoice, Product, Customer, User } = req.tenantModels;
    const [
      invoices,
      totalProducts,
      totalCustomers,
      products,
      totalUsers
    ] = await Promise.all([
      Invoice.find({}),
      Product.countDocuments({ isActive: true }),
      Customer.countDocuments({}),
      Product.find({ isActive: true }, 'stock lowStockThreshold name price costPrice'), // Added price and costPrice for value calc
      User.countDocuments({})
    ]);

    let totalSales = 0;
    let outstandingAR = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    let inventoryValue = 0; // New: Inventory Value

    const productSalesMap = {};
    const monthlySales = {}; // New: Track monthly sales

    // --- Trend Calculation Helpers (Last 30 Days vs Previous 30 Days) ---
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

    let revenueCurrent = 0, revenuePrev = 0;
    let invoicesCurrent = 0, invoicesPrev = 0;
    let arCurrent = 0, arPrev = 0; // "Newly created debt" trend

    invoices.forEach(inv => {
      const total = parseFloat(inv.total) || 0;
      const status = (inv.status || '').toLowerCase();
      const created = new Date(inv.createdAt);
      
      // 1. Total Aggregates
      if (status === 'paid') {
        totalSales += total;
        
        // Aggregate Monthly Sales for Chart
        const monthKey = `${created.getFullYear()}-${(created.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + total;

      } else if (['pending', 'overdue', 'draft'].includes(status)) {
        outstandingAR += total;
        if (status === 'overdue') overdueCount++;
        if (status === 'pending') pendingCount++;
      }

      // 2. Trend Bucket Accumulation
      if (created >= thirtyDaysAgo) {
          // Current 30 Days
          invoicesCurrent++;
          if (status === 'paid') revenueCurrent += total;
          if (status === 'pending' || status === 'overdue') arCurrent += total;
      } else if (created >= sixtyDaysAgo && created < thirtyDaysAgo) {
          // Previous 30 Days
          invoicesPrev++;
          if (status === 'paid') revenuePrev += total;
          if (status === 'pending' || status === 'overdue') arPrev += total;
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

    // Helper to calc growth %
    const calcGrowth = (current, prev) => {
        if (prev === 0) return current > 0 ? 100 : 0;
        return ((current - prev) / prev) * 100;
    };

    const trends = {
        revenue: calcGrowth(revenueCurrent, revenuePrev),
        invoices: calcGrowth(invoicesCurrent, invoicesPrev),
        ar: calcGrowth(arCurrent, arPrev),
        lowStock: 0 // Placeholder or remove trend for stock
    };

    // Calculate Inventory Value
    products.forEach(p => {
        const val = (p.stock || 0) * (p.costPrice || p.price || 0);
        inventoryValue += val;
    });

    const lowStockCount = products.filter(p => (p.stock || 0) < (p.lowStockThreshold || 5)).length;

    // Filter and sort low stock products for the dashboard alert
    const lowStockProducts = products
        .filter(p => (p.stock || 0) < (p.lowStockThreshold || 5))
        .sort((a, b) => (a.stock || 0) - (b.stock || 0))
        .slice(0, 6); // Limit to top 6 for display

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
        totalUsers,
        lowStockCount,
        inventoryValue, // New field
        lowStockProducts, 
        topSellingProducts,
        monthlySales,
        trends // NEW: Include trends
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get sales report
router.get('/sales', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
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

// Get Payment Distribution (Sales Pie Chart)
router.get('/payment-distribution', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
    const { period } = req.query; // 'daily', 'weekly', 'monthly', 'yearly'
    const now = new Date();
    let startDate = new Date();

    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      // Start of current week (Sunday)
      const day = now.getDay(); 
      const diff = now.getDate() - day; 
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // Default to Monthly
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const invoices = await Invoice.find({
      status: 'paid',
      createdAt: { $gte: startDate }
    });

    const distribution = {
      cash: 0,
      card: 0,
      upi: 0,
      bank_transfer: 0,
      cheque: 0
    };

    invoices.forEach(inv => {
      const type = (inv.paymentType || 'cash').toLowerCase().replace(' ', '_');
      // Normalize keys if needed, but existing enum is snake_case likely or lowercase.
      // Invoice model says: enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque']
      if (distribution.hasOwnProperty(type)) {
        distribution[type] += (inv.total || 0);
      } else {
        // Fallback for any other types or legacy
        distribution['cash'] += (inv.total || 0); 
      }
    });

    res.json(distribution);

  } catch (error) {
    console.error('Error fetching payment distribution:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get Sales Trend for Bar Chart
router.get('/sales-trend', auth, async (req, res) => {
  try {
    const { Invoice } = req.tenantModels;
    const { period } = req.query; // 'daily', 'weekly', 'monthly', 'yearly'
    const now = new Date();
    let startDate = new Date();
    let labels = [];
    let dataMap = {};
    
    // Determine Start Date and Labels
    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
      // Labels: 00:00, 01:00, ... 23:00
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        labels.push(hour);
        dataMap[i] = 0;
      }
    } else if (period === 'weekly') {
        // Last 7 days or Calendar Week? Usually "This Week"
        const day = now.getDay(); 
        const diff = now.getDate() - day; // day 0 is Sunday
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        labels = days;
        days.forEach((d, i) => dataMap[i] = 0);
    } else if (period === 'monthly') {
        // Current Month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            labels.push(i.toString());
            dataMap[i] = 0;
        }
    } else if (period === 'yearly') {
        // Current Year
        startDate = new Date(now.getFullYear(), 0, 1);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        labels = months;
        months.forEach((m, i) => dataMap[i] = 0);
    } else {
        // Default Monthly
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            labels.push(i.toString());
            dataMap[i] = 0;
        }
    }

    const invoices = await Invoice.find({
      status: 'paid',
      createdAt: { $gte: startDate }
    });

    // Populate Data Map
    invoices.forEach(inv => {
        const d = new Date(inv.createdAt);
        const total = inv.total || 0;

        if (period === 'daily') {
            const hour = d.getHours();
            if (dataMap.hasOwnProperty(hour)) dataMap[hour] += total;
        } else if (period === 'weekly') {
            const day = d.getDay();
            if (dataMap.hasOwnProperty(day)) dataMap[day] += total;
        } else if (period === 'monthly') {
            const date = d.getDate();
            if (dataMap.hasOwnProperty(date)) dataMap[date] += total;
        } else if (period === 'yearly') {
            const month = d.getMonth();
            if (dataMap.hasOwnProperty(month)) dataMap[month] += total;
        }
    });

    const data = Object.values(dataMap);
    // For object keys like 0, 1, 2... Object.values might not guarantee order if keys are mixed strings/nums?
    // Actually JS objects with integer-like keys are ordered by key. 
    // But for safety, let's map from known indices.
    
    let finalData = [];
    if (period === 'daily') {
        for(let i=0; i<24; i++) finalData.push(dataMap[i]);
    } else if (period === 'weekly') {
        for(let i=0; i<7; i++) finalData.push(dataMap[i]);
    } else if (period === 'monthly') {
        const daysInMonth = labels.length;
        for(let i=1; i<=daysInMonth; i++) finalData.push(dataMap[i]);
    } else if (period === 'yearly') {
        for(let i=0; i<12; i++) finalData.push(dataMap[i]);
    } else {
        finalData = Object.values(dataMap);
    }

    res.json({ labels, data: finalData });

  } catch (error) {
    console.error('Error fetching sales trend:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;