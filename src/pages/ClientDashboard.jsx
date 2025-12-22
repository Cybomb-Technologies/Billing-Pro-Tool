import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { 
    BarChart2, GitBranch, LogOut, ShieldCheck, BarChart3,
    Users, Package, AlertTriangle, Wallet, UserCheck, UserCog, Eye, Activity
} from 'lucide-react';
import { ActivityLogTable } from '../components/ActivityLogTable';
import { useAuth } from '../context/AuthContext'; 
import { API_BASE_URL } from '../config';

// Shared Dashboard Components
import { StatCard } from '../components/dashboard/StatCard';
import { SalesChart } from '../components/dashboard/SalesChart';
import { PaymentChart } from '../components/dashboard/PaymentChart';

const ClientDashboard = () => {
    const { logout } = useAuth();
    
    // Original State
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [branchData, setBranchData] = useState(null);
    const [branchLoading, setBranchLoading] = useState(false);

    // New State for Lists
    const [invoiceList, setInvoiceList] = useState(null);
    const [productList, setProductList] = useState(null);
    const [listLoading, setListLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [showInvoiceModal, setShowInvoiceModal] = useState(null);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/client-admin/dashboard-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }

            const data = await response.json();
            setStats(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Failed to load dashboard data');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Effect: Select first branch by default when stats load
    useEffect(() => {
        if (stats?.branchDetails?.length > 0 && !selectedBranch) {
            setSelectedBranch(stats.branchDetails[0].slug);
        }
    }, [stats]);

    // Effect: Fetch branch data when selectedBranch or activeTab changes
    useEffect(() => {
        if (!selectedBranch) return;

        if (activeTab === 'branches') {
             fetchBranchData(selectedBranch);
        } else if (activeTab === 'invoices') {
             fetchBranchData(selectedBranch); // Fetch for stats
             fetchInvoices(selectedBranch, currentPage, searchQuery, selectedStatus);
        } else if (activeTab === 'inventory') {
             fetchBranchData(selectedBranch); // Fetch for stats
             fetchProducts(selectedBranch, currentPage, searchQuery, selectedCategory);
             fetchCategories(selectedBranch);
        }
    }, [selectedBranch, activeTab, currentPage, searchQuery, selectedCategory, selectedStatus]);

    // Reset pagination/search when tab or branch changes
    useEffect(() => {
         setCurrentPage(1);
         setSearchQuery('');
         setSelectedCategory('');
         setSelectedStatus('all');
         setInvoiceList(null);
         setProductList(null);
    }, [activeTab, selectedBranch]);


    const fetchBranchData = async (slug) => {
        setBranchLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/client-admin/branch/${slug}/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load branch data');
            const data = await res.json();
            setBranchData(data);
        } catch (err) {
            console.error(err);
        } finally {
            setBranchLoading(false);
        }
    };

    const fetchInvoices = async (slug, page, search, status = '') => {
        setListLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/client-admin/branch/${slug}/invoices?page=${page}&limit=20&search=${search}`;
            if (status && status !== 'all') url += `&status=${status}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load invoices');
            const data = await res.json();
            setInvoiceList(data);
        } catch (err) {
            console.error(err);
        } finally {
            setListLoading(false);
        }
    };

    const fetchProducts = async (slug, page, search, category = '') => {
        setListLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/client-admin/branch/${slug}/products?page=${page}&limit=20&search=${search}`;
            if (category) url += `&category=${encodeURIComponent(category)}`;
            
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load products');
            const data = await res.json();
            setProductList(data);
        } catch (err) {
            console.error(err);
        } finally {
            setListLoading(false);
        }
    };

    const fetchCategories = async (slug) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/client-admin/branch/${slug}/categories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (err) {
            console.error(err);
        }
    };


    const handleExport = async (type) => {
        if (!selectedBranch) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/client-admin/branch/${selectedBranch}/export/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Export failed');
            const { fileName, fields, data } = await res.json();
            
            // Simple CSV generation
            const header = fields.join(',') + '\n';
            const rows = data.map(row => fields.map(field => `"${row[field]}"`).join(',')).join('\n');
            const blob = new Blob([header + rows], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
        } catch (error) {
            alert('Failed to export data');
        }
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
            {/* Header */}
            <div className="bg-white shadow-sm py-3 mb-4 sticky-top">
                <Container fluid>
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <ShieldCheck className="text-primary" size={32} />
                            <div>
                                <h4 className="mb-0 fw-bold text-dark">Organization Admin</h4>
                                <small className="text-muted fw-semibold">{stats?.organizationName}</small>
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                             <Button 
                                variant={activeTab === 'overview' ? 'dark' : 'outline-secondary'} 
                                size="sm" 
                                onClick={() => setActiveTab('overview')}
                             >
                                 <BarChart3 size={16} className="me-2"/>Overview
                             </Button>
                             <Button 
                                variant={activeTab === 'branches' ? 'dark' : 'outline-secondary'} 
                                size="sm" 
                                onClick={() => setActiveTab('branches')}
                             >
                                 <GitBranch size={16} className="me-2"/>Branch Details
                             </Button>
                             <Button 
                                variant={activeTab === 'invoices' ? 'dark' : 'outline-secondary'} 
                                size="sm" 
                                onClick={() => setActiveTab('invoices')}
                             >
                                 <Wallet size={16} className="me-2"/>Invoices
                             </Button>
                             <Button 
                                variant={activeTab === 'inventory' ? 'dark' : 'outline-secondary'} 
                                size="sm" 
                                onClick={() => setActiveTab('inventory')}
                             >
                                 <Package size={16} className="me-2"/>Inventory
                             </Button>
                             <Button 
                                variant={activeTab === 'activity-logs' ? 'dark' : 'outline-secondary'} 
                                size="sm" 
                                onClick={() => setActiveTab('activity-logs')}
                             >
                                 <Activity size={16} className="me-2"/>Logs
                             </Button>
                             <div className="vr mx-2"></div>
                            <Button variant="outline-danger" size="sm" onClick={logout}>
                                <LogOut size={16} className="me-2" /> Logout
                            </Button>
                        </div>
                    </div>
                </Container>
            </div>

            <Container fluid className="px-4">
                {error && <Alert variant="danger">{error}</Alert>}

                {activeTab === 'overview' && stats && stats.stats && (
                    <div className="animation-fade-in">
                         {/* 1. KEY METRICS ROW */}
                        <Row className="mb-4 g-3">
                            <Col md={3}>
                                <StatCard 
                                    title="Total Revenue" 
                                    value={formatMoney(stats.stats.totalRevenue)} 
                                    subtext="Across all branches" 
                                    icon={Wallet} 
                                    color="primary" 
                                />
                            </Col>
                            <Col md={3}>
                                <StatCard 
                                    title="Outstanding" 
                                    value={formatMoney(stats.stats.totalOutstanding)} 
                                    subtext="Pending Collection" 
                                    icon={AlertTriangle} 
                                    color="primary" 
                                />
                            </Col>
                             <Col md={3}>
                                <StatCard 
                                    title="Inventory Value" 
                                    value={formatMoney(stats.stats.inventoryValue)} 
                                    subtext="Total Stock Assets" 
                                    icon={Package} 
                                    color="primary" 
                                />
                            </Col>
                            <Col md={3}>
                                <StatCard 
                                    title="Active Branches" 
                                    value={stats.branchCount} 
                                    subtext="Operational Units" 
                                    icon={GitBranch} 
                                    color="primary" 
                                />
                            </Col>
                        </Row>

                        {/* 2. SECONDARY METRICS ROW */}
                        <Row className="mb-4 g-3">
                            <Col md={2}>
                                <StatCard title="Total Invoices" value={stats.stats.totalInvoices} icon={BarChart2} color="primary" />
                            </Col>
                            <Col md={2}>
                                <StatCard title="Customers" value={stats.stats.totalCustomers} icon={Users} color="primary" />
                            </Col>
                            <Col md={2}>
                                <StatCard title="Products" value={stats.stats.totalProducts} icon={Package} color="primary" />
                            </Col>
                            <Col md={2}>
                                <StatCard title="Low Stock" value={stats.stats.lowStockCount} icon={AlertTriangle} color="primary" />
                            </Col>
                            <Col md={2}>
                                <StatCard title="Staff" value={stats.stats.totalStaff} icon={UserCheck} color="primary" />
                            </Col>
                             <Col md={2}>
                                <StatCard title="Admins" value={stats.stats.totalAdmins} icon={UserCog} color="primary" />
                            </Col>
                        </Row>

                        {/* 3. CHARTS ROW */}
                        <Row className="mb-4 g-4">
                            <Col md={8}>
                                <SalesChart data={stats.charts?.salesData} />
                            </Col>
                            <Col md={4}>
                                <PaymentChart data={stats.charts?.paymentData} />
                            </Col>
                        </Row>

                        {/* 4. BRANCH LIST */}
                        <Card className="border-0 shadow-sm">
                            <Card.Header className="bg-white py-3 border-bottom">
                                <h6 className="mb-0 fw-bold">Branch Performance Summary</h6>
                            </Card.Header>
                            <div className="table-responsive">
                                <Table hover className="align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Branch Name</th>
                                            <th className="text-end">Revenue</th>
                                            <th className="text-end">Outstanding</th>
                                            <th className="text-center">Invoices</th>
                                            <th className="text-center">Products</th>
                                            <th className="text-center">Inventory Val</th>
                                            <th className="text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.branchDetails.map((branch, idx) => (
                                            <tr key={idx}>
                                                <td className="fw-medium">{branch.name} <br/> <small className="text-muted">{branch.slug}</small></td>
                                                <td className="text-end fw-bold text-success">{formatMoney(branch.revenue)}</td>
                                                <td className="text-end text-danger">{formatMoney(branch.outstanding)}</td>
                                                <td className="text-center">{branch.invoiceCount}</td>
                                                <td className="text-center">{branch.products}</td>
                                                <td className="text-center text-muted">{formatMoney(branch.inventoryVal)}</td>
                                                <td className="text-center">
                                                    {branch.error ? 
                                                        <Badge bg="danger">Offline</Badge> : 
                                                        <Badge bg="success">Active</Badge>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'branches' && (
                    <div className="animation-fade-in">
                        {/* Toolbar */}
                        <Card className="mb-4 border-0 shadow-sm">
                            <Card.Body className="d-flex flex-wrap gap-3 align-items-center justify-content-between p-3">
                                <div className="d-flex align-items-center gap-2" style={{minWidth: '300px'}}>
                                    <label className="fw-bold text-muted small text-nowrap">Select Branch:</label>
                                    <Form.Select 
                                        value={selectedBranch} 
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        className="fw-bold bg-light border-0"
                                    >
                                        {stats?.branchDetails?.map(b => (
                                            <option key={b.slug} value={b.slug}>{b.name} ({b.slug})</option>
                                        ))}
                                    </Form.Select>
                                </div>
                                <div className="d-flex gap-2">
                                    <Button variant="outline-success" size="sm" onClick={() => handleExport('invoices')} disabled={!branchData}>
                                        <BarChart2 size={16} className="me-2" /> Export Invoices
                                    </Button>
                                    <Button variant="outline-primary" size="sm" onClick={() => handleExport('products')} disabled={!branchData}>
                                        <Package size={16} className="me-2" /> Export Products
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>

                        {/* Branch Content */}
                        {branchLoading ? (
                            <div className="text-center py-5">
                                 <Spinner animation="border" variant="secondary" />
                            </div>
                        ) : branchData ? (
                            <>
                                {/* 1. KEY STATS */}
                                <Row className="mb-4 g-3">
                                    <Col md={3}>
                                        <StatCard 
                                            title="Revenue" 
                                            value={formatMoney(branchData.stats.totalRevenue)} 
                                            icon={Wallet} 
                                            color="primary" 
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <StatCard 
                                            title="Outstanding" 
                                            value={formatMoney(branchData.stats.totalOutstanding)} 
                                            icon={AlertTriangle} 
                                            color="primary" 
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <StatCard 
                                            title="Customers" 
                                            value={branchData.stats.totalCustomers} 
                                            icon={Users} 
                                            color="primary" 
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <StatCard 
                                            title="Inventory Value" 
                                            value={formatMoney(branchData.stats.inventoryValue)} 
                                            icon={Package} 
                                            color="primary" 
                                        />
                                    </Col>
                                </Row>

                                {/* 2. SECONDARY STATS */}
                                <Row className="mb-4 g-3">
                                    <Col md={3}>
                                        <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center">
                                            <span className="text-muted small fw-bold">TOTAL PRODUCTS</span>
                                            <span className="fw-bold h5 mb-0">{branchData.stats.totalProducts}</span>
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center border-start border-4 border-warning">
                                            <span className="text-muted small fw-bold">LOW STOCK ITEMS</span>
                                            <span className="fw-bold h5 mb-0 text-warning">{branchData.stats.lowStockCount}</span>
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center">
                                            <span className="text-muted small fw-bold">STAFF USERS</span>
                                            <span className="fw-bold h5 mb-0">{branchData.stats.users?.staff}</span>
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="bg-white p-3 rounded shadow-sm d-flex justify-content-between align-items-center">
                                            <span className="text-muted small fw-bold">ADMIN USERS</span>
                                            <span className="fw-bold h5 mb-0">{branchData.stats.users?.admin}</span>
                                        </div>
                                    </Col>
                                </Row>

                                {/* 3. CHARTS */}
                                <Row className="mb-4 g-4">
                                    <Col md={8}>
                                        <SalesChart data={branchData.charts?.salesData} title="Branch Sales Performance" />
                                    </Col>
                                    <Col md={4}>
                                        <PaymentChart data={branchData.charts?.paymentData} title="Payment Distribution" />
                                    </Col>
                                </Row>

                                {/* 4. TABLES */}
                                <Row className="g-4">
                                    <Col md={6}>
                                        <Card className="border-0 shadow-sm h-100">
                                            <Card.Header className="bg-white py-3 border-bottom">
                                                <h6 className="mb-0 fw-bold">Recent Invoices</h6>
                                            </Card.Header>
                                            <Table hover className="mb-0 small align-middle">
                                                <thead className="bg-light">
                                                    <tr><th>Inv #</th><th>Date</th><th>Customer</th><th>Total</th></tr>
                                                </thead>
                                                <tbody>
                                                    {branchData.recentInvoices.map((inv, i) => (
                                                        <tr key={i}>
                                                            <td>{inv.invoiceNumber}</td>
                                                            <td>{new Date(inv.date).toLocaleDateString()}</td>
                                                            <td className="text-truncate" style={{maxWidth: '100px'}}>{inv.customerName}</td>
                                                            <td className="fw-bold">{formatMoney(inv.total)}</td>
                                                        </tr>
                                                    ))}
                                                    {branchData.recentInvoices.length === 0 && <tr><td colSpan="4" className="text-center py-3">No data</td></tr>}
                                                </tbody>
                                            </Table>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card className="border-0 shadow-sm h-100">
                                            <Card.Header className="bg-white py-3 border-bottom">
                                                <h6 className="mb-0 fw-bold">Top Products</h6>
                                            </Card.Header>
                                            <Table hover className="mb-0 small align-middle">
                                                <thead className="bg-light">
                                                    <tr><th>Product</th><th>Price</th><th>Stock</th><th>Sold</th></tr>
                                                </thead>
                                                <tbody>
                                                    {branchData.topProducts.map((p, i) => (
                                                        <tr key={i}>
                                                            <td className="text-truncate" style={{maxWidth: '120px'}}>{p.name}</td>
                                                            <td>{formatMoney(p.price)}</td>
                                                            <td>{p.stock}</td>
                                                            <td className="fw-bold text-success">{p.sold || 0}</td>
                                                        </tr>
                                                    ))}
                                                    {branchData.topProducts.length === 0 && <tr><td colSpan="4" className="text-center py-3">No data</td></tr>}
                                                </tbody>
                                            </Table>
                                        </Card>
                                    </Col>
                                </Row>
                            </>
                        ) : (
                             <div className="text-center py-5 text-muted">
                                 Select a branch to view details.
                             </div>
                        )}
                    </div>
                )}

                {/* --- TAB: INVOICES --- */}
                {activeTab === 'invoices' && (
                    <div className="animation-fade-in">
                        <Card className="mb-4 border-0 shadow-sm">
                            <Card.Body className="d-flex flex-wrap gap-3 align-items-center justify-content-between p-3">
                                <div className="d-flex align-items-center gap-2" style={{minWidth: '300px'}}>
                                    <label className="fw-bold text-muted small text-nowrap">Select Branch:</label>
                                    <Form.Select 
                                        value={selectedBranch} 
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        className="fw-bold bg-light border-0"
                                    >
                                        {stats?.branchDetails?.map(b => (
                                            <option key={b.slug} value={b.slug}>{b.name} ({b.slug})</option>
                                        ))}
                                    </Form.Select>
                                </div>
                                <div className="d-flex gap-2">
                                    <Form.Select 
                                        size="sm" 
                                        style={{width: '150px'}} 
                                        value={selectedStatus} 
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        disabled={!selectedBranch}
                                     >
                                        <option value="all">All Status</option>
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending</option>
                                        <option value="overdue">Overdue</option>
                                        <option value="cancelled">Cancelled</option>
                                     </Form.Select>
                                     <Form.Control 
                                        placeholder="Search invoices..." 
                                        size="sm"
                                        style={{width: '200px'}}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                     />
                                     <Button variant="outline-success" size="sm" onClick={() => handleExport('invoices')} disabled={!selectedBranch}>
                                        <BarChart2 size={16} className="me-2" /> Export
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>

                        {/* Invoice Stats Cards */}
                        {branchData && (
                            <Row className="mb-4 g-3">
                                <Col md={3}>
                                    <StatCard 
                                        title="Revenue" 
                                        value={formatMoney(branchData.stats.totalRevenue)} 
                                        icon={Wallet} 
                                        color="primary" 
                                    />
                                </Col>
                                <Col md={3}>
                                    <StatCard 
                                        title="Outstanding" 
                                        value={formatMoney(branchData.stats.totalOutstanding)} 
                                        icon={AlertTriangle} 
                                        color="warning" 
                                    />
                                </Col>
                                <Col md={3}>
                                    <StatCard 
                                        title="Total Invoices" 
                                        value={branchData.stats.totalInvoices} 
                                        icon={BarChart2} 
                                        color="info" 
                                    />
                                </Col>
                                <Col md={3}>
                                    <StatCard 
                                        title="Total Customers" 
                                        value={branchData.stats.totalCustomers} 
                                        icon={Users} 
                                        color="success" 
                                    />
                                </Col>
                            </Row>
                        )}

                        {listLoading ? (
                            <div className="text-center py-5"><Spinner animation="border" variant="secondary"/></div>
                        ) : selectedBranch ? (
                            <Card className="border-0 shadow-sm">
                                <Card.Body>
                                    <Table hover className="align-middle mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Invoice #</th>
                                                <th>Date</th>
                                                <th>Customer</th>
                                                <th className="text-end">Total</th>
                                                <th className="text-center">Status</th>
                                                <th className="text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceList?.invoices?.map(inv => (
                                                <tr key={inv._id}>
                                                    <td>{inv.invoiceNumber}</td>
                                                    <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                                                    <td>{inv.customer?.name || inv.customerName || 'N/A'} <br/> <small className="text-muted">{inv.customer?.phone}</small></td>
                                                    <td className="text-end fw-bold">{formatMoney(inv.total)}</td>
                                                    <td className="text-center">
                                                        <Badge bg={inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : 'danger'}>
                                                            {inv.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-center">
                                                        <Button variant="outline-primary" size="sm" onClick={() => setShowInvoiceModal(inv)}>
                                                            View
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {invoiceList?.invoices?.length === 0 && (
                                                <tr><td colSpan="6" className="text-center py-4 text-muted">No invoices found.</td></tr>
                                            )}
                                        </tbody>
                                    </Table>
                                    
                                    {/* Numbered Pagination */}
                                    {invoiceList?.totalPages > 1 && (
                                        <div className="d-flex justify-content-center mt-4">
                                            <div className="btn-group">
                                                <Button 
                                                    variant="outline-secondary" 
                                                    size="sm" 
                                                    disabled={currentPage === 1}
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                >
                                                    &laquo; Prev
                                                </Button>
                                                {[...Array(Math.min(5, invoiceList.totalPages))].map((_, idx) => {
                                                    // Logic to show a window of pages around current page
                                                    let pageNum = idx + 1;
                                                    if (invoiceList.totalPages > 5) {
                                                        if (currentPage > 3 && currentPage < invoiceList.totalPages - 2) {
                                                            pageNum = currentPage - 2 + idx;
                                                        } else if (currentPage >= invoiceList.totalPages - 2) {
                                                            pageNum = invoiceList.totalPages - 4 + idx;
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <Button 
                                                            key={pageNum}
                                                            variant={currentPage === pageNum ? 'primary' : 'outline-secondary'}
                                                            size="sm"
                                                            onClick={() => setCurrentPage(pageNum)}
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    );
                                                })}
                                                <Button 
                                                    variant="outline-secondary" 
                                                    size="sm" 
                                                    disabled={currentPage === invoiceList.totalPages}
                                                    onClick={() => setCurrentPage(p => Math.min(invoiceList.totalPages, p + 1))}
                                                >
                                                    Next &raquo;
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        ) : (
                             <div className="text-center py-5 text-muted">Select a branch to view invoices</div>
                        )}
                    </div>
                )}

                {/* --- TAB: INVENTORY --- */}
                {activeTab === 'inventory' && (
                    <div className="animation-fade-in">
                         <Card className="mb-4 border-0 shadow-sm">
                            <Card.Body className="d-flex flex-wrap gap-3 align-items-center justify-content-between p-3">
                                <div className="d-flex align-items-center gap-2" style={{minWidth: '300px'}}>
                                    <label className="fw-bold text-muted small text-nowrap">Select Branch:</label>
                                    <Form.Select 
                                        value={selectedBranch} 
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        className="fw-bold bg-light border-0"
                                    >
                                        {stats?.branchDetails?.map(b => (
                                            <option key={b.slug} value={b.slug}>{b.name} ({b.slug})</option>
                                        ))}
                                    </Form.Select>
                                </div>
                                 <div className="d-flex gap-2 text-nowrap align-items-center">
                                     <Form.Select 
                                        size="sm" 
                                        style={{width: '150px'}} 
                                        value={selectedCategory} 
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        disabled={!selectedBranch}
                                     >
                                         <option value="">All Categories</option>
                                         {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                     </Form.Select>
                                     <Form.Control 
                                        placeholder="Search products..." 
                                        size="sm"
                                        style={{width: '200px'}}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                     />
                                     <Button variant="outline-primary" size="sm" onClick={() => handleExport('products')} disabled={!selectedBranch}>
                                        <Package size={16} className="me-2" /> Export
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>

                        {/* Inventory Stats Cards */}
                        {branchData && (
                             <Row className="mb-4 g-3">
                                <Col md={4}>
                                    <StatCard 
                                        title="Total Products" 
                                        value={branchData.stats.totalProducts} 
                                        icon={Package} 
                                        color="primary" 
                                    />
                                </Col>
                                <Col md={4}>
                                    <StatCard 
                                        title="Inventory Value" 
                                        value={formatMoney(branchData.stats.inventoryValue)} 
                                        icon={Wallet} 
                                        color="success" 
                                    />
                                </Col>
                                <Col md={4}>
                                    <StatCard 
                                        title="Low Stock Items" 
                                        value={branchData.stats.lowStockCount} 
                                        icon={AlertTriangle} 
                                        color="danger" 
                                    />
                                </Col>
                            </Row>
                        )}

                        {listLoading ? (
                            <div className="text-center py-5"><Spinner animation="border" variant="secondary"/></div>
                        ) : selectedBranch ? (
                            <Card className="border-0 shadow-sm">
                                <Card.Body>
                                    <Table hover className="align-middle mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Product Name</th>
                                                <th>Category</th>
                                                <th>SKU</th>
                                                <th className="text-end">Price</th>
                                                <th className="text-end">Stock</th>
                                                <th className="text-end">Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productList?.products?.map(p => (
                                                <tr key={p._id}>
                                                    <td className="fw-medium">{p.name}</td>
                                                    <td><Badge bg="light" text="dark" className="border">{p.category || 'Uncategorized'}</Badge></td>
                                                    <td>{p.sku || '-'}</td>
                                                    <td className="text-end">{formatMoney(p.price)}</td>
                                                    <td className="text-end">
                                                        <Badge bg={p.stock <= (p.lowStockThreshold || 10) ? 'danger' : 'success'}>
                                                            {p.stock}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-end text-muted">{formatMoney(p.price * p.stock)}</td>
                                                </tr>
                                            ))}
                                            {productList?.products?.length === 0 && (
                                                <tr><td colSpan="6" className="text-center py-4 text-muted">No products found.</td></tr>
                                            )}
                                        </tbody>
                                    </Table>
                                    
                                    {/* Numbered Pagination for Products */}
                                    {productList?.totalPages > 1 && (
                                        <div className="d-flex justify-content-center mt-4">
                                            <div className="btn-group">
                                                <Button 
                                                    variant="outline-secondary" 
                                                    size="sm" 
                                                    disabled={currentPage === 1}
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                >
                                                    &laquo; Prev
                                                </Button>
                                                {[...Array(Math.min(5, productList.totalPages))].map((_, idx) => {
                                                    let pageNum = idx + 1;
                                                    if (productList.totalPages > 5) {
                                                        if (currentPage > 3 && currentPage < productList.totalPages - 2) {
                                                            pageNum = currentPage - 2 + idx;
                                                        } else if (currentPage >= productList.totalPages - 2) {
                                                            pageNum = productList.totalPages - 4 + idx;
                                                        }
                                                    }
                                                    return (
                                                        <Button 
                                                            key={pageNum}
                                                            variant={currentPage === pageNum ? 'primary' : 'outline-secondary'}
                                                            size="sm" 
                                                            onClick={() => setCurrentPage(pageNum)}
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    );
                                                })}
                                                <Button 
                                                    variant="outline-secondary" 
                                                    size="sm" 
                                                    disabled={currentPage === productList.totalPages}
                                                    onClick={() => setCurrentPage(p => Math.min(productList.totalPages, p + 1))}
                                                >
                                                    Next &raquo;
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        ) : (
                             <div className="text-center py-5 text-muted">Select a branch to view inventory</div>
                        )}
                    </div>
                )}

                {/* --- TAB: ACTIVITY LOGS --- */}
                {activeTab === 'activity-logs' && (
                    <div className="animation-fade-in">
                        <ActivityLogTable 
                            fetchUrl={`${API_BASE_URL}/client-admin/activity-logs`}
                            contextToken={localStorage.getItem('token')}
                            isClientSuperAdmin={true} // New prop to hide Org filter but keep Branch filter
                            tenants={stats?.branchDetails || []} 
                        />
                    </div>
                )}



                {/* --- INVOICE VIEW MODAL --- */}
                <Modal show={!!showInvoiceModal} onHide={() => setShowInvoiceModal(null)} size="lg" centered>
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold">
                            Invoice #{showInvoiceModal?.invoiceNumber}
                            <Badge bg={showInvoiceModal?.status === 'paid' ? 'success' : showInvoiceModal?.status === 'pending' ? 'warning' : 'danger'} className="ms-3 fs-6">
                                {showInvoiceModal?.status?.toUpperCase()}
                            </Badge>
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="pt-2">
                        {showInvoiceModal && (
                            <div className="p-3 bg-light rounded-3">
                                {/* Header Details */}
                                <Row className="mb-4">
                                    <Col md={6}>
                                        <h6 className="text-secondary small fw-bold mb-3">CUSTOMER DETAILS</h6>
                                        <p className="mb-1 fw-bold">{showInvoiceModal.customerName || showInvoiceModal.customer?.name || 'N/A'}</p>
                                        <p className="mb-1 text-muted small">{showInvoiceModal.customer?.email}</p>
                                        <p className="mb-0 text-muted small">{showInvoiceModal.customer?.phone}</p>
                                    </Col>
                                    <Col md={6} className="text-end">
                                        <h6 className="text-secondary small fw-bold mb-3">INVOICE INFO</h6>
                                        <p className="mb-1">Date: <strong>{new Date(showInvoiceModal.createdAt).toLocaleDateString()}</strong></p>
                                        <p className="mb-0">Branch: <strong>{stats?.branchDetails?.find(b => b.slug === selectedBranch)?.name || selectedBranch}</strong></p>
                                    </Col>
                                </Row>

                                {/* Items Table */}
                                <Card className="border-0 shadow-sm mb-4">
                                    <Table hover className="mb-0 align-middle small">
                                        <thead className="bg-white border-bottom">
                                            <tr>
                                                <th className="ps-3 py-3">Item / Description</th>
                                                <th className="text-center py-3">Qty</th>
                                                <th className="text-end py-3">Price</th>
                                                <th className="text-end pe-3 py-3">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {showInvoiceModal.items?.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="ps-3 fw-medium">
                                                        {item.description || item.product?.name || 'Unknown Item'}
                                                        {item.hsnCode && <div className="text-muted" style={{fontSize: '0.75rem'}}>HSN: {item.hsnCode}</div>}
                                                    </td>
                                                    <td className="text-center">{item.quantity}</td>
                                                    <td className="text-end">{formatMoney(item.price)}</td>
                                                    <td className="text-end pe-3">{formatMoney(item.price * item.quantity)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-top">
                                            <tr>
                                                <td colSpan="3" className="text-end pt-3 pb-1 border-0">Subtotal</td>
                                                <td className="text-end pe-3 pt-3 pb-1 border-0 fw-bold">{formatMoney(showInvoiceModal.subtotal)}</td>
                                            </tr>
                                            {showInvoiceModal.taxDetails?.totalTax > 0 && (
                                                <tr>
                                                    <td colSpan="3" className="text-end py-1 border-0 text-muted">Tax (GST)</td>
                                                    <td className="text-end pe-3 py-1 border-0 text-muted">{formatMoney(showInvoiceModal.taxDetails.totalTax)}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <td colSpan="3" className="text-end pb-3 pt-1 border-0 fw-bold h5 mb-0">Total</td>
                                                <td className="text-end pe-3 pb-3 pt-1 border-0 fw-bold h5 mb-0 text-primary">{formatMoney(showInvoiceModal.total)}</td>
                                            </tr>
                                        </tfoot>
                                    </Table>
                                </Card>
                            </div>
                        )}
                    </Modal.Body>
                </Modal>
            </Container>
        </div>
    );
};

export default ClientDashboard;
