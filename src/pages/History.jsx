// History.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Row, Col, Form, Badge, Button, Alert } from 'react-bootstrap';
import { Calendar, Filter, Download } from 'lucide-react';
import axios from 'axios';

import { API_BASE_URL } from '../config';
const SETTINGS_API_BASE_URL = `${API_BASE_URL}/settings`;

const History = () => {
  const [transactions, setTransactions] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // NEW STATE: Dynamic Currency
  const [currencySymbol, setCurrencySymbol] = useState('₹'); 
  const [currencyCode, setCurrencyCode] = useState('INR'); 

  // --- Utility Functions ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'danger';
      case 'draft': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'invoice': return '📄';
      case 'payment': return '💳';
      case 'refund': return '↩️';
      default: return '📊';
    }
  };
  
  const parseAmount = (amount) => {
    return parseFloat(amount) || 0.00;
  };
  
  const getSequentialInvoiceNumber = (index) => {
      return `INV-${(index + 1).toString().padStart(4, '0')}`;
  }

  // Helper to format currency based on state
  const formatCurrency = (amount) => {
    const numAmount = Number(amount) || 0;
    
    // Use Intl.NumberFormat for robust formatting
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);

    // Replace the default symbol if a custom one is preferred/defined
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
        
        // Simple mapping for common symbols
        const symbolMap = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AUD': 'A$', 'CAD': 'C$' };
        setCurrencySymbol(symbolMap[currencySetting] || currencySetting);
    } catch (error) {
        console.warn("Could not fetch currency settings, defaulting to INR.");
    }
  }, []);


  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      const params = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      if (dateRange.start) {
        params.start = dateRange.start;
      }
      if (dateRange.end) {
        params.end = dateRange.end;
      }

      const response = await axios.get(`${API_BASE_URL}/invoices`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const transactionsData = response.data.invoices || response.data;
      
      const processedTransactions = Array.isArray(transactionsData) 
        ? transactionsData.map(t => ({...t, total: parseAmount(t.total) }))
        : [];

      setTransactions(processedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error.response?.data || error.message);
      setError('Failed to fetch transactions. Check API status.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, dateRange.start, dateRange.end]);

  
  const initialFetch = useCallback(async () => {
      setLoading(true);
      await Promise.all([
          fetchSettings(), // Fetch settings first
          fetchTransactions()
      ]);
      setLoading(false);
  }, [fetchSettings, fetchTransactions]);


  useEffect(() => {
    initialFetch();
  }, [initialFetch]);

  // --- Sorting and Summaries ---
  
  // 1. Sort the transactions by creation date (Ascending, for sequential numbering)
  const sortedTransactions = useMemo(() => {
    return transactions.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [transactions]);
  
  const transactionsList = sortedTransactions; 

  const paidTransactions = useMemo(() => 
    transactionsList.filter(t => t.status === 'paid')
  , [transactionsList]);

  const totalRevenue = useMemo(() => 
    paidTransactions.reduce((sum, t) => sum + (t.total || 0), 0)
  , [paidTransactions]);

  const pendingTransactionsCount = useMemo(() => 
    transactionsList.filter(t => t.status === 'pending').length
  , [transactionsList]);
  
  // --- Action Handlers ---

  const handleApplyFilter = () => {
    fetchTransactions();
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (dateRange.start) {
        params.start = dateRange.start;
      }
      if (dateRange.end) {
        params.end = dateRange.end;
      }

      const res = await axios.get(`${API_BASE_URL}/invoices/export`, { 
          params,
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` }
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transaction_history.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      alert('Transaction history exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      alert('Error exporting transactions.');
    }
  };


  return (
    <div className="p-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-1">Transaction History</h2>
          <p className="text-muted mb-0">Track and manage all your transactions</p>
        </Col>
        <Col xs="auto">
          <Button variant="outline-primary" className="d-flex align-items-center" onClick={handleExport}>
            <Download size={18} className="me-2" />
            Export
          </Button>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="text-center shadow-sm border-0 h-100">
            <Card.Body className="p-4">
              <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                <span className="text-success fw-bold fs-4">{formatCurrency(totalRevenue)}</span>
              </div>
              <h5 className="fw-semibold">Total Revenue</h5>
              <p className="text-muted mb-0">All paid transactions</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center shadow-sm border-0 h-100">
            <Card.Body className="p-4">
              <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                <span className="text-primary fw-bold fs-4">{transactionsList.length}</span>
              </div>
              <h5 className="fw-semibold">Total Transactions</h5>
              <p className="text-muted mb-0">Filtered transaction count</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center shadow-sm border-0 h-100">
            <Card.Body className="p-4">
              <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                <span className="text-warning fw-bold fs-4">{pendingTransactionsCount}</span>
              </div>
              <h5 className="fw-semibold">Pending</h5>
              <p className="text-muted mb-0">Awaiting payment</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Dynamic Currency Display Alert */}
      <Alert variant="info" className="mb-4 py-2 small">
          Transactions Displayed in: <strong className='text-uppercase'>{currencyCode} ({currencySymbol})</strong>
      </Alert>


      {/* Filters */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white py-3">
          <Row className="align-items-center">
            <Col md={4}>
              <div className="d-flex align-items-center">
                <Filter size={18} className="text-muted me-2" />
                <Form.Select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border-0 bg-light"
                  aria-label="Filter by Status"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="draft">Draft</option>
                </Form.Select>
              </div>
            </Col>
            <Col md={8}>
              <Row className="g-2">
                <Col>
                  <div className="position-relative">
                    <Calendar size={16} className="position-absolute top-50 start-3 translate-middle-y text-muted" />
                    <Form.Control
                      type="date"
                      placeholder="Start Date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      className="ps-5"
                      aria-label="Start Date"
                    />
                  </div>
                </Col>
                <Col>
                  <div className="position-relative">
                    <Calendar size={16} className="position-absolute top-50 start-3 translate-middle-y text-muted" />
                    <Form.Control
                      type="date"
                      placeholder="End Date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      className="ps-5"
                      aria-label="End Date"
                    />
                  </div>
                </Col>
                <Col xs="auto">
                  <Button 
                    variant="primary"
                    onClick={handleApplyFilter} 
                  >
                    Apply
                  </Button>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="p-0">
          {error && <Alert variant="danger" className="m-3">{error}</Alert>}
          {loading ? (
            <div className="text-center py-5 text-muted">
              Loading transactions...
            </div>
          ) : transactionsList.length === 0 ? (
            <div className="text-center py-5 text-muted">
              No transactions found for the selected filters.
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Invoice #</th>
                </tr>
              </thead>
              <tbody>
                {transactionsList.map((transaction, index) => (
                  <tr key={transaction._id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <span className="me-2">{getTypeIcon('invoice')}</span>
                        <span className="text-capitalize">Invoice</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="fw-semibold">Invoice Payment</div>
                        <small className="text-muted">{transaction.items?.length || 0} items</small>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px' }}>
                          <span className="text-white fw-bold small">
                            {transaction.customer?.name?.charAt(0)?.toUpperCase() || 'C'}
                          </span>
                        </div>
                        {transaction.customer?.name || 'N/A'}
                      </div>
                    </td>
                    <td className={`fw-semibold text-${getStatusVariant(transaction.status)}`}>
                      {formatCurrency(transaction.total)}
                    </td>
                    <td>
                      <Badge bg={getStatusVariant(transaction.status)} className="rounded-pill">
                        {transaction.status}
                      </Badge>
                    </td>
                    <td className="text-muted">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="fw-semibold text-primary">
                      <div className='d-flex flex-column'>
                        <span className='fw-bold'>#{getSequentialInvoiceNumber(index)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default History;