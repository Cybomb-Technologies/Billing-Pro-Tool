import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Row, Col, Button, Badge, Form, Modal, ProgressBar, InputGroup, Alert } from 'react-bootstrap';
import { Plus, Search, Package, AlertTriangle, TrendingUp, Edit, Zap, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';

const SETTINGS_API_BASE_URL = `${API_BASE_URL}/settings`;

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  
  // State for Modals/Forms
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [restockAmount, setRestockAmount] = useState(0);

  // --- CURRENCY STATE ---
  const [currencySymbol, setCurrencySymbol] = useState('₹'); 
  const [currencyCode, setCurrencyCode] = useState('INR'); 
  
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 4000);
  };
  
  // Helper to format currency based on state
  const formatCurrency = (amount) => {
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
  };
  
  // --- Data Fetching ---

  const fetchSettings = useCallback(async () => {
    try {
        const res = await axios.get(SETTINGS_API_BASE_URL, { headers: getAuthHeaders() });
        const currencySetting = res.data.company?.currency || 'INR';
        setCurrencyCode(currencySetting);
        
        const symbolMap = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AUD': 'A$', 'CAD': 'C$' };
        setCurrencySymbol(symbolMap[currencySetting] || currencySetting);
    } catch (error) {
        console.warn("Could not fetch currency settings for Inventory, defaulting to INR.");
    }
  }, []);


  const fetchInventory = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 }
      });

      const productsData = response.data.products || response.data;
      const productsArray = Array.isArray(productsData) ? productsData : [];

      const productsWithStock = productsArray.map(product => ({
        ...product,
        stock: product.stock ?? 0,
        costPrice: product.costPrice ?? product.price * 0.5,
        lowStockThreshold: product.lowStockThreshold ?? 10
      }));

      setProducts(productsWithStock);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      showAlert('Error fetching inventory data.', 'danger');
    }
  }, []);

  const initialFetch = useCallback(async () => {
      await Promise.all([
          fetchSettings(),
          fetchInventory()
      ]);
  }, [fetchSettings, fetchInventory]);

  useEffect(() => {
    initialFetch();
  }, [initialFetch]);

  // --- Derived Metrics (using useMemo) ---
  const lowStockProducts = useMemo(() => 
    products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold)
  , [products]);
  
  const outOfStockProducts = useMemo(() => 
    products.filter(p => p.stock === 0)
  , [products]);
  
  const totalInventoryValue = useMemo(() => 
    // Calculate total inventory value using costPrice
    products.reduce((sum, p) => sum + ((p.costPrice || p.price || 0) * (p.stock || 0)), 0)
  , [products]);


  // --- Action Handlers ---

  const openRestockModal = (product) => {
    setCurrentProduct(product);
    setRestockAmount(1); // Default restock amount
    setShowRestockModal(true);
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!currentProduct || restockAmount <= 0) return;

    try {
        const token = localStorage.getItem('token');
        const newStock = currentProduct.stock + restockAmount;
        
        await axios.put(`${API_BASE_URL}/products/${currentProduct._id}/stock`, {
            stock: newStock 
        }, {
          headers: getAuthHeaders()
        });

        // Optimistic UI update
        setProducts(prev => prev.map(p => 
            p._id === currentProduct._id ? { ...p, stock: newStock } : p
        ));
        
        showAlert(`Successfully restocked ${restockAmount} units of ${currentProduct.name}.`, 'success');
        setShowRestockModal(false);
        setCurrentProduct(null);

    } catch (error) {
        console.error('Restock error:', error);
        showAlert('Error performing restock. Check console.', 'danger');
    }
  };

  // --- Display Helpers ---

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockVariant = (stock, threshold) => {
    if (stock === 0) return 'danger';
    if (stock <= threshold) return 'warning';
    return 'success';
  };

  const getStockPercentage = (stock, max = 100) => {
    const effectiveMax = Math.max(max, 100); 
    return Math.min(100, (stock / effectiveMax) * 100);
  };
  
  const getStockStatusLabel = (stock, threshold) => {
      if (stock === 0) return 'Out of Stock';
      if (stock <= threshold) return 'Low Stock';
      return 'In Stock';
  }

  return (
    <div className="p-4 d-flex flex-column flex-grow-1">
      {/* Alert */}
      {alert.show && (
        <Alert variant={alert.type} className="position-fixed top-0 end-0 m-3" style={{ zIndex: 1050 }}>
          {alert.message}
        </Alert>
      )}
      
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-1">Inventory Management</h2>
          <p className="text-muted mb-0">Track and manage your product inventory</p>
        </Col>
        <Col xs="auto">
          {/* <Button variant="outline-secondary" className="d-flex align-items-center me-2" onClick={initialFetch}>
            <RefreshCw size={18} className="me-2" /> Refresh Data
          </Button> */}
          <Link to="/products" className='text-decoration-none'>
            <Button variant="success" className="d-flex align-items-center">
              <Plus size={18} className="me-2" />
              Add New Product
            </Button>
          </Link>
        </Col>
      </Row>
      
      <Alert variant="info" className="mb-4 py-2 small">
          Inventory Value tracked in: <strong className='text-uppercase'>{currencyCode} ({currencySymbol})</strong>
      </Alert>


      {/* Stats Cards */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <StatCard
            title="Total Products"
            value={products.length}
            icon={Package}
            color="primary"
          />
        </Col>
        <Col md={3}>
          <StatCard
            title="Low Stock"
            value={lowStockProducts.length}
            icon={AlertTriangle}
            color="warning"
          />
        </Col>
        <Col md={3}>
           <StatCard
            title="Out of Stock"
            value={outOfStockProducts.length}
            icon={AlertTriangle} // Or maybe XCircle? AlertTriangle is fine.
            color="danger"
          />
        </Col>
        <Col md={3}>
          <StatCard
            title="Inventory Value (Cost)"
            value={formatCurrency(totalInventoryValue)}
            icon={TrendingUp}
            color="success"
          />
        </Col>
      </Row>

      {/* Main Inventory Table */}
      <Card className="shadow-sm border-0 mb-4 flex-grow-1 d-flex flex-column">
        <Card.Header className="bg-white py-3">
          <Row className="align-items-center">
            <Col md={6}>
              <div className="position-relative">
                <Search size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <Form.Control
                  type="text"
                  placeholder="Search inventory (name, SKU, category)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ps-5"
                />
              </div>
            </Col>
            <Col md={6} className="text-end">
              <Badge bg="light" text="dark" className="fs-6">
                Showing {filteredProducts.length} of {products.length} items
              </Badge>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="p-0 flex-grow-1 d-flex flex-column">
          <div className="table-responsive flex-grow-1">
            <Table hover className="mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th className="ps-4 py-3">Product</th>
                <th className="py-3">SKU</th>
                <th className="py-3">Category</th>
                <th className="py-3">Price</th>
                <th className="py-3">Stock Level</th>
                <th className="py-3">Status</th>
                <th style={{ width: '' }} className="text-center py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product._id}>
                  <td className="ps-4 py-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                        <Package size={18} className="text-muted" />
                      </div>
                      <div>
                        <div className="fw-semibold">{product.name}</div>
                        <small className="text-muted">{product.description}</small>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge bg="outline-secondary" className="border border-secondary text-dark">
                      {product.sku || 'N/A'}
                    </Badge>
                  </td>
                  <td className="py-3">{product.category || 'N/A'}</td>
                  <td className="fw-semibold py-3">{formatCurrency(product.price)}</td>
                  <td className="py-3">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1 me-3">
                        <ProgressBar 
                          variant={getStockVariant(product.stock, product.lowStockThreshold)}
                          now={getStockPercentage(product.stock)}
                          style={{ height: '6px' }}
                        />
                      </div>
                      <small className="fw-semibold">{product.stock} units</small>
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge bg={getStockVariant(product.stock, product.lowStockThreshold)} className="rounded-pill">
                      {getStockStatusLabel(product.stock, product.lowStockThreshold)}
                    </Badge>
                  </td>
                  <td className="py-3">
                  <div className="d-flex gap-2 justify-content-end">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="d-flex align-items-center"
                        title="Restock Product"
                        onClick={() => openRestockModal(product)}
                      >
                        <Zap size={14} className="me-1" />
                        Restock
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
               {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No products found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Restock Modal */}
      <Modal show={showRestockModal} onHide={() => setShowRestockModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5">Restock: {currentProduct?.name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRestock}>
          <Modal.Body>
            <p>Current Stock: <Badge bg={getStockVariant(currentProduct?.stock, currentProduct?.lowStockThreshold)}>{currentProduct?.stock} units</Badge></p>
            <Form.Group className="mb-3">
              <Form.Label>Amount to Restock</Form.Label>
              <InputGroup>
                <Form.Control
                  type="number"
                  min="1"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(parseInt(e.target.value) || 0)}
                  required
                />
                <InputGroup.Text>units</InputGroup.Text>
              </InputGroup>
            </Form.Group>
            {currentProduct && (
              <Alert variant="info">
                New Stock Level will be: <strong>{currentProduct.stock + restockAmount} units</strong>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="secondary" onClick={() => setShowRestockModal(false)}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={restockAmount <= 0}>
              <Zap size={16} className="me-2" />
              Confirm Restock
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;
