// History.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Row, Col, Form, Badge, Button, Alert } from 'react-bootstrap';
import { Calendar, Filter, Download, DollarSign, FileText, Clock } from 'lucide-react';
import StatCard from '../components/StatCard';
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

  // NEW STATE: Global Stats
  const [invoiceStats, setInvoiceStats] = useState({
      totalCount: 0,
      totalRevenue: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      draftCount: 0
  }); 

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

  const fetchInvoiceStats = useCallback(async () => {
    try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/invoices/stats`, { headers: { Authorization: `Bearer ${token}` } });
        setInvoiceStats(res.data);
    } catch (err) {
        console.error("Error fetching invoice stats in History:", err);
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
          fetchSettings(), 
          fetchTransactions(),
          fetchInvoiceStats() // NEW
      ]);
      setLoading(false);
  }, [fetchSettings, fetchTransactions]);


  useEffect(() => {
    initialFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFetch]); 

  // --- Sorting and Summaries ---
  
  // 1. Sort the transactions by creation date (Ascending, for sequential numbering)
  const sortedTransactions = useMemo(() => {
    return transactions.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [transactions]);
  
  const transactionsList = sortedTransactions; 
  
  // 2. Client-side filtered revenue replaced by Global Stats

  
  // --- Action Handlers ---
  
  const handleStatusChange = async (invoiceId, newStatus) => {
    // Optimistic Update
    const originalTransactions = [...transactions];
    setTransactions(prev => prev.map(t => 
        t._id === invoiceId ? { ...t, status: newStatus } : t
    ));

    try {
        const token = localStorage.getItem('token');
        await axios.patch(`${API_BASE_URL}/invoices/${invoiceId}/status`, 
            { status: newStatus },
            { headers: { Authorization: `Bearer ${token}` } }
        );
    } catch (err) {
        console.error("Failed to update status:", err);
        setTransactions(originalTransactions);
        alert("Failed to update status. Please try again.");
    }
  };

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
      // alert('Transaction history exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      // alert('Error exporting transactions.');
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
          <StatCard
            title="Total Revenue"
            value={formatCurrency(invoiceStats.totalRevenue)}
            subtitle="All paid transactions"
            icon={DollarSign}
            color="success"
          />
        </Col>
        <Col md={4}>
          <StatCard
            title="Total Transactions"
            value={invoiceStats.totalCount}
            subtitle="All time (Global)"
            icon={FileText}
            color="primary"
          />
        </Col>
        <Col md={4}>
          <StatCard
            title="Outstanding Count"
            value={invoiceStats.pendingCount}
            subtitle="Unpaid Invoices"
            icon={Clock}
            color="warning"
          />
        </Col>
      </Row>
      
      {/* Dynamic Currency Display Alert */}
      <Alert variant="info" className="mb-4 py-2 small">
          Transactions Displayed in: <strong className='text-uppercase'>{currencyCode} ({currencySymbol})</strong>
      </Alert>


      {/* Filters */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white py-3">
          <Row className="gx-3 align-items-center">
            <Col md={3} sm={6}>
                 <Form.Select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-light"
                  aria-label="Filter by Status"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="draft">Draft</option>
                </Form.Select>
            </Col>

            <Col md={3} sm={6}>
                <div className="position-relative">
                    <Form.Control
                      type="date"
                      placeholder="Start Date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      className="" 
                      aria-label="Start Date"
                    />
                </div>
            </Col>
            
            <Col md={3} sm={6}>
                <div className="position-relative">
                    <Form.Control
                      type="date"
                      placeholder="End Date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      className=""
                      aria-label="End Date"
                    />
                </div>
            </Col>

            <Col xs="auto">
              <Button 
                variant="primary"
                onClick={handleApplyFilter}
                className='px-4' 
              >
                Apply
              </Button>
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
            <Table responsive hover className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4 py-3">Type</th>
                  <th className="py-3">Description</th>
                  <th className="py-3">Customer</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Invoice #</th>
                </tr>
              </thead>
              <tbody>
                {transactionsList.map((transaction, index) => (
                  <tr key={transaction._id}>
                    <td className="ps-4 py-3">
                      <div className="d-flex align-items-center">
                        <span className="me-2">{getTypeIcon('invoice')}</span>
                        <span className="text-capitalize">Invoice</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div>
                        <div className="fw-semibold">Invoice Payment</div>
                        <small className="text-muted">{transaction.items?.length || 0} items</small>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px' }}>
                          <span className="text-white fw-bold small">
                            {transaction.customer?.name?.charAt(0)?.toUpperCase() || 'C'}
                          </span>
                        </div>
                        {transaction.customer?.name || 'N/A'}
                      </div>
                    </td>
                    <td className={`fw-semibold py-3 text-${getStatusVariant(transaction.status)}`}>
                      {formatCurrency(transaction.total)}
                    </td>
                    <td className="py-3">
                      <Form.Select 
                        size="sm"
                        value={transaction.status}
                        onChange={(e) => handleStatusChange(transaction._id, e.target.value)}
                        className={`border-${getStatusVariant(transaction.status)} text-${getStatusVariant(transaction.status)} fw-bold bg-${getStatusVariant(transaction.status)} bg-opacity-10`}
                        style={{width: 'auto', minWidth: '100px', fontSize: '0.875rem'}}
                      >
                         <option value="paid" className="text-success fw-bold">Paid</option>
                         <option value="pending" className="text-warning fw-bold">Pending</option>
                         <option value="overdue" className="text-danger fw-bold">Overdue</option>
                         <option value="draft" className="text-secondary fw-bold">Draft</option>
                      </Form.Select>
                    </td>
                    <td className="text-muted py-3">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="fw-semibold text-primary py-3">
                      <div className='d-flex flex-column'>
                        <span className='fw-bold'>#{transaction.invoiceNumber}</span>
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