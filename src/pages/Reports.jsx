import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Spinner, Alert, Button, Badge, Table, Modal } from 'react-bootstrap';
import axios from 'axios';
import { TrendingUp, DollarSign, Clock, Package, BarChart, RefreshCw, ChevronUp, ChevronDown, Users, CheckCircle, FileText, Eye } from 'lucide-react';
import { API_BASE_URL } from '../config';
import StatCard from '../components/StatCard';

// API Endpoints
const SETTINGS_API_BASE_URL = `${API_BASE_URL}/settings`;

const getStatusBadge = (status) => {
    switch (status) {
        case 'Completed': return <Badge bg="success" className="px-2 py-1">Completed</Badge>;
        case 'In Progress': return <Badge bg="primary" className="px-2 py-1">In Progress</Badge>;
        case 'Pending': return <Badge bg="warning" className="px-2 py-1">Pending</Badge>;
        default: return <Badge bg="secondary" className="px-2 py-1">{status}</Badge>;
    }
};

const Reports = ({ userRole = 'admin' }) => {
  const [invoices, setInvoices] = useState([]);
  const [staffLogs, setStaffLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });
  
  // NEW STATE: Dynamic Currency
  const [currencySymbol, setCurrencySymbol] = useState('₹'); 
  const [currencyCode, setCurrencyCode] = useState('INR'); 

  // Modal State
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null); 

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  
  // Helper to format currency based on state
  const formatCurrency = (amount) => {
    // Ensure amount is a number
    const numAmount = Number(amount) || 0;
    
    // Use Intl.NumberFormat for robust formatting
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);

    // Replace the default symbol if a custom one is defined, or fallback
    if (formatted.includes(currencyCode)) {
        return formatted.replace(currencyCode, currencySymbol).trim();
    }
    
    return `${currencySymbol} ${numAmount.toFixed(2).toLocaleString()}`;
  };

  // --- Data Fetching ---
  
  const fetchSettings = useCallback(async () => {
    try {
        const res = await axios.get(SETTINGS_API_BASE_URL, { headers: getAuthHeaders() });
        const currencySetting = res.data.company?.currency || 'INR';
        setCurrencyCode(currencySetting);
        
        // Simple mapping for common symbols, fallback to code if needed
        const symbolMap = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AUD': 'A$', 'CAD': 'C$' };
        setCurrencySymbol(symbolMap[currencySetting] || currencySetting);
    } catch (error) {
        console.warn("Could not fetch currency settings, defaulting to INR.");
    }
  }, []);


  const fetchInvoices = useCallback(async () => {
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/invoices?limit=1000`, { 
        headers: getAuthHeaders()
      });
      
      const invoicesData = response.data.invoices || response.data;
      
      const processedInvoices = Array.isArray(invoicesData) 
        ? invoicesData.map(inv => ({ 
            ...inv, 
            status: (inv.status || '').toLowerCase(), 
            total: parseFloat(inv.total) || 0.00 
        }))
        : [];
      
      setInvoices(processedInvoices);
    } catch (err) {
      console.error('Error fetching invoice report data:', err);
      setError('Failed to load financial data. Check API connection.');
    }
  }, []);

  const fetchStaffLogs = useCallback(async () => {
      if (userRole !== 'admin') return; 
      
      try {
          const response = await axios.get(`${API_BASE_URL}/stafflogs`, { 
              headers: getAuthHeaders() 
          });
          
          const logsData = response.data || [];
          setStaffLogs(Array.isArray(logsData) ? logsData : []);
      } catch (err) {
          console.error('Error fetching staff log data:', err);
      }
  }, [userRole]);

  const initialFetch = useCallback(async () => {
      setLoading(true);
      setError(null);
      await Promise.all([
          fetchSettings(), // Fetch settings first
          fetchInvoices(),
          fetchStaffLogs()
      ]);
      setLoading(false);
  }, [fetchSettings, fetchInvoices, fetchStaffLogs]);

  useEffect(() => {
    initialFetch();
  }, [initialFetch]);

  // --- Data Analysis ---

  const { totalRevenue, outstanding } = useMemo(() => {
    let revenue = 0;
    let outstandingBalance = 0;

    invoices.forEach(inv => {
      if (inv.status === 'paid') {
        revenue += inv.total;
      } else if (inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'draft') {
        outstandingBalance += inv.total;
      }
    });

    return { totalRevenue: revenue, outstanding: outstandingBalance };
  }, [invoices]);

  const salesByMonth = useMemo(() => {
    const monthlySales = {};
    invoices.forEach(inv => {
      if (inv.status === 'paid') {
        const date = new Date(inv.createdAt);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlySales[monthYear] = (monthlySales[monthYear] || 0) + inv.total;
      }
    });
    return Object.keys(monthlySales).sort().map(key => ({ month: key, sales: monthlySales[key] }));
  }, [invoices]);

  const topProducts = useMemo(() => {
    const productSales = {};
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const productId = item.product?._id || item.product;
        const productName = item.description || item.product?.name || 'Unknown Product';
        const quantity = parseFloat(item.quantity) || 0;
        
        if (productId) {
          if (!productSales[productId]) {
            productSales[productId] = { name: productName, totalQuantity: 0, totalRevenue: 0 };
          }
          productSales[productId].totalQuantity += quantity;
          productSales[productId].totalRevenue += (parseFloat(item.price) || 0) * quantity;
        }
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity) 
      .slice(0, 5); 
  }, [invoices]);
  
  const staffLogSummary = useMemo(() => {
    const totalTasks = staffLogs.length;
    const completedTasks = staffLogs.filter(log => log.status === 'Completed').length;
    const pendingTasks = staffLogs.filter(log => log.status === 'Pending' || log.status === 'In Progress').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    const uniqueStaff = [...new Set(staffLogs.map(log => log.userName).filter(name => name))].length;

    return { totalTasks, completedTasks, pendingTasks, completionRate, uniqueStaff };
  }, [staffLogs]);


  // --- Sorting Logic for Staff Logs Table ---

  const sortedLogs = useMemo(() => {
    let sortableItems = [...staffLogs];
    
    sortableItems.sort((a, b) => {
      if (sortConfig.key === 'createdAt' || sortConfig.key === 'date') {
        const dateA = new Date(a[sortConfig.key]);
        const dateB = new Date(b[sortConfig.key]);
        if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      } 
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });

    return sortableItems;
  }, [staffLogs, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ChevronUp size={14} className="ms-1" /> : <ChevronDown size={14} className="ms-1" />;
  };

  // FIXED: Removed duplicate function and used getSortIcon directly

  // --- Loading State ---
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50">
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading reports...</span>
      </div>
    );
  }

  // --- Error State ---
  if (error && invoices.length === 0) {
    return (
      <div className="p-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Reports</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={initialFetch}>
            <RefreshCw size={16} className="me-2" /> Retry
          </Button>
        </Alert>
      </div>
    );
  }

  // --- Staff Logs Detail Modal ---
  const LogDetailsModal = ({ show, onHide, log }) => {
      if (!log) return null;
      return (
          <Modal show={show} onHide={onHide} centered>
              <Modal.Header closeButton>
                  <Modal.Title className="fw-bold">Activity Details</Modal.Title>
              </Modal.Header>
              <Modal.Body className="p-4">
                  <div className="mb-3 d-flex justify-content-between align-items-center">
                      <h5 className="mb-0 fw-bold">{log.userName}</h5>
                      {getStatusBadge(log.status)}
                  </div>
                  <hr className="text-muted opacity-25" />
                  <div className="mb-3">
                      <label className="text-muted small text-uppercase fw-bold">Configuration / Category</label>
                      <div className="fw-semibold">{log.category}</div>
                  </div>
                  <div className="mb-3">
                      <label className="text-muted small text-uppercase fw-bold">Date & Time</label>
                      <div>
                          {new Date(log.date || log.createdAt).toLocaleDateString()} 
                          <span className="text-muted ms-2">
                              {new Date(log.date || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                      </div>
                  </div>
                  <div className="mb-3">
                      <label className="text-muted small text-uppercase fw-bold">Full Details</label>
                      <div className="p-3 bg-light rounded border">
                          {log.details || 'No additional details provided.'}
                      </div>
                  </div>
              </Modal.Body>
              <Modal.Footer>
                  <Button variant="secondary" onClick={onHide}>Close</Button>
              </Modal.Footer>
          </Modal>
      );
  };

  // --- Staff Logs Detail Table Component (Inner Component) ---
  const StaffLogsTable = () => (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-white py-3 border-bottom">
        <h5 className="mb-0 fw-bold">Detailed Staff Activity Log ({staffLogs.length} Records)</h5>
      </Card.Header>
      <Card.Body className="p-0">
        {sortedLogs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Users size={48} className="mb-3 opacity-25" />
              <p className="mb-0">No staff activity logs found.</p>
            </div>
        ) : (
            <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr>
                            <th className="py-3 ps-4" style={{ width: '50px' }}>#</th>
                            <th 
                              onClick={() => requestSort('userName')} 
                              className="cursor-pointer py-3"
                              style={{ minWidth: '120px' }}
                            >
                                Staff Name {getSortIcon('userName')}
                            </th>
                            <th 
                              onClick={() => requestSort('category')} 
                              className="cursor-pointer py-3"
                              style={{ minWidth: '120px' }}
                            >
                                Category {getSortIcon('category')}
                            </th>
                            <th className="py-3" style={{ minWidth: '200px' }}>Task Details</th>
                            <th 
                              onClick={() => requestSort('status')} 
                              className="cursor-pointer py-3 text-center"
                              style={{ minWidth: '120px' }}
                            >
                                Status {getSortIcon('status')}
                            </th>
                            <th 
                              onClick={() => requestSort('date')} 
                              className="cursor-pointer py-3"
                              style={{ minWidth: '120px' }}
                            >
                                Activity Date {getSortIcon('date')}
                            </th>
                            <th 
                              onClick={() => requestSort('createdAt')} 
                              className="cursor-pointer py-3"
                              style={{ minWidth: '150px' }}
                            >
                                Logged Time {getSortIcon('createdAt')}
                            </th>
                            <th className="py-3 text-end pe-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedLogs.map((log, index) => (
                            <tr key={log._id || index}>
                                <td className="ps-4">{index + 1}</td>
                                <td>
                                    <Badge bg="info" className="text-dark bg-opacity-25 px-2 py-1">
                                        {log.userName || 'N/A'}
                                    </Badge>
                                </td>
                                <td className="text-muted">{log.category || '-'}</td>
                                <td>
                                    <div className="text-truncate" style={{ maxWidth: '200px' }} title={log.details}>
                                        {log.details || 'No details provided'}
                                    </div>
                                </td>
                                <td className="text-center">{getStatusBadge(log.status)}</td>
                                <td className="text-nowrap">
                                    {log.date ? new Date(log.date).toLocaleDateString() : '-'}
                                </td>
                                <td className="text-muted small text-nowrap">
                                    {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    }) : '-'}
                                </td>
                                <td className="text-end pe-4">
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm" 
                                        onClick={() => { setSelectedLog(log); setShowLogModal(true); }}
                                        title="View Details"
                                    >
                                        <Eye size={16} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        )}
      </Card.Body>
    </Card>
  );


  // --- Main Component Structure ---
  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Business Reports</h2>
          <p className="text-muted mb-0">Analytics, performance insights, and activity logs.</p>
        </div>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={initialFetch} 
          className="shadow-sm d-flex align-items-center"
          disabled={loading}
        >
          <RefreshCw size={16} className={`me-2 ${loading ? 'spin' : ''}`} /> 
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
      
      {/* Dynamic Currency Display */}
      <Alert variant="info" className="mb-4 py-2 px-3 d-flex align-items-center">
          <DollarSign size={16} className="me-2" />
          <span>Primary Reporting Currency: </span>
          <Badge bg="info" className="ms-2 text-uppercase">
            {currencyCode} ({currencySymbol})
          </Badge>
      </Alert>

      {error && !loading && (
        <Alert variant="warning" className="mb-4" dismissible onClose={() => setError(null)}>
          <Alert.Heading>Partial Data Loaded</Alert.Heading>
          <p className="mb-0">{error} Some data may be incomplete.</p>
        </Alert>
      )}

      

      {/* 2. STAFF LOGS SUMMARY (Admin Only) */}
      {userRole === 'admin' && (
        <>
          <h5 className="fw-bold text-dark mb-3 ps-1 d-flex align-items-center">
            <Users size={20} className="me-2" />
            Staff Activity Overview
          </h5>
          <Row className="g-3 mb-4">
              <Col xl={3} md={6}>
                  <StatCard
                    title="Total Tasks"
                    value={staffLogSummary.totalTasks}
                    subtitle="Tasks by all staff"
                    icon={FileText}
                    color="primary"
                    loading={loading}
                  />
              </Col>
              <Col xl={3} md={6}>
                  <StatCard
                    title="Tasks Completed"
                    value={staffLogSummary.completedTasks}
                    subtitle={`${staffLogSummary.completionRate.toFixed(1)}% Completion Rate`}
                    icon={CheckCircle}
                    color="success"
                    loading={loading}
                  />
              </Col>
              <Col xl={3} md={6}>
                  <StatCard
                    title="Pending / In Progress"
                    value={staffLogSummary.pendingTasks}
                    subtitle="Requires follow-up"
                    icon={Clock}
                    color="warning"
                    loading={loading}
                  />
              </Col>
              <Col xl={3} md={6}>
                  <StatCard
                    title="Active Staff"
                    value={staffLogSummary.uniqueStaff}
                    subtitle="Logged activity recently"
                    icon={Users}
                    color="info"
                    loading={loading}
                  />
              </Col>
          </Row>
          
          <StaffLogsTable />
        </>
      )}

      {/* 3. PERFORMANCE INSIGHTS */}
      <h5 className="fw-bold text-dark mb-3 ps-1 d-flex align-items-center">
        <TrendingUp size={20} className="me-2" />
        Performance Insights
      </h5>
      <Row className="g-3">
        {/* Sales Trend */}
        <Col lg={6}>
             <Card className="shadow-sm border-0 h-100">
                <Card.Header className="bg-white py-3 fw-bold border-bottom d-flex align-items-center">
                     <BarChart size={18} className="me-2" />
                     Monthly Sales Trend (Paid)
                </Card.Header>
                <Card.Body className="p-0">
                  {salesByMonth.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <DollarSign size={48} className="mb-3 opacity-25" />
                      <p className="mb-0">No paid sales data available yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '300px' }}>
                      <Table hover className="mb-0 align-middle">
                        <thead className="bg-light sticky-top">
                            <tr>
                                <th className="ps-4">Month</th>
                                <th className="text-end pe-4">Total Sales</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesByMonth.map((item, index) => (
                              <tr key={item.month}>
                                <td className="ps-4">
                                  <div className="d-flex align-items-center">
                                    <span className={`badge bg-opacity-10 me-2 ${index % 2 === 0 ? 'bg-primary' : 'bg-info'}`}>
                                      {index + 1}
                                    </span>
                                    <span className="fw-semibold">{item.month}</span>
                                  </div>
                                </td>
                                <td className="text-end pe-4">
                                  <span className="fw-bold text-success">{formatCurrency(item.sales)}</span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
                {salesByMonth.length > 0 && (
                  <Card.Footer className="bg-light py-2">
                    <small className="text-muted">
                      Showing {salesByMonth.length} months of data
                    </small>
                  </Card.Footer>
                )}
             </Card>
        </Col>

        {/* Top Products */}
        <Col lg={6}>
            <Card className="shadow-sm border-0 h-100">
                <Card.Header className="bg-white py-3 fw-bold border-bottom d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <Package size={18} className="me-2" />
                        Top Selling Products
                    </div>
                    <Badge bg="primary" pill>Top 5</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                  {topProducts.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <Package size={48} className="mb-3 opacity-25" />
                      <p className="mb-0">No products sold yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table hover className="mb-0 align-middle">
                          <thead className="bg-light">
                              <tr>
                                  <th className="ps-4" style={{ width: '50px' }}>Rank</th>
                                  <th className="ps-2">Product</th>
                                  <th className="text-center" style={{ width: '100px' }}>Sold</th>
                                  <th className="text-end pe-4" style={{ width: '120px' }}>Revenue</th>
                              </tr>
                          </thead>
                          <tbody>
                            {topProducts.map((product, index) => (
                              <tr key={index}>
                                <td className="ps-4">
                                  <div className={`rounded-circle d-flex align-items-center justify-content-center ${index === 0 ? 'bg-warning bg-opacity-25' : 'bg-light'}`} 
                                       style={{width: '32px', height:'32px', fontSize: '14px', fontWeight: 'bold'}}>
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="ps-2">
                                  <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '200px' }} title={product.name}>
                                    {product.name}
                                  </div>
                                </td>
                                <td className="text-center">
                                  <Badge bg="info" className="text-dark bg-opacity-25 px-2 py-1">
                                    {product.totalQuantity}
                                  </Badge>
                                </td>
                                <td className="text-end pe-4 fw-bold text-dark">
                                  {formatCurrency(product.totalRevenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
                {topProducts.length > 0 && (
                  <Card.Footer className="bg-light border-0 py-3">
                    <Row className="text-center g-2">
                      <Col xs={12} md={4} className="mb-3 mb-md-0">
                        <div className="d-flex flex-column h-100 justify-content-center">
                          <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.75rem'}}>
                            Total Items Sold
                          </small>
                          <span className="fw-bold text-primary fs-5">
                            {topProducts.reduce((sum, p) => sum + p.totalQuantity, 0)}
                          </span>
                        </div>
                      </Col>
                      <Col xs={12} md={4} className="border-md-start mb-3 mb-md-0">
                        <div className="d-flex flex-column h-100 justify-content-center">
                          <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.75rem'}}>
                            Top Performer
                          </small>
                          <span className="fw-bold text-success text-truncate px-2" 
                                style={{ fontSize: '0.9rem' }} 
                                title={topProducts[0]?.name}>
                            {topProducts[0]?.name || '-'}
                          </span>
                        </div>
                      </Col>
                      <Col xs={12} md={4} className="border-md-start">
                        <div className="d-flex flex-column h-100 justify-content-center">
                          <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.75rem'}}>
                            Total Revenue
                          </small>
                          <span className="fw-bold text-dark fs-6">
                            {formatCurrency(topProducts.reduce((sum, p) => sum + p.totalRevenue, 0))}
                          </span>
                        </div>
                      </Col>
                    </Row>
                  </Card.Footer>
                )}
            </Card>
        </Col>
      </Row>

      {/* Add CSS for spinner animation */}
      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <style jsx>{`
        @media (min-width: 768px) {
          .border-md-start {
            border-left: 1px solid #dee2e6 !important;
          }
        }
      `}</style>
      
      {/* Log Details Modal */}
      <LogDetailsModal 
        show={showLogModal} 
        onHide={() => setShowLogModal(false)} 
        log={selectedLog} 
      />
    </div>
  );
};

export default Reports;