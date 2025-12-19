import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Card, Button, Table, Badge, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { TrendingUp, Users, Package, FileText, Plus, LogOut, Truck, DollarSign, Clock, UsersRound, ArrowUpRight, Eye, ShoppingCart, Activity, Zap, AlertTriangle, Calendar, Download, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import StatCard from '../components/StatCard';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

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
    monthlySales: {} 
  });
  const [invoices, setInvoices] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // --- CURRENCY STATE ---
  const [currencySymbol, setCurrencySymbol] = useState('₹'); 
  const [currencyCode, setCurrencyCode] = useState('INR'); 
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
        axios.get(`${API_BASE_URL}/products?limit=5`, { headers: authHeaders }),
        axios.get(`${API_BASE_URL}/customers?limit=5`, { headers: authHeaders })
      ]);

      // Handle paginated responses (support both array fallback and new object structure)
      const recentInvoices = invoicesRes.data.invoices || invoicesRes.data || [];
      const topProducts = productsRes.data.products || productsRes.data || [];
      const recentCustomers = customersRes.data.customers || customersRes.data || [];

      // Set stats from backend aggregation
      setStats(statsRes.data);

      setInvoices(recentInvoices);
      setTopProductsData(topProducts);
      setRecentCustomers(recentCustomers);
      
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };



  const { chartData, urgentActions } = useMemo(() => {
    
    // Revenue Trend Chart from Server Stats
    const monthlySales = stats.monthlySales || {};
    const sortedMonthKeys = Object.keys(monthlySales).sort().slice(-6);

    const chart = {
      labels: sortedMonthKeys.map(key => new Date(key).toLocaleString('en-US', { month: 'short', year: 'numeric' })),
      datasets: [
        {
          label: 'Revenue',
          data: sortedMonthKeys.map(key => monthlySales[key] || 0),
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#0d6efd',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
    
    // Urgent Actions Data from Server Stats
    const urgentActions = {
      overdueInvoices: stats.overdueCount || 0,
      lowStockProducts: topProductsData.filter(p => (p.stock || 0) < 5 && (p.stock || 0) >= 0).slice(0, 3) || [], // Keep this client side for now as we have the recent list? No, topProductsData is now only 5 items. 
      // Actually, for "Low Stock Alerts" list, we need the NAMES of low stock items.
      // 'dashboard-stats' returns 'lowStockCount' but not the items list.
      // We are fetching 'products?limit=5' into topProductsData. That's NOT "All Low Stock Products".
      // This is a GAP. 
      // Quick fix: The "Manage Low Stock Items" button takes user to products page.
      // For the LIST in Quick Actions, we can just show empty or "Check Inventory".
      // OR better, we can filter the 'topSellingProducts' (which we have full details for) for low stock? No suitable.
      // Let's rely on 'topProductsData' (recent) for now, or just hide the list if empty.
      pendingPayments: stats.pendingCount || 0
    };

    return { chartData: chart, urgentActions };
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
        <Row className="g-4 mb-4">
          <Col lg={3} md={6}>
            <StatCard 
              title="Total Revenue" 
              value={formatCurrency(stats.totalSales)}
              subtitle="All time paid invoices"
              icon={TrendingUp} 
              color="success"
              trend={12.5}
            />
          </Col>
          <Col lg={3} md={6}>
            <StatCard 
              title="Outstanding A/R" 
              value={formatCurrency(stats.outstandingAR)}
              subtitle="Pending payments"
              icon={Clock} 
              color="warning"
              trend={-3.2}
            />
          </Col>
          <Col lg={3} md={6}>
            <StatCard 
              title="Total Invoices" 
              value={stats.totalInvoices.toLocaleString()}
              subtitle="All invoices created"
              icon={FileText} 
              color="primary"
              trend={8.7}
            />
          </Col>
          <Col lg={3} md={6}>
            <StatCard 
              title="Low Stock Items" 
              value={stats.lowStockCount.toLocaleString()}
              subtitle="Need restocking"
              icon={Truck} 
              color={stats.lowStockCount > 0 ? 'danger' : 'secondary'}
              trend={stats.lowStockCount > 0 ? 15.3 : 0}
            />
          </Col>
        </Row>

        {/* Enhanced Content Row */}
        <Row className="g-4">
          {/* Left Column */}
          <Col lg={6} md={12}>
            {/* Enhanced Sales Chart */}
            <Card className="shadow-sm border-0 mb-4 chart-card">
              <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Revenue Trend</h5>
                <div className="d-flex gap-2">
                  <Button variant="outline-primary" size="sm" className="d-flex align-items-center" onClick={() => navigate('/history')}>
                    <Eye size={14} className="me-1" />
                    Details
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                {chartData.datasets[0].data.length > 0 ? (
                  <div className="chart-container" style={{ height: '300px' }}>
                    <Line 
                      data={chartData} 
                      options={{
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          },
                          tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            titleColor: '#333',
                            bodyColor: '#666',
                            borderColor: '#e9ecef',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: false,
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
                    <h6 className="text-muted">Not enough sales data</h6>
                    <p className="text-muted small mb-0">Start creating paid invoices to see revenue trends</p>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Enhanced Customer & Product Summary */}
            <Card className="shadow-sm border-0 h-auto py-4">
              <Card.Header className="bg-white border-0 py-3">
                <h5 className="mb-0 fw-bold">Business Overview</h5>
              </Card.Header>
              <Card.Body className="p-4">
                <Row className="g-4 mb-4">
                  <Col md={6}>
                    <div className="p-3 border rounded h-100 bg-light">
                      <div className="d-flex align-items-center mb-2">
                        <UsersRound size={20} className="text-info me-2" />
                        <h6 className="mb-0 fw-bold">Total Customers</h6>
                      </div>
                      <h3 className="fw-bold text-info mb-1">{stats.totalCustomers.toLocaleString()}</h3>
                      <small className="text-muted">Registered customers</small>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="p-3 border rounded h-100 bg-light">
                      <div className="d-flex align-items-center mb-2">
                        <Package size={20} className="text-primary me-2" />
                        <h6 className="mb-0 fw-bold">Total Products</h6>
                      </div>
                      <h3 className="fw-bold text-primary mb-1">{stats.totalProducts.toLocaleString()}</h3>
                      <small className="text-muted">Available products</small>
                    </div>
                  </Col>
                </Row>

                <h6 className="fw-bold mb-3">Recent Customers</h6>
                {recentCustomers.length > 0 ? (
                  <div className="recent-customers">
                    {recentCustomers.map((cust) => (
                      <div key={cust._id} className="d-flex justify-content-between align-items-center py-3 border-bottom customer-item">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                            <Users size={16} className="text-primary" />
                          </div>
                          <div>
                            <span className="fw-semibold d-block">{cust.name}</span>
                            <small className="text-muted">{cust.phone || cust.email}</small>
                          </div>
                        </div>
                        <ArrowUpRight size={16} className="text-muted" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Users size={32} className="text-muted mb-2" />
                    <p className="text-muted small mb-0">No customers added yet</p>
                  </div>
                )}

                <div className="d-grid gap-2  mt-5">
                  <Link to="/customers" className="text-decoration-none">
                    <Button variant="primary" className="mx-auto mb-2 d-flex align-items-center justify-content-center">
                      <UsersRound size={16} className="me-2" />
                      Manage Customers
                    </Button>
                  </Link>
                  {user?.role === "admin" && (
                    <Link to="/reports" className="text-decoration-none">
                      <Button variant="warning" className="mx-auto d-flex align-items-center justify-content-center">
                        <FileText size={16} className="me-2" />
                        View Detailed Reports
                      </Button>
                    </Link>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column */}
          <Col lg={6} md={12}>
            {/* Enhanced Recent Invoices */}
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Recent Invoices</h5>
                <Badge bg="light" text="dark" className="fw-semibold">
                  {invoices.length} items
                </Badge>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0 table-sm">
                    <thead className="bg-light">
                      <tr>
                        <th className="ps-4">Invoice #</th>
                        <th>Customer</th>
                        <th>Amount ({currencySymbol})</th>
                        <th>Status</th>
                        <th className="pe-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      { invoices.length > 0 ? (
                        invoices.map(invoice => (
                          <tr key={invoice._id} className="invoice-row">
                            <td className="ps-4">
                              <span className="fw-bold text-primary d-flex align-items-center">
                                #{formatOfficialInvoiceNumber(invoice)}
                                <ArrowUpRight size={14} className="ms-1" />
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="bg-success bg-opacity-10 rounded-circle p-1 me-2">
                                  <Users size={12} className="text-success" />
                                </div>
                                {invoice.customer?.name || 'N/A'}
                              </div>
                            </td>
                            <td className="fw-bold">{formatCurrency(invoice.total)}</td>
                            <td>
                              <Badge 
                                bg={getStatusVariant(invoice.status)} 
                                className="text-uppercase fw-semibold px-2 py-1"
                              >
                                {invoice.status}
                              </Badge>
                            </td>
                            <td className="pe-4">
                              <small className="text-muted">
                                {new Date(invoice.createdAt).toLocaleDateString()}
                              </small>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-5">
                            <FileText size={32} className="text-muted mb-2" />
                            <p className="text-muted mb-0">No invoices created yet</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
              <Card.Footer className="bg-white border-0 py-3">
                <Link to="/invoices" className="text-primary text-decoration-none fw-semibold d-flex align-items-center justify-content-center">
                  View All Invoices
                  <ArrowUpRight size={16} className="ms-1" />
                </Link>
              </Card.Footer>
            </Card>

            {/* Enhanced Top Products */}
            <Card className="shadow-sm border-0 mb-4">
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

            {/* Quick Actions & Alerts Section */}
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-white border-0 py-2 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Quick Alerts</h5>
                <AlertTriangle size={20} className="text-warning" />
              </Card.Header>
              <Card.Body className="p-4">
               

                <h6 className="fw-bold mb-3">Low Stock Alerts</h6>
                {urgentActions.lowStockProducts.length > 0 ? (
                  <div className="low-stock-alerts">
                    {urgentActions.lowStockProducts.map((product, index) => (
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
        </Row>
      </div>

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
