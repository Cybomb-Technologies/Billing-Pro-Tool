import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Card, Button, Table, Badge, Spinner, Alert, ProgressBar, Form } from 'react-bootstrap';
import { TrendingUp, Users, Package, FileText, Plus, LogOut, Truck, DollarSign, Clock, UsersRound, ArrowUpRight, Eye, ShoppingCart, Activity, Zap, AlertTriangle, Calendar, Download, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import StatCard from '../components/StatCard';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

const SETTINGS_API_BASE_URL = `${API_BASE_URL}/settings`;

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalInvoices: 0,
    totalProducts: 0,
    totalCustomers: 0,
    lowStockCount: 0,
    outstandingAR: 0,
    overdueCount: 0,
    pendingCount: 0,
    topSellingProducts: [],
    monthlySales: {},
    trends: { revenue: 0, invoices: 0, ar: 0, lowStock: 0 }, // NEW: Trends
    totalUsers: 0,
    lowStockProducts: [] // NEW: List from backend
  });
  const [invoices, setInvoices] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  // const [staffLogs, setStaffLogs] = useState([]); // Removed
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // --- Sales Pie Chart State ---
  const [salesPeriod, setSalesPeriod] = useState('monthly');
  const [salesDistribution, setSalesDistribution] = useState(null);
  // -----------------------------
  
  // --- Sales Trend Bar Chart State ---
  const [trendPeriod, setTrendPeriod] = useState('weekly');
  const [trendData, setTrendData] = useState(null);
  // -----------------------------------

  // --- Currency State ---
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  // ----------------------

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const formatCurrency = useCallback((amount) => {
    const numAmount = Number(amount) || 0;
    
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);

    const symbolMap = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AUD': 'A$', 'CAD': 'C$' };
    const displaySymbol = symbolMap[currencyCode] || currencySymbol;

    if (formatted.includes(currencyCode)) {
        return formatted.replace(currencyCode, displaySymbol).trim();
    }
    
    return `${displaySymbol} ${numAmount.toFixed(2).toLocaleString()}`;
  }, [currencyCode, currencySymbol]); // Depends on dynamic currency state

  const getAuthHeaders = () => localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {};

  const sequentiallyOrderedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [invoices]);

  const formatOfficialInvoiceNumber = useCallback((inv) => {
    if (inv.invoiceNumber && !inv.invoiceNumber.startsWith('INV-')) {
      return inv.invoiceNumber;
    }

    const stableIndex = sequentiallyOrderedInvoices.findIndex(item => item._id === inv._id);
    
    if (stableIndex === -1) {
      return `N/A`;
    }
    
    try {
      const date = new Date(inv.createdAt || Date.now());
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString();
      const sequentialCount = (stableIndex + 1).toString().padStart(3, '0');

      return `${day}${month}${year}${sequentialCount}`;
    } catch (e) {
      return `ERR-${stableIndex + 1}`;
    }
  }, [sequentiallyOrderedInvoices]);

  // --- NEW: Fetch Settings for Currency ---
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
  // ---------------------------------------


  const fetchDashboardData = async () => {
    setIsLoading(true);
    setFetchError(null);
    const authHeaders = getAuthHeaders();

    try {
      // Fetch settings concurrently with main data
      await fetchSettings();
      
      const [statsRes, invoicesRes, productsRes, customersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/reports/dashboard-stats`, { headers: authHeaders }),
        axios.get(`${API_BASE_URL}/invoices?limit=5`, { headers: authHeaders }),
        axios.get(`${API_BASE_URL}/products?limit=20`, { headers: authHeaders }),
        axios.get(`${API_BASE_URL}/customers?limit=5`, { headers: authHeaders })
      ]);

      // Handle paginated responses (support both array fallback and new object structure)
      const recentInvoices = invoicesRes.data.invoices || invoicesRes.data || [];
      const topProducts = productsRes.data.products || productsRes.data || [];
      const recentCustomers = customersRes.data.customers || customersRes.data || [];
      // const recentLogs = Array.isArray(logsRes.data) ? logsRes.data.slice(0, 3) : []; // Removed logs

      // Set stats from backend aggregation
      setStats(statsRes.data);

      setInvoices(recentInvoices);
      setTopProductsData(topProducts);
      setRecentCustomers(recentCustomers);
      // setStaffLogs(recentLogs);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setFetchError('Failed to fetch data from the server. Check backend status or API paths.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch Sales Distribution when period changes
  useEffect(() => {
    const fetchSalesDistribution = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/reports/payment-distribution?period=${salesPeriod}`, { headers: getAuthHeaders() });
            setSalesDistribution(res.data);
        } catch (error) {
            console.error("Error fetching sales distribution:", error);
        }
    };
    fetchSalesDistribution();
  }, [salesPeriod]);

  // Prepare Pie Chart Data
  const pieChartData = useMemo(() => {
    if (!salesDistribution) return null;
    
    // keys: cash, card, upi, bank_transfer, cheque
    const labels = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque'];
    const dataValues = [
        salesDistribution.cash || 0, 
        salesDistribution.card || 0, 
        salesDistribution.upi || 0, 
        salesDistribution.bank_transfer || 0,
        salesDistribution.cheque || 0
    ];

    return {
        labels,
        datasets: [
            {
                data: dataValues,
                backgroundColor: [
                    '#0d6efd', // Primary (Cash)
                    '#198754', // Success (Card)
                    '#ffc107', // Warning (UPI)
                    '#6610f2', // Indigo (Bank)
                    '#dc3545'  // Danger (Cheque)
                ],
                borderColor: '#ffffff',
                borderWidth: 2,
            },
        ],
    };
  }, [salesDistribution]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };





  // Fetch Sales Trend
  useEffect(() => {
    const fetchTrend = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/reports/sales-trend?period=${trendPeriod}`, { headers: getAuthHeaders() });
            setTrendData(res.data);
        } catch (error) {
            console.error("Error fetching sales trend:", error);
        }
    };
    fetchTrend();
  }, [trendPeriod]);

  const barChartData = useMemo(() => {
      if (!trendData) return null;
      return {
          labels: trendData.labels,
          datasets: [{
              label: 'Sales Revenue',
              data: trendData.data,
              backgroundColor: '#0d6efd',
              borderRadius: 4,
          }]
      };
  }, [trendData]);

  const { urgentActions: urgentActionsData } = useMemo(() => {
    
    // Urgent Actions Data from Server Stats
    const urgentActions = {
      overdueInvoices: stats.overdueCount || 0,
      lowStockProducts: stats.lowStockProducts || [], // Use backend list
      pendingPayments: stats.pendingCount || 0
    };

    return { urgentActions };
  }, [stats, topProductsData]);

  const getStatusVariant = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return 'success';
    if (s === 'overdue') return 'danger';
    return 'warning';
  };

  if (fetchError) {
    return (
      <div className="p-5 text-center">
        <Alert variant="danger" className="mb-4 border-0 shadow-sm">
          <div className="d-flex align-items-center justify-content-center mb-3">
            <div className="bg-danger bg-opacity-10 rounded-circle p-3">
              <Activity size={24} className="text-danger" />
            </div>
          </div>
          <h4 className="alert-heading">Connection Issue!</h4>
          <p className="mb-3">{fetchError}</p>
          <Button variant="primary" onClick={fetchDashboardData} className="px-4">
            <Zap size={16} className="me-2" />
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-5 text-center">
        <div className="loading-spinner mb-4">
          <Spinner animation="border" variant="primary" role="status" style={{ width: '3rem', height: '3rem' }} />
        </div>
        <h5 className="text-primary mb-2">Loading Your Dashboard</h5>
        <p className="text-muted">Preparing your business insights...</p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column dashboard-container min-vh-100">
      <div className="flex-grow-1 p-4">
        {/* Enhanced Header */}
        <div className="dashboard-header mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold mb-1 text-gradient">Business Dashboard</h2>
              <p className="text-muted mb-0">
                <span className="fw-semibold">Welcome back, {user?.username || 'User'}!</span> 
                <span className="ms-2">Here's what's happening today.</span>
              </p>
            </div>
            <div className="d-flex gap-3">
              <div className="bg-primary bg-opacity-10 rounded-pill px-3 py-1">
                <small className="text-primary fw-semibold">
                  <Clock size={14} className="me-1" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </small>
              </div>
              <Link to="/invoices" className="text-decoration-none">
                <Button variant="primary" className="d-flex align-items-center fw-semibold px-4 py-2 shadow-sm">
                  <Plus size={18} className="me-2" /> New Invoice
                </Button>
              </Link>
              <Button variant="outline-danger" onClick={handleLogout} className="d-flex align-items-center fw-semibold px-3 py-2">
                <LogOut size={18} className="me-2" /> Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        {/* Enhanced Stats Cards */}
        <Row className="g-4 mb-4">
          <Col lg={3} md={6}>
            <StatCard 
              title="Total Revenue" 
              value={formatCurrency(stats.totalSales)}
              subtitle="All time paid invoices"
              icon={TrendingUp} 
              color="success"
              trend={stats.trends?.revenue || 0}
            />
          </Col>
          <Col lg={3} md={6}>
            <StatCard 
              title="Outstanding A/R" 
              value={formatCurrency(stats.outstandingAR)}
              subtitle="Pending payments"
              icon={Clock} 
              color="warning"
              trend={stats.trends?.ar || 0}
            />
          </Col>
          <Col lg={3} md={6}>
            <StatCard 
              title="Total Invoices" 
              value={stats.totalInvoices.toLocaleString()}
              subtitle="All invoices created"
              icon={FileText} 
              color="primary"
              trend={stats.trends?.invoices || 0}
            />
          </Col>
          <Col lg={3} md={6}>
            <StatCard 
              title="Low Stock Items" 
              value={stats.lowStockCount.toLocaleString()}
              subtitle="Need restocking"
              icon={Truck} 
              color={stats.lowStockCount > 0 ? 'danger' : 'secondary'}
              trend={0} // Stock trend usually not relevant or hard to track without history
            />
          </Col>
        </Row>

        {/* Quick Actions Row */}


        {/* Enhanced Content Grid (2x2) */}
        <Row className="g-4 mb-4">
          
          {/* 1. Sales Revenue */}
          <Col lg={6} md={12}>
            <Card className="shadow-sm border-0 h-100 chart-card">
              <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Sales Revenue</h5>
                <Form.Select 
                    size="sm" 
                    style={{ width: 'auto', cursor: 'pointer' }}
                    value={trendPeriod}
                    onChange={(e) => setTrendPeriod(e.target.value)}
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </Form.Select>
              </Card.Header>
              <Card.Body className="p-4">
                {barChartData ? (
                  <div className="chart-container" style={{ height: '300px' }}>
                    <Bar 
                      data={barChartData} 
                      options={{
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return `Revenue: ${formatCurrency(context.parsed.y)}`;
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            grid: {
                              display: false
                            }
                          },
                          y: {
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                              callback: function(value) {
                                return formatCurrency(value);
                              }
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="bg-light rounded-circle p-4 d-inline-block mb-3">
                      <TrendingUp size={32} className="text-muted" />
                    </div>
                    <h6 className="text-muted">Loading chart...</h6>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* 2. Low Stock Alerts */}
          <Col lg={6} md={12}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Low Stock Alerts</h5>
                <AlertTriangle size={20} className="text-warning" />
              </Card.Header>
              <Card.Body className="p-4">
                {urgentActionsData.lowStockProducts.length > 0 ? (
                  <div className="low-stock-alerts">
                    {urgentActionsData.lowStockProducts.map((product, index) => (
                      <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                        <div className="d-flex align-items-center">
                          <div className="bg-danger bg-opacity-10 rounded-circle p-1 me-2">
                            <Package size={14} className="text-danger" />
                          </div>
                          <span className="fw-semibold">{product.name}</span>
                        </div>
                        <Badge bg="danger" className="fw-semibold">
                          {product.stock} left
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <Package size={24} className="text-success mb-2" />
                    <p className="text-muted small mb-0">All products are well stocked</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* 3. Sales Distribution */}
          <Col lg={6} md={12}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Sales Distribution</h5>
                <Form.Select 
                    size="sm" 
                    style={{ width: 'auto', cursor: 'pointer' }}
                    value={salesPeriod}
                    onChange={(e) => setSalesPeriod(e.target.value)}
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </Form.Select>
              </Card.Header>
              <Card.Body className="p-4 d-flex align-items-center justify-content-center">
                 {pieChartData && pieChartData.datasets[0].data.some(v => v > 0) ? (
                    <div style={{ height: '300px', width: '100%', maxWidth: '400px' }}>
                        <Pie 
                            data={pieChartData} 
                            options={{
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            usePointStyle: true,
                                            boxWidth: 8,
                                            padding: 20
                                        }
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function(context) {
                                                const value = context.parsed;
                                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                                return ` ${context.label}: ${formatCurrency(value)} (${percentage})`;
                                            }
                                        }
                                    }
                                }
                            }} 
                        />
                    </div>
                 ) : (
                    <div className="text-center py-5">
                         <div className="bg-light rounded-circle p-4 d-inline-block mb-3">
                            <DollarSign size={32} className="text-muted" />
                         </div>
                         <h6 className="text-muted">No sales data for this period</h6>
                         <p className="text-muted small">Try selecting a different time range.</p>
                    </div>
                 )}
              </Card.Body>
            </Card>
          </Col>

          {/* 4. Top Selling Products */}
          <Col lg={6} md={12}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Top Selling Products</h5>
                <ShoppingCart size={20} className="text-success" />
              </Card.Header>
              <Card.Body className="p-4">
                {stats.topSellingProducts && stats.topSellingProducts.length > 0 ? (
                  <Row className="g-3">
                    {stats.topSellingProducts.map((product, index) => (
                      <Col md={6} key={index}>
                        <div className="p-3 border rounded h-100 product-card">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="fw-bold mb-0 text-truncate">{product.name}</h6>
                            <Badge bg="success" className="ms-2 flex-shrink-0">
                              #{index + 1}
                            </Badge>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-success fw-bold">{product.totalQuantity} units</span>
                            <small className="text-muted fw-bold">{formatCurrency(product.totalRevenue || 0)}</small>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">Stock: {product.stock}</small>
                            {/* Only show growth if it's non-zero/truthy to avoid rendering '0' */}
                            {product.growth ? (
                              <small className={`fw-semibold ${product.growth > 15 ? 'text-success' : 'text-warning'}`}>
                                ↗ {product.growth}%
                              </small>
                            ) : null}
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="text-center py-4">
                    <Package size={32} className="text-muted mb-2" />
                    <p className="text-muted mb-0">No products sold yet</p>
                    <small className="text-muted">Start creating invoices to track sales</small>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* FULL WIDTH BUSINESS OVERVIEW SECTION - ADMIN ONLY */}
      {user?.role === 'admin' && (
      <div className="p-4 pt-0">
        <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-white border-0 py-3">
                <h5 className="mb-0 fw-bold">Business Overview</h5>
            </Card.Header>
            <Card.Body className="p-4">
                {/* 4 Stats Cards Row */}
                <Row className="g-4 mb-5">
                    <Col lg={3} md={6}>
                        <div className="p-4 border rounded bg-light text-center h-100">
                             <div className="d-flex justify-content-center mb-3">
                                <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                                     <Users size={28} className="text-info" />
                                </div>
                             </div>
                             <h2 className="fw-bold mb-1">{stats.totalUsers.toLocaleString()}</h2>
                             <span className="text-muted fw-semibold">Total Users</span>
                             <div className="small text-muted mt-2">Admin & Staff</div>
                        </div>
                    </Col>
                     <Col lg={3} md={6}>
                        <div className="p-4 border rounded bg-light text-center h-100">
                             <div className="d-flex justify-content-center mb-3">
                                <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                                     <Package size={28} className="text-primary" />
                                </div>
                             </div>
                             <h2 className="fw-bold mb-1">{stats.totalProducts.toLocaleString()}</h2>
                             <span className="text-muted fw-semibold">Total Products</span>
                             <div className="small text-muted mt-2">In Inventory</div>
                        </div>
                    </Col>
                     <Col lg={3} md={6}>
                        <div className="p-4 border rounded bg-light text-center h-100">
                             <div className="d-flex justify-content-center mb-3">
                                <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                                     <FileText size={28} className="text-success" />
                                </div>
                             </div>
                             <h2 className="fw-bold mb-1">{stats.totalInvoices.toLocaleString()}</h2>
                             <span className="text-muted fw-semibold">Total Transactions</span>
                             <div className="small text-muted mt-2">Invoices Generated</div>
                        </div>
                    </Col>
                     <Col lg={3} md={6}>
                        <div className="p-4 border rounded bg-light text-center h-100">
                             <div className="d-flex justify-content-center mb-3">
                                <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
                                     <UsersRound size={28} className="text-warning" />
                                </div>
                             </div>
                             <h2 className="fw-bold mb-1">{stats.totalCustomers.toLocaleString()}</h2>
                             <span className="text-muted fw-semibold">Total Customers</span>
                             <div className="small text-muted mt-2">Active Clients</div>
                        </div>
                    </Col>
                </Row>

                {/* Quick Action Buttons */}
                <div>
                     <h6 className="fw-bold mb-3 text-secondary text-uppercase small ls-1">Quick Actions</h6>
                     <div className="d-flex gap-3 flex-wrap">
                        <Link to="/invoices" className="flex-grow-1">
                             <Button variant="outline-primary" size="lg" className="w-100 py-3 fw-semibold shadow-sm d-flex align-items-center justify-content-center">
                                 <Plus size={20} className="me-2" /> New Invoice
                             </Button>
                        </Link>
                        <Link to="/customers" className="flex-grow-1">
                             <Button variant="outline-info" size="lg" className="w-100 py-3 fw-semibold shadow-sm d-flex align-items-center justify-content-center">
                                 <UsersRound size={20} className="me-2" /> Add Customer
                             </Button>
                        </Link>
                        <Link to="/products" className="flex-grow-1">
                             <Button variant="outline-success" size="lg" className="w-100 py-3 fw-semibold shadow-sm d-flex align-items-center justify-content-center">
                                <Package size={20} className="me-2" /> Add Product
                             </Button>
                        </Link>
                         {user?.role === "admin" && (
                             <Link to="/reports" className="flex-grow-1">
                                 <Button variant="outline-dark" size="lg" className="w-100 py-3 fw-semibold shadow-sm d-flex align-items-center justify-content-center">
                                     <FileText size={20} className="me-2" /> View Reports
                                 </Button>
                             </Link>
                         )}
                     </div>
                </div>
            </Card.Body>
        </Card>
      </div>
      )}

      {/* FOOTER BRANDING ADDED HERE */}
      <div className="mt-2 mb-4  pt-3 border-top text-center text-muted small">
          Powered by **Cybomb Technologies**
      </div>

      <style jsx>{`
        .dashboard-container {
          background-color: var(--bg-body);
          min-height: 100vh;
        }
        .text-gradient {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg) !important;
        }
        .stat-card.clickable:hover {
          cursor: pointer;
        }
        .trend-indicator {
          display: flex;
          align-items: center;
        }
        .rotate-180 {
          transform: rotate(180deg);
        }
        .chart-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
        }
        .customer-item:hover {
          background-color: var(--bg-body);
          border-radius: 8px;
        }
        .invoice-row:hover {
          background-color: var(--bg-body);
        }
        .product-card {
          transition: all 0.3s ease;
          border: 1px solid var(--border-color) !important;
          background-color: var(--bg-surface);
        }
        .product-card:hover {
          border-color: var(--primary-color) !important;
          box-shadow: var(--shadow-md);
        }
        .loading-spinner {
          animation: pulse 1.5s ease-in-out infinite alternate;
        }
        .low-stock-alerts .border-bottom:last-child {
          border-bottom: none !important;
        }
        @keyframes pulse {
          from { opacity: 1; }
          to { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
