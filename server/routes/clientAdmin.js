import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Organization from '../models/master/Organization.js';
import Tenant from '../models/master/Tenant.js';
import { getTenantDB } from '../utils/tenantManager.js';
import { logActivity } from '../services/activityLogger.js';

const router = express.Router();

// Middleware: Verify Token is for a Client Admin
const requireClientAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if role is client-admin
        if (decoded.role !== 'client-admin') {
             return res.status(403).json({ message: 'Access denied: Client Admins only' });
        }

        const org = await Organization.findById(decoded.id);
        if (!org) return res.status(401).json({ message: 'Organization not found' });

        req.clientAdmin = org; // Attach org to request
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// ==========================================
// AUTHENTICATION
// ==========================================

// POST /api/client-admin/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find Organization
        const org = await Organization.findOne({ ownerEmail: email });
        if (!org) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Verify Password
        if (!org.password) {
             return res.status(401).json({ message: 'Account setup incomplete. Please contact Super Admin to reset password.' });
        }
        const isMatch = await bcrypt.compare(password, org.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Check Plan Type - RESTORED restriction
        if (org.planType !== 'organization') {
             return res.status(403).json({ message: 'Your plan does not support the Owner Panel. Please use Staff Login.' });
        }

        // CHECK STATUS: Prevent login if inactive
        if (org.status !== 'active') {
             return res.status(403).json({ message: 'Your account has been deactivated. Please contact Super Admin.' });
        }

        // Generate Token
        const token = jwt.sign(
            { id: org._id, role: 'client-admin', name: org.name },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '12h' }
        );

        res.json({
            token,
            user: {
                id: org._id,
                name: org.name,
                email: org.ownerEmail,
                role: 'client-admin',
                planType: org.planType
            }
        });
        
        // Log Activity (We construct req.user manually since it's a login route)
        logActivity({
            req: { user: { id: org._id, name: org.name, email: org.ownerEmail, role: 'client-admin' } },
            action: 'LOGIN',
            module: 'AUTH',
            description: `Client Admin Login: ${org.name}`,
            targetId: org._id
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// DASHBOARD DATA
// ==========================================

// GET /api/client-admin/branches
router.get('/branches', requireClientAdmin, async (req, res) => {
    try {
        const tenants = await Tenant.find({ organizationId: req.clientAdmin._id });
        res.json(tenants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/client-admin/dashboard-stats
router.get('/dashboard-stats', requireClientAdmin, async (req, res) => {
    try {
        const orgId = req.clientAdmin._id;
        const tenants = await Tenant.find({ organizationId: orgId, status: 'active' });

        const emptyStats = {
            totalRevenue: 0,
            totalOutstanding: 0,
            totalInvoices: 0,
            totalCustomers: 0,
            totalProducts: 0,
            lowStockCount: 0,
            inventoryValue: 0,
            totalUsers: 0,
            totalAdmins: 0,
            totalStaff: 0,
            branchCount: 0,
            branchDetails: [],
            charts: {
                paymentMethods: {},
                salesTrend: {}
            }
        };

        if (tenants.length === 0) return res.json(emptyStats);

        let totalRevenue = 0;
        let totalOutstanding = 0;
        let totalInvoices = 0;
        
        let totalCustomers = 0;
        let totalProducts = 0;
        let lowStockCount = 0;
        let inventoryValue = 0;
        
        let totalUsers = 0;
        let totalAdmins = 0;
        let totalStaff = 0;

        const globalPaymentMethods = {};
        const globalSalesTrend = {}; // Key: "Jan 2024", Value: 1000

        const branchStats = [];

        const statsPromises = tenants.map(async (tenant) => {
            try {
                const { models } = await getTenantDB(tenant.slug);
                const { Invoice, Customer, Product, User } = models;

                // 1. Invoice Stats (Revenue, Outstanding, Count, Payments, Sales)
                const invoiceAgg = await Invoice.aggregate([
                    { $match: { isDeleted: { $ne: true } } },
                    {
                        $group: {
                            _id: null,
                            revenue: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
                            outstanding: { $sum: { $cond: [{ $in: ["$status", ["pending", "overdue"]] }, "$total", 0] } },
                            count: { $sum: 1 }
                        }
                    }
                ]);

                // Payment Methods
                const paymentAgg = await Invoice.aggregate([
                    { $match: { isDeleted: { $ne: true }, status: 'paid' } },
                    { $group: { _id: "$paymentType", amount: { $sum: "$total" } } }
                ]);

                // Monthly Sales Trend (Last 6 Months)
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                
                const salesAgg = await Invoice.aggregate([
                    { $match: { isDeleted: { $ne: true }, status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
                    {
                        $group: {
                            _id: { 
                                month: { $month: "$createdAt" }, 
                                year: { $year: "$createdAt" } 
                            },
                            total: { $sum: "$total" }
                        }
                    }
                ]);

                // 2. Product Stats (Count, Low Stock, Inventory Value)
                const productAgg = await Product.aggregate([
                    { $match: { isDeleted: { $ne: true } } },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                            lowStock: { 
                                $sum: { 
                                    $cond: [{ $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 10] }] }, 1, 0] 
                                } 
                            },
                            inventoryValue: { $sum: { $multiply: ["$stock", { $ifNull: ["$costPrice", "$price"] }] } }
                        }
                    }
                ]);

                // 3. Counts
                const customerCount = await Customer.countDocuments({ isDeleted: { $ne: true } });
                const staffCount = await User.countDocuments({ role: 'staff' });
                const adminCount = await User.countDocuments({ role: 'admin' });

                const invData = invoiceAgg[0] || { revenue: 0, outstanding: 0, count: 0 };
                const prodData = productAgg[0] || { count: 0, lowStock: 0, inventoryValue: 0 };

                // Aggregate locally for this branch
                return {
                    name: tenant.name,
                    slug: tenant.slug,
                    revenue: invData.revenue,
                    outstanding: invData.outstanding,
                    invoiceCount: invData.count,
                    customers: customerCount,
                    products: prodData.count,
                    lowStock: prodData.lowStock,
                    inventoryVal: prodData.inventoryValue,
                    users: { staff: staffCount, admin: adminCount },
                    payments: paymentAgg,
                    sales: salesAgg
                };

            } catch (err) {
                 return { name: tenant.name, slug: tenant.slug, error: true };
            }
        });

        const results = await Promise.all(statsPromises);

        results.forEach(r => {
            if (!r.error) {
                totalRevenue += r.revenue;
                totalOutstanding += r.outstanding;
                totalInvoices += r.invoiceCount;
                totalCustomers += r.customers;
                totalProducts += r.products;
                lowStockCount += r.lowStock;
                inventoryValue += r.inventoryVal;
                totalStaff += r.users.staff;
                totalAdmins += r.users.admin;

                // Merge Payment Methods
                r.payments.forEach(p => {
                    const type = p._id || 'Unknown';
                    globalPaymentMethods[type] = (globalPaymentMethods[type] || 0) + p.amount;
                });

                // Merge Sales Trend
                r.sales.forEach(s => {
                    // Create key like "Jan 2024"
                    const date = new Date(s._id.year, s._id.month - 1);
                    const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    globalSalesTrend[key] = (globalSalesTrend[key] || 0) + s.total;
                });
            }
            branchStats.push(r);
        });

        totalUsers = totalStaff + totalAdmins;

        // Process Charts for Frontend
        // Sort sales trend by date
        const sortedSalesKeys = Object.keys(globalSalesTrend).sort((a, b) => new Date(a) - new Date(b));
        const salesChartData = sortedSalesKeys.map(k => ({ name: k, amount: globalSalesTrend[k] }));

        const paymentChartData = Object.keys(globalPaymentMethods).map(k => ({ name: k, value: globalPaymentMethods[k] }));

        res.json({
            organizationName: req.clientAdmin.name,
            branchCount: tenants.length,
            stats: {
                totalRevenue,
                totalOutstanding,
                totalInvoices,
                totalCustomers,
                totalProducts,
                lowStockCount,
                inventoryValue,
                totalUsers,
                totalAdmins,
                totalStaff
            },
            branchDetails: branchStats, // Contains individual branch heavy data if needed, or summary
            charts: {
                salesData: salesChartData,
                paymentData: paymentChartData
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// SPECIFIC BRANCH DATA
// ==========================================

// Middleware helper to validate branch ownership
const validateBranchOwnership = async (req, res, next) => {
    try {
        const { tenantId } = req.params;
        const tenant = await Tenant.findOne({ slug: tenantId, organizationId: req.clientAdmin._id });
        
        if (!tenant) {
            return res.status(403).json({ message: 'Access denied: This branch does not belong to your organization.' });
        }
        
        req.targetTenant = tenant;
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/client-admin/branch/:tenantId/dashboard
router.get('/branch/:tenantId/dashboard', requireClientAdmin, validateBranchOwnership, async (req, res) => {
    try {
        const { models } = await getTenantDB(req.targetTenant.slug);
        const { Invoice, Product, Customer, User } = models;

        // 1. Stats Aggregation
        const invoiceAgg = await Invoice.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
                    outstanding: { $sum: { $cond: [{ $in: ["$status", ["pending", "overdue"]] }, "$total", 0] } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const productAgg = await Product.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    lowStock: { 
                        $sum: { 
                            $cond: [{ $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 10] }] }, 1, 0] 
                        } 
                    },
                    inventoryValue: { $sum: { $multiply: ["$stock", { $ifNull: ["$costPrice", "$price"] }] } }
                }
            }
        ]);

        const customerCount = await Customer.countDocuments({ isDeleted: { $ne: true } });
        const staffCount = await User.countDocuments({ role: 'staff' });
        const adminCount = await User.countDocuments({ role: 'admin' });

        const invStats = invoiceAgg[0] || { revenue: 0, outstanding: 0, count: 0 };
        const prodStats = productAgg[0] || { count: 0, lowStock: 0, inventoryValue: 0 };

        // 2. Charts Data
        // Payment Methods
        const paymentAgg = await Invoice.aggregate([
            { $match: { isDeleted: { $ne: true }, status: 'paid' } },
            { $group: { _id: "$paymentType", amount: { $sum: "$total" } } }
        ]);
        const paymentData = paymentAgg.map(p => ({ name: p._id || 'Unknown', value: p.amount }));

        // Sales Trend (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const salesAgg = await Invoice.aggregate([
            { $match: { isDeleted: { $ne: true }, status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    total: { $sum: "$total" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        const salesData = salesAgg.map(s => {
             const date = new Date(s._id.year, s._id.month - 1);
             return {
                 name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                 amount: s.total
             };
        });


        // 3. Lists
        const recentInvoices = await Invoice.find({ isDeleted: { $ne: true } })
            .sort({ createdAt: -1 }).limit(5).select('invoiceNumber customerName date total status');
        
        const topProducts = await Product.find({ isDeleted: { $ne: true } })
            .sort({ sold: -1 }).limit(5).select('name sku price stock sold');
        
        const recentCustomers = await Customer.find({ isDeleted: { $ne: true } })
            .sort({ createdAt: -1 }).limit(5).select('name email phone');

        res.json({
            stats: {
                totalRevenue: invStats.revenue,
                totalOutstanding: invStats.outstanding,
                totalInvoices: invStats.count,
                totalProducts: prodStats.count,
                totalCustomers: customerCount,
                lowStockCount: prodStats.lowStock,
                inventoryValue: prodStats.inventoryValue,
                users: {
                    total: staffCount + adminCount,
                    staff: staffCount,
                    admin: adminCount
                }
            },
            charts: {
                salesData,
                paymentData
            },
            recentInvoices,
            topProducts,
            recentCustomers
        });

    } catch (error) {
        console.error('Branch Dashboard Error:', error);
        res.status(500).json({ message: 'Failed to fetch branch data' });
    }
});

// GET /api/client-admin/branch/:tenantId/invoices
router.get('/branch/:tenantId/invoices', requireClientAdmin, validateBranchOwnership, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status } = req.query;
        const { models } = await getTenantDB(req.targetTenant.slug);
        const { Invoice } = models;

        const query = { isDeleted: { $ne: true } };
        
        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { invoiceNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } }
            ];
        }

        const invoices = await Invoice.find(query)
            .sort({ createdAt: -1 })
            .populate('customer', 'name email phone')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Invoice.countDocuments(query);

        res.json({
            invoices,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            totalInvoices: total
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch invoices' });
    }
});

// GET /api/client-admin/branch/:tenantId/products
router.get('/branch/:tenantId/products', requireClientAdmin, validateBranchOwnership, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', category = '' } = req.query;
        const { models } = await getTenantDB(req.targetTenant.slug);
        const { Product } = models;

        const query = { isDeleted: { $ne: true } };
        if (search) {
             query.name = { $regex: search, $options: 'i' };
        }
        if (category) {
            query.category = category;
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Product.countDocuments(query);

        res.json({
            products,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            totalProducts: total
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch products' });
    }
});

// GET /api/client-admin/branch/:tenantId/categories
router.get('/branch/:tenantId/categories', requireClientAdmin, validateBranchOwnership, async (req, res) => {
    try {
        const { models } = await getTenantDB(req.targetTenant.slug);
        const { Product } = models;
        const categories = await Product.distinct('category', { isDeleted: { $ne: true } });
        res.json(categories.filter(c => c)); // Remove null/empty
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
});

// GET /api/client-admin/branch/:tenantId/export/:type
// type = 'invoices' | 'products'
router.get('/branch/:tenantId/export/:type', requireClientAdmin, validateBranchOwnership, async (req, res) => {
    try {
        const { type } = req.params;
        const { models } = await getTenantDB(req.targetTenant.slug);
        
        let data = [];
        let fields = [];

        if (type === 'invoices') {
            const invoices = await models.Invoice.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
            // Flatten/Format for CSV
            data = invoices.map(inv => ({
                InvoiceNumber: inv.invoiceNumber,
                Date: new Date(inv.createdAt).toLocaleDateString(),
                Customer: inv.customerName,
                Total: inv.total,
                Status: inv.status,
                Items: inv.items.length
            }));
            fields = ['InvoiceNumber', 'Date', 'Customer', 'Total', 'Status', 'Items'];
        } else if (type === 'products') {
            const products = await models.Product.find({ isDeleted: { $ne: true } });
            data = products.map(p => ({
                Name: p.name,
                SKU: p.sku,
                Price: p.price,
                Stock: p.stock,
                Sold: p.sold || 0,
                Category: p.category
            }));
            fields = ['Name', 'SKU', 'Price', 'Stock', 'Sold', 'Category'];
        } else {
            return res.status(400).json({ message: 'Invalid export type' });
        }

        res.json({
            fileName: `${req.targetTenant.slug}-${type}-${Date.now()}.csv`,
            fields,
            data
        });

    } catch (error) {
         res.status(500).json({ message: 'Export failed' });
    }
});

// GET /api/client-admin/activity-logs
// GET /api/client-admin/activity-logs
router.get('/activity-logs', requireClientAdmin, async (req, res) => {
    try {
        console.log('Fetching Activity Logs. Query:', req.query);
        const { page = 1, limit = 20, module, action, search, slug, startDate, endDate } = req.query;
        
        // Helper to build query
        const buildQuery = () => {
             const q = {};
             if (module) q.module = module;
             if (action) q.action = action;
             if (search) q.description = { $regex: search, $options: 'i' };
             if (startDate || endDate) {
                q.timestamp = {};
                if (startDate) q.timestamp.$gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    q.timestamp.$lte = end;
                }
             }
             return q;
        };

        // If specific branch selected
        if (slug) {
             console.log('Filtering by branch slug:', slug);
             // Verify ownership
             // Fix: Use Tenant model, NOT Branch
             const branch = await Tenant.findOne({ slug, organizationId: req.clientAdmin._id });
             if (!branch) {
                 console.log('Branch not found or denied:', slug);
                 return res.status(403).json({ message: 'Access denied' });
             }

             const { models } = await getTenantDB(slug);
             const { ActivityLog } = models;
             const query = buildQuery();

             const logs = await ActivityLog.find(query)
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .populate('performedBy', 'name email'); // Populate if user ref exists
            
             const total = await ActivityLog.countDocuments(query);

             return res.json({
                 logs,
                 totalPages: Math.ceil(total / limit),
                 currentPage: parseInt(page),
                 totalCount: total
             });
        }

        // AGGREGATION MODE (All branches)
        // 1. Get all branches for this org
        console.log('Aggregating logs from all branches for Org:', req.clientAdmin._id);
        const branches = await Tenant.find({ organizationId: req.clientAdmin._id, status: 'active' });
        
        let allLogs = [];
        const query = buildQuery();

        // 2. Fetch recent logs from each branch
        for (const branch of branches) {
            try {
                const { models } = await getTenantDB(branch.slug);
                const { ActivityLog } = models;
                
                // Add tenant info to display in aggregated view
                const branchLogs = await ActivityLog.find(query)
                    .sort({ timestamp: -1 })
                    .limit(parseInt(limit) * parseInt(page)) 
                    .lean(); 
                
                // Attach branch name for UI context
                const enrichedLogs = branchLogs.map(log => ({
                    ...log,
                    tenantName: branch.name,
                    tenantSlug: branch.slug
                }));
                
                allLogs = [...allLogs, ...enrichedLogs];
            } catch (e) {
                console.error(`Failed to fetch logs from ${branch.slug}`, e);
            }
        }

        // 3. Sort merged logs
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // 4. Paginate in memory
        const startIndex = (page - 1) * limit;
        const slicedLogs = allLogs.slice(startIndex, startIndex + parseInt(limit));
        
        res.json({
            logs: slicedLogs,
            totalPages: Math.ceil(allLogs.length / limit), 
            currentPage: parseInt(page),
            totalCount: allLogs.length
        });

    } catch (error) {
        console.error('Activity Log Error:', error);
        res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
});

export default router;
