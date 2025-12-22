import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Card, Button, Table, Badge, Spinner, Alert, Container } from 'react-bootstrap';
import { TrendingUp, Users, Package, FileText, Plus, LogOut, Truck, Clock, UsersRound, ShoppingCart, BarChart2, Calendar, Zap, AlertTriangle, DollarSign, CreditCard, Activity } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import StatCard from '../components/StatCard';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SalesChart } from '../components/dashboard/SalesChart';
import { PaymentChart } from '../components/dashboard/PaymentChart';

const SETTINGS_API_BASE_URL = `${API_BASE_URL}/settings`;

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalSales: 0,
        totalInvoices: 0,
        totalProducts: 0,
        totalCustomers: 0,
        totalUsers: 0,
        lowStockCount: 0,
        outstandingAR: 0,
        overdueCount: 0,
        pendingCount: 0,
        topSellingProducts: [],
        lowStockProducts: [] 
    });
    const [invoices, setInvoices] = useState([]);
    const [recentCustomers, setRecentCustomers] = useState([]);
    
    const [salesChartData, setSalesChartData] = useState([]); 
    const [paymentChartData, setPaymentChartData] = useState([]);
    const [salesPeriod, setSalesPeriod] = useState('monthly');
    const [paymentPeriod, setPaymentPeriod] = useState('monthly');
    
    const [isLoading, setIsLoading] = useState(true);
    const [chartsLoading, setChartsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    
    const [currencySymbol, setCurrencySymbol] = useState('₹'); 
    const [currencyCode, setCurrencyCode] = useState('INR'); 

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const formatCurrency = useCallback((amount) => {
        const numAmount = Number(amount) || 0;
        const formatted = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(numAmount);

        const symbolMap = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AUD': 'A$', 'CAD': 'C$' };
        const displaySymbol = symbolMap[currencyCode] || currencySymbol;

        if (formatted.includes(currencyCode)) {
            return formatted.replace(currencyCode, displaySymbol).trim();
        }
        return `${displaySymbol} ${numAmount.toLocaleString('en-IN')}`;
    }, [currencyCode, currencySymbol]);

    const getAuthHeaders = () => localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {};

    const getStatusVariant = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'paid') return 'success';
        if (s === 'overdue') return 'danger';
        return 'warning';
    };

    const fetchSettings = useCallback(async () => {
        try {
            const res = await axios.get(SETTINGS_API_BASE_URL, { headers: getAuthHeaders() });
            const currencySetting = res.data.company?.currency || 'INR';
            setCurrencyCode(currencySetting);
            const symbolMap = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AUD': 'A$', 'CAD': 'C$' };
            setCurrencySymbol(symbolMap[currencySetting] || currencySetting);
        } catch (error) {
            console.warn("Could not fetch currency settings for Dashboard, defaulting to INR.");
        }
    }, []);

    const fetchSalesChart = async (period) => {
        try {
            const authHeaders = getAuthHeaders();
            const res = await axios.get(`${API_BASE_URL}/reports/sales-trend?period=${period}`, { headers: authHeaders });
            if (res.data && res.data.labels) {
                const formatted = res.data.labels.map((label, idx) => ({
                    name: label,
                    amount: res.data.data[idx]
                }));
                setSalesChartData(formatted);
            }
        } catch (error) {
            console.error("Error fetching sales chart:", error);
        }
    };

    const fetchPaymentChart = async (period) => {
        try {
            const authHeaders = getAuthHeaders();
            const res = await axios.get(`${API_BASE_URL}/reports/payment-distribution?period=${period}`, { headers: authHeaders });
            
            if (res.data) {
                // Ensure we get all payment methods from DB
                let formatted = [];
                
                if (Array.isArray(res.data)) {
                    // If API returns array directly
                    formatted = res.data.filter(item => item && item.name && item.value > 0);
                } else if (typeof res.data === 'object') {
                    // If API returns object
                    formatted = Object.entries(res.data).map(([key, val]) => ({
                        name: key.replace(/_/g, ' ').toUpperCase(),
                        value: Number(val) || 0
                    })).filter(item => item.value > 0);
                }
                
                // Ensure all standard payment types are included
                const standardTypes = ['CASH', 'CARD', 'UPI', 'BANK TRANSFER', 'CHEQUE'];
                standardTypes.forEach(type => {
                    if (!formatted.find(item => item.name === type)) {
                        formatted.push({ name: type, value: 0 });
                    }
                });
                
                setPaymentChartData(formatted);
            }
        } catch (error) {
            console.error("Error fetching payment chart:", error);
        }
    };

    const fetchInitialCharts = async () => {
        setChartsLoading(true);
        await Promise.all([
            fetchSalesChart(salesPeriod),
            fetchPaymentChart(paymentPeriod)
        ]);
        setChartsLoading(false);
    };

    const handleSalesFilterChange = (newPeriod) => {
        setSalesPeriod(newPeriod);
        fetchSalesChart(newPeriod);
    };

    const handlePaymentFilterChange = (newPeriod) => {
        setPaymentPeriod(newPeriod);
        fetchPaymentChart(newPeriod);
    };

    const fetchDashboardData = async () => {
        setIsLoading(true);
        setFetchError(null);
        const authHeaders = getAuthHeaders();

        try {
            await fetchSettings();
            
            const [statsRes, invoicesRes, customersRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/reports/dashboard-stats`, { headers: authHeaders }),
                axios.get(`${API_BASE_URL}/invoices?limit=5`, { headers: authHeaders }),
                axios.get(`${API_BASE_URL}/customers?limit=5`, { headers: authHeaders })
            ]);

            setStats(statsRes.data);
            setInvoices(invoicesRes.data.invoices || invoicesRes.data || []);
            setRecentCustomers(customersRes.data.customers || customersRes.data || []);
            
            fetchInitialCharts();

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setFetchError('Failed to fetch data from the server. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const lowStockItems = useMemo(() => {
        return stats.lowStockProducts || [];
    }, [stats]);

    if (fetchError) {
        return (
            <Container className="py-5">
                <Alert variant="danger" className="border-0 shadow-sm mb-4">
                    <div className="d-flex align-items-center">
                        <AlertTriangle size={24} className="me-3 text-danger" />
                        <div>
                            <h4 className="alert-heading mb-2">Connection Issue!</h4>
                            <p className="mb-3">{fetchError}</p>
                            <Button variant="primary" onClick={fetchDashboardData} className="px-4 py-2">
                                <Zap size={16} className="me-2" /> Try Again
                            </Button>
                        </div>
                    </div>
                </Alert>
            </Container>
        );
    }

    if (isLoading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" role="status" 
                    style={{ width: '3rem', height: '3rem' }} className="mb-4" />
                <h5 className="text-primary mb-2">Loading Dashboard</h5>
                <p className="text-muted">Preparing your business insights...</p>
            </Container>
        );
    }

    return (
        <div className="dashboard-container min-vh-100">
            <Container fluid className="px-4 py-4">
                {/* Header */}
                <div className="dashboard-header mb-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                        <div>
                            <h2 className="fw-bold mb-1 text-gradient">Business Dashboard</h2>
                            <p className="text-muted mb-0">
                                <span className="fw-semibold">Welcome back, {user?.username || 'User'}!</span> 
                                <span className="ms-2">Here's what's happening today.</span>
                            </p>
                        </div>
                        
                        <div className="d-flex gap-3 align-items-center flex-wrap">


                            <div className="bg-primary bg-opacity-10 rounded-pill px-3 py-2 d-none d-lg-block">
                                <small className="text-primary fw-semibold">
                                    <Calendar size={14} className="me-1" />
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </small>
                            </div>
                            
                            <Link to="/invoices">
                                <Button variant="primary" className="d-flex align-items-center fw-semibold px-4 py-2 shadow-sm">
                                    <Plus size={18} className="me-2" /> New Invoice
                                </Button>
                            </Link>
                            
                            <Button variant="outline-danger" onClick={handleLogout} 
                                className="d-flex align-items-center fw-semibold px-3 py-2">
                                <LogOut size={18} />
                            </Button>
                        </div>
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="animation-fade-in">
                        {/* 1. Stats Row */}
                        <Row className="g-3 mb-4">
                            <Col lg={3} md={6}>
                                <StatCard 
                                    title="Total Revenue" 
                                    value={formatCurrency(stats.totalSales)}
                                    subtitle="All time paid"
                                    icon={DollarSign} 
                                    color="success"
                                />
                            </Col>
                            <Col lg={3} md={6}>
                                <StatCard 
                                    title="Outstanding" 
                                    value={formatCurrency(stats.outstandingAR)}
                                    subtitle="Pending payments"
                                    icon={Clock} 
                                    color="warning"
                                />
                            </Col>
                            <Col lg={3} md={6}>
                                <StatCard 
                                    title="Total Invoices" 
                                    value={stats.totalInvoices.toLocaleString()}
                                    subtitle="Transactions"
                                    icon={FileText} 
                                    color="primary"
                                />
                            </Col>
                            <Col lg={3} md={6}>
                                <StatCard 
                                    title="Low Stock" 
                                    value={stats.lowStockCount.toLocaleString()}
                                    subtitle="Items to restock"
                                    icon={Truck} 
                                    color={stats.lowStockCount > 0 ? 'danger' : 'secondary'}
                                />
                            </Col>
                        </Row>

                        {/* 2. Charts Row */}
                        <Row className="g-3 mb-4">
                            <Col lg={8} md={12}>
                                <SalesChart 
                                    data={salesChartData} 
                                    title="Sales Trend" 
                                    filter={salesPeriod}
                                    onFilterChange={handleSalesFilterChange}
                                />
                            </Col>
                            <Col lg={4} md={12}>
                                <Card className="shadow-sm border-0 h-100">
                                    <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center border-bottom px-4">
                                        <h6 className="mb-0 fw-bold d-flex align-items-center text-dark">
                                            <AlertTriangle size={18} className="me-2 text-warning" />
                                            Low Stock Alerts
                                        </h6>
                                        <Badge bg="danger" pill className="px-3 py-2">{stats.lowStockCount}</Badge>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        {lowStockItems.length > 0 ? (
                                            <div className="list-group list-group-flush">
                                                {lowStockItems.slice(0, 6).map((product, idx) => (
                                                    <div key={idx} className="list-group-item d-flex justify-content-between align-items-center py-3 border-light px-4">
                                                        <div className="d-flex align-items-center">
                                                            <div className="bg-danger bg-opacity-10 rounded p-2 me-3">
                                                                <Package size={16} className="text-danger" />
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-0 text-truncate text-dark fw-medium" 
                                                                    style={{maxWidth: '140px'}} 
                                                                    title={product.name}>
                                                                    {product.name}
                                                                </h6>
                                                                <small className="text-muted">Threshold: {product.lowStockThreshold || 10}</small>
                                                            </div>
                                                        </div>
                                                        <Badge bg="danger" className="p-2 px-3 badge-pill">
                                                            {product.stock} left
                                                        </Badge>
                                                    </div>
                                                ))}
                                                {lowStockItems.length > 6 && (
                                                    <div className="p-3 text-center border-top">
                                                        <Link to="/inventory" className="small text-decoration-none fw-semibold text-primary">
                                                            View All Low Stock ({lowStockItems.length})
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-5 px-4">
                                                <Package size={32} className="text-success opacity-50 mb-2" />
                                                <p className="text-muted small mb-0">Stock levels are healthy</p>
                                                <p className="x-small text-muted mt-1">All products are above threshold levels</p>
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* 3. Payment Chart + Top Selling Products */}
                        <Row className="g-3 mb-4">
                            <Col lg={4} md={12}>
                                <PaymentChart 
                                    data={paymentChartData} 
                                    title="Payment Methods" 
                                    filter={paymentPeriod}
                                    onFilterChange={handlePaymentFilterChange}
                                />
                            </Col>
                            <Col lg={8} md={12}>
                                <Card className="shadow-sm border-0 h-100">
                                    <Card.Header className="bg-white border-0 py-3 border-bottom px-4">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <h6 className="mb-0 fw-bold d-flex align-items-center text-dark">
                                                <ShoppingCart size={18} className="me-2 text-success" />
                                                Top Selling Products
                                            </h6>
                                            <Link to="/reports" className="small text-decoration-none fw-semibold text-primary">
                                                View All Reports
                                            </Link>
                                        </div>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        <div className="table-responsive">
                                            <Table hover className="mb-0 align-middle">
                                                <thead className="bg-light">
                                                    <tr>
                                                        <th className="ps-4 py-3 border-0 text-muted small fw-bold">PRODUCT</th>
                                                        <th className="py-3 border-0 text-muted small fw-bold">SOLD</th>
                                                        <th className="py-3 border-0 text-muted small fw-bold">REVENUE</th>
                                                        <th className="pe-4 py-3 border-0 text-muted small fw-bold">STOCK</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {stats.topSellingProducts && stats.topSellingProducts.length > 0 ? (
                                                        stats.topSellingProducts.map((p, i) => (
                                                            <tr key={i} className="border-top">
                                                                <td className="ps-4 py-3 fw-medium text-dark">
                                                                    <div className="d-flex align-items-center">
                                                                        <Badge bg="light" text="dark" 
                                                                            className="me-3 border shadow-sm px-3 py-1">
                                                                            #{i+1}
                                                                        </Badge>
                                                                        <span className="text-truncate" style={{maxWidth: '180px'}} 
                                                                            title={p.name}>
                                                                            {p.name}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3">
                                                                    <Badge bg="success" className="px-3 py-1">
                                                                        {p.totalQuantity}
                                                                    </Badge>
                                                                </td>
                                                                <td className="py-3 fw-bold text-dark">
                                                                    {formatCurrency(p.totalRevenue)}
                                                                </td>
                                                                <td className="pe-4 py-3">
                                                                    {p.stock < 5 ? (
                                                                        <Badge bg="danger" className="px-3 py-1">
                                                                            {p.stock} Low
                                                                        </Badge>
                                                                    ) : p.stock < 20 ? (
                                                                        <Badge bg="warning" text="dark" className="px-3 py-1">
                                                                            {p.stock} Medium
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge bg="success" className="px-3 py-1">
                                                                            {p.stock} Good
                                                                        </Badge>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr className="border-top">
                                                            <td colSpan="4" className="text-center py-4 text-muted">
                                                                <Package size={24} className="mb-2 opacity-50" />
                                                                <p className="mb-0">No sales data yet</p>
                                                                <p className="x-small text-muted mt-1">Start creating invoices to see top products</p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* 4. Business Overview */}
                        <Card className="shadow-sm border-0 mb-4 bg-primary bg-opacity-5 business-overview-card">
                            <Card.Body className="p-4">
                                <Row className="g-4 align-items-center mb-4">
                                    <Col lg={3} md={6}>
                                        <h5 className="fw-bold text-white mb-1">Business Overview</h5>
                                        <p className="text-white small mb-0">Quick snapshot of your entire business</p>
                                    </Col>
                                    <Col lg={9} md={12}>
                                        <Row className="g-3">
                                            <Col md={3} sm={6}>
                                                <div className="bg-white p-3 rounded shadow-sm text-center h-100 overview-stat-card">
                                                    <UsersRound size={20} className="text-info mb-2" />
                                                    <h3 className="fw-bold mb-0 text-dark">{stats.totalCustomers.toLocaleString()}</h3>
                                                    <small className="text-muted">Total Customers</small>
                                                </div>
                                            </Col>
                                            <Col md={3} sm={6}>
                                                <div className="bg-white p-3 rounded shadow-sm text-center h-100 overview-stat-card">
                                                    <Package size={20} className="text-primary mb-2" />
                                                    <h3 className="fw-bold mb-0 text-dark">{stats.totalProducts.toLocaleString()}</h3>
                                                    <small className="text-muted">Total Products</small>
                                                </div>
                                            </Col>
                                            <Col md={3} sm={6}>
                                                <div className="bg-white p-3 rounded shadow-sm text-center h-100 overview-stat-card">
                                                    <FileText size={20} className="text-success mb-2" />
                                                    <h3 className="fw-bold mb-0 text-dark">{stats.totalInvoices.toLocaleString()}</h3>
                                                    <small className="text-muted">Transactions</small>
                                                </div>
                                            </Col>
                                            <Col md={3} sm={6}>
                                                <div className="bg-white p-3 rounded shadow-sm text-center h-100 overview-stat-card">
                                                    <Users size={20} className="text-warning mb-2" />
                                                    <h3 className="fw-bold mb-0 text-dark">{stats.totalUsers.toLocaleString()}</h3>
                                                    <small className="text-muted">Total Users</small>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>
                                
                                <div className="d-flex justify-content-center gap-3 flex-wrap">
                                    <Link to="/invoices">
                                        <Button variant="primary" className="d-flex align-items-center px-4 py-2 shadow-sm fw-semibold">
                                            <Plus size={16} className="me-2" /> Create Invoice
                                        </Button>
                                    </Link>
                                    <Link to="/customers">
                                        <Button variant="outline-primary" className="d-flex align-items-center px-4 py-2 bg-white shadow-sm fw-semibold overview-action-btn">
                                            <UsersRound size={16} className="me-2" /> Add Customer
                                        </Button>
                                    </Link>
                                    <Link to="/products">
                                        <Button variant="outline-primary" className="d-flex align-items-center px-4 py-2 bg-white shadow-sm fw-semibold overview-action-btn">
                                            <Package size={16} className="me-2" /> Add Product
                                        </Button>
                                    </Link>
                                    {user?.role === 'admin' && (
                                        <Link to="/reports">
                                            <Button variant="outline-secondary" className="d-flex align-items-center px-4 py-2 bg-white shadow-sm fw-semibold overview-action-btn-sec">
                                                <FileText size={16} className="me-2" /> View Reports
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                )}

                
            </Container>

            <div className="mt-4 pt-3 border-top text-center text-muted small px-4">
                Powered by <strong>Cybomb Technologies</strong> • {new Date().getFullYear()}
            </div>

            <style jsx>{`
                .dashboard-container {
                    background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
                    min-height: 100vh;
                }
                .text-gradient {
                    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .animation-fade-in {
                    animation: fadeIn 0.4s ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .overview-action-btn:hover {
                    color: #fff !important;
                    background-color: var(--bs-primary) !important;
                    border-color: var(--bs-primary) !important;
                }
                .overview-action-btn-sec:hover {
                    color: #fff !important;
                    background-color: var(--bs-secondary) !important;
                    border-color: var(--bs-secondary) !important;
                }
                .overview-stat-card {
                    transition: transform 0.2s, box-shadow 0.2s;
                    border: 1px solid #e5e7eb;
                }
                .overview-stat-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
                }
                .business-overview-card {
                    border: 1px solid rgba(59, 130, 246, 0.1);
                }
                .card-header {
                    background: linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%);
                }
            `}</style>
        </div>
    );
};

export default Dashboard;