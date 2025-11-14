// InvoiceFrontend.jsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Card, Row, Col, Modal, Form, Badge, Dropdown, Alert, InputGroup, Spinner
} from 'react-bootstrap';
import {
  Plus, Download, MoreVertical, Eye, Printer, Edit, FileText, Search, X, Trash2, Box, Building, User as UserIcon // Renamed User icon for clarity
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext'; // FIX: Adjusted import path

// Base URL for settings API call
const SETTINGS_API_BASE_URL = "http://localhost:5000/api/settings";

// =========================================================================
// 1. EXTRACTED & MEMOIZED INVOICE FORM COMPONENT
// =========================================================================

const InvoiceForm = React.memo(function InvoiceForm({ 
    isEdit = false, onSubmit, onCancel, submitButtonText = "Create Invoice",
    // Props passed directly from InvoiceFrontend state/handlers
    customerSearch, setCustomerSearch, handleCustomerSearch,
    searchedCustomer, // Removed setShowCustomerForm
    handleLocalCustomerPayloadChange,
    localCustomerPayload, handleCreateCustomer,
    dueDate, setDueDate, paymentType, setPaymentType, paymentTypes,
    addItem, removeItem, updateItem, invoiceItems,
    handleProductSelect, handleItemFieldChange, products, getProductStock,
    notes, setNotes, totals, formatCurrency, currencySymbol,
    selectedCustomer 
}) {

  // Logic to show the New Customer Form/Card: 
  // Show if a search was performed (customerSearch has value) AND 
  // no customer was found (searchedCustomer is null/falsey).
  const shouldShowCustomerCard = customerSearch && (searchedCustomer === null || (searchedCustomer && !selectedCustomer));


  return (
    <Form>
      {/* SECTION 1: Customer and Payment Info */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-light fw-bold">Customer & Payment Details</Card.Header>
        <Card.Body>
          <Row>
            <Col md={6} className="border-end pe-md-4">
              <Form.Group>
                <Form.Label className="fw-bold">Customer Mobile or Business Name *</Form.Label> 
                <InputGroup>
                  <Form.Control 
                    type="text" 
                    placeholder="Enter phone or business name" 
                    value={customerSearch} 
                    onChange={(e) => setCustomerSearch(e.target.value)} 
                    onKeyPress={(e) => { if (e.key === 'Enter') handleCustomerSearch(); }}
                    aria-describedby="customerSearchHelp"
                  />
                  <Button variant="primary" onClick={handleCustomerSearch} disabled={!customerSearch.trim()}>
                    <Search size={16} /> Search
                  </Button>
                </InputGroup>
                <Form.Text id="customerSearchHelp" className="text-muted">
                  Enter phone number (primary) or full business name.
                </Form.Text>
                {/* Visual feedback for selected customer */}
                {selectedCustomer && searchedCustomer && (
                     <Alert variant="success" className="p-2 mt-2 mb-0">
                         <UserIcon size={16} className="me-2"/>
                         **Customer Selected:** {searchedCustomer.businessName || searchedCustomer.name}
                     </Alert>
                 )}
              </Form.Group>
            </Col>
            <Col md={6} className="ps-md-4">
              <Form.Group>
                <Form.Label className="fw-bold">Payment Type *</Form.Label>
                <Form.Select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} required>
                  {paymentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
               {/* <Form.Group className="mt-3">
                <Form.Label className="fw-bold">Due Date *</Form.Label>
                <Form.Control 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                  required 
                />
              </Form.Group> */}
            </Col>
          </Row>
        </Card.Body>
      </Card>


      {/* Customer Found / Create Section (Conditional on search and no customer found) */}
      {shouldShowCustomerCard ? (
        <Card className="border shadow-sm mb-4">
          <Card.Header className="bg-warning-subtle fw-bold text-dark">
             New Customer: Please Complete Details
          </Card.Header>
          <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 fw-bold">Add New Customer Details</h6>
                  {/* Note: Clearing the search input will naturally hide this card */}
                  <Button variant="link" size="sm" onClick={() => { setCustomerSearch(''); /* clearing the search hides the card */ }}>
                    <X size={16} /> Clear Search
                  </Button>
                </div>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Contact Name *</Form.Label>
                        <Form.Control 
                          type="text" 
                          name="name" 
                          value={localCustomerPayload.name} 
                          onChange={handleLocalCustomerPayloadChange} 
                          placeholder="Contact person name" 
                          required 
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Business/Organization Name</Form.Label>
                        <Form.Control 
                          type="text" 
                          name="businessName" 
                          value={localCustomerPayload.businessName} 
                          onChange={handleLocalCustomerPayloadChange} 
                          placeholder="Acme Corp" 
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Mobile Number *</Form.Label>
                        <Form.Control 
                          type="tel" 
                          name="phone" 
                          value={localCustomerPayload.phone} 
                          onChange={handleLocalCustomerPayloadChange} 
                          placeholder="Mobile number" 
                          required 
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email (Optional)</Form.Label>
                        <Form.Control 
                          type="email" 
                          name="email" 
                          value={localCustomerPayload.email} 
                          onChange={handleLocalCustomerPayloadChange} 
                          placeholder="Email address" 
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={12}>
                      <Button variant="success" onClick={handleCreateCustomer} disabled={!localCustomerPayload.name || !localCustomerPayload.phone}>
                        Create & Select Customer
                      </Button>
                    </Col>
                  </Row>
          </Card.Body>
        </Card>
      ) : null}

      {/* Invoice Items */}
      <Form.Group className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Form.Label className="mb-0 fw-bold fs-5 text-dark">
             <Box size={20} className='me-2'/>Invoice Items *
          </Form.Label>
          <Button variant="success" size="sm" onClick={addItem}>
            <Plus size={16} className="me-1" />Add Item
          </Button>
        </div>

        {invoiceItems.length > 0 ? (
          <Card className="border shadow-sm">
            <Card.Body className="p-0">
              <Table responsive className="mb-0 table-sm">
                <thead className="bg-light">
                  <tr>
                    <th>Product</th>
                    <th>Description</th>
                    <th>HSN Code</th>
                    <th>Qty</th>
                    <th>Price ({currencySymbol})</th>
                    <th>Tax %</th>
                    <th>Total ({currencySymbol})</th>
                    <th width="50"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, idx) => {
                    const stockAvailable = getProductStock(item.product);
                    const requestedQuantity = Number(item.quantity);
                    const stockIsLow = stockAvailable > 0 && stockAvailable < 5;
                    const stockIsZero = stockAvailable === 0;
                    const quantityExceedsStock = requestedQuantity > stockAvailable;
                      
                    return (
                    <tr key={`item-${idx}`}>
                      <td>
                        <Form.Select 
                          value={item.product} 
                          onChange={(e) => handleProductSelect(idx, e.target.value)} 
                          required
                        >
                          <option value="">Select Product</option>
                          {products.map(p => (
                            <option 
                              key={p._id} 
                              value={p._id}
                              disabled={Number(p.stock) === 0} 
                            >
                              {p.name} - {formatCurrency(p.price)}
                              {Number(p.stock) === 0 && ' (Out of Stock)'}
                              {Number(p.stock) > 0 && Number(p.stock) < 5 && ` (Low: ${p.stock})`}
                            </option>
                          ))}
                        </Form.Select>
                      </td>
                      <td>
                        <Form.Control 
                          type="text" 
                          value={item.description} 
                          onChange={(e) => handleItemFieldChange(idx, 'description', e.target.value)} 
                          placeholder="Description" 
                          required 
                        />
                      </td>
                      <td>
                        <Form.Control 
                          type="text" 
                          value={item.hsnCode} 
                          onChange={(e) => handleItemFieldChange(idx, 'hsnCode', e.target.value)} 
                          placeholder="HSN" 
                        />
                      </td>
                      <td>
                        <Form.Control 
                          type="number" 
                          min="1" 
                          value={item.quantity} 
                          onChange={(e) => {
                            const value = Math.max(1, parseInt(e.target.value) || 1);
                            handleItemFieldChange(idx, 'quantity', value);
                          }} 
                          required 
                          className={quantityExceedsStock ? 'border-danger' : ''}
                          
                        />
                         {item.product && (
                            <small className={stockIsZero ? 'text-danger fw-bold' : stockIsLow ? 'text-warning fw-bold' : 'text-success'}>
                                <Box size={10} className='me-1' />
                                {stockIsZero 
                                    ? 'Out of Stock' 
                                    : quantityExceedsStock
                                    ? `Only ${stockAvailable} in stock!`
                                    : `In Stock: ${stockAvailable}`
                                }
                            </small>
                         )}
                      </td>
                      <td>
                        <Form.Control 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          value={item.price} 
                          onChange={(e) => {
                            const value = Math.max(0, parseFloat(e.target.value) || 0);
                            handleItemFieldChange(idx, 'price', value);
                          }} 
                          required 
                        />
                      </td>
                      <td>
                        <Form.Control 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          value={item.taxRate} 
                          onChange={(e) => handleItemFieldChange(idx, 'taxRate', parseFloat(e.target.value) || 0)} 
                        />
                      </td>
                      <td className="fw-semibold text-end">
                        {formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0))}
                      </td>
                      <td>
                        <Button variant="outline-danger" size="sm" onClick={() => removeItem(idx)}>
                          <X size={16} />
                        </Button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        ) : (
          <Card className="border shadow-sm">
            <Card.Body>
              <div className="text-center text-muted py-4">
                <FileText size={32} className="mb-2" />
                <div>Add items to this invoice</div>
                <small className="text-muted">Click "Add Item" to start</small>
              </div>
            </Card.Body>
          </Card>
        )}
      </Form.Group>

      {/* Summary */}
      {invoiceItems.length > 0 && (
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="fw-bold">Notes</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={4} 
                placeholder="Additional notes for the customer..." 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Card className="border shadow-sm h-100">
              <Card.Header className="bg-primary text-white"><h6 className="mb-0 fw-bold">Invoice Summary</h6></Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.totalTax > 0 ? (
                  <>
                    <div className="d-flex justify-content-between mb-2">
                      <span>CGST ({totals.taxDetails.cgst.toFixed(2)}%):</span>
                      <span>{formatCurrency(totals.cgstAmount)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>SGST ({totals.taxDetails.sgst.toFixed(2)}%):</span>
                      <span>{formatCurrency(totals.sgstAmount)}</span>
                    </div>
                  </>
                ) : null}
                <hr className="my-2"/>
                <div className="d-flex justify-content-between fw-bold fs-5 text-primary">
                  <span>TOTAL AMOUNT:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Modal.Footer className="border-0 pt-0">
        <Button variant="light" onClick={onCancel}>Cancel</Button>
        <Button 
          variant={isEdit ? "warning" : "primary"} 
          onClick={onSubmit} 
          disabled={
            !selectedCustomer || 
            invoiceItems.length === 0 || 
            // !dueDate ||
            invoiceItems.some(item => Number(item.quantity) > getProductStock(item.product))
          }
        >
          {submitButtonText}
        </Button>
      </Modal.Footer>
    </Form>
  );
});

// =========================================================================
// 2. MAIN InvoiceFrontend COMPONENT
// =========================================================================

/**
 * InvoiceFrontend
 * - purely presentational + uses the state + actions passed via props
 */
export default function InvoiceFrontend(props) {
  const {
    invoices, customers, products, settings, 
    // form state
    selectedCustomer, setSelectedCustomer,
    invoiceItems, setInvoiceItems,
    taxDetails, setTaxDetails, 
    notes, setNotes,
    dueDate, setDueDate,
    paymentType, setPaymentType,

    // actions
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    exportInvoices,
    createCustomer,
    searchCustomerByPhone,
    addItem,
    removeItem,
    updateItem,
    calculateTotalsForItems,
    resetForm,
    getProductStock, 
    
    alert,
    showAlert
  } = props;
  
  const { user } = useAuth(); // Assume AuthContext is available

  // --- Currency & Settings Helpers ---
  const companySettings = settings.company || {};
  const paymentSettings = settings.payment || {};
  const currencyCode = companySettings.currency || 'INR';
  const currencySymbol = useMemo(() => {
    const symbolMap = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AUD': 'A$', 'CAD': 'C$' };
    return symbolMap[currencyCode] || currencyCode;
  }, [currencyCode]);

  const formatCurrency = useCallback((amount) => {
    const numAmount = Number(amount) || 0;
    
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);

    const symbolMap = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'AUD': 'A$', 'CAD': 'C$' };
    const displaySymbol = symbolMap[currencyCode] || currencyCode;

    if (formatted.includes(currencyCode)) {
        return formatted.replace(currencyCode, displaySymbol).trim();
    }
    
    return `${displaySymbol} ${numAmount.toFixed(2).toLocaleString()}`;
  }, [currencyCode, currencySymbol]);
  // --- End Currency & Settings Helpers ---

  // UI-only local state
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchedCustomer, setSearchedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  // 🐛 FIX: Removed unused showCustomerForm state variable as logic is driven by searchedCustomer
  
  const [isLoading, setIsLoading] = useState(false); 

  // UPDATED: Added businessName to local payload
  const [localCustomerPayload, setLocalCustomerPayload] = useState({
    name: '', businessName: '', email: '', phone: '', address: { street: '', city: '', state: '', zipCode: '' }
  });

  const paymentTypes = [
    { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, 
    { value: 'upi', label: 'UPI' }, { value: 'bank_transfer', label: 'Bank Transfer' }, 
    { value: 'cheque', label: 'Cheque' }
  ];

  const totals = useMemo(() => calculateTotalsForItems(invoiceItems), [invoiceItems, calculateTotalsForItems]);

  const invoiceSummary = useMemo(() => {
    const totalCount = invoices.length;
    const paidCount = invoices.filter(inv => inv.status === 'paid').length;
    const pendingCount = invoices.filter(inv => inv.status === 'pending' || inv.status === 'draft').length;
    const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    return { totalCount, paidCount, pendingCount, overdueCount, totalRevenue };
  }, [invoices]);
  
  const sequentiallyOrderedInvoices = useMemo(() => {
      return [...invoices].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [invoices]);


  const sortedAndFilteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => {
        if (filter !== 'all' && inv.status !== filter) return false;
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        const seqNum = inv.sequentialNumber || inv.invoiceNumber || '';
        return seqNum.toLowerCase().includes(term)
          || (inv.customer?.name || '').toLowerCase().includes(term)
          || (inv.customer?.phone || '').includes(term);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [invoices, filter, searchTerm]);

  const filteredInvoices = sortedAndFilteredInvoices; 
  
  const formatOfficialInvoiceNumber = useCallback((inv) => {
    // If the invoiceNumber is already in the sequential format, use it.
    if (inv.invoiceNumber && !inv.invoiceNumber.startsWith('INV-')) {
      return inv.invoiceNumber;
    }

    // Fallback: If not saved, or is the old Mongoose format (INV-...), calculate the sequential format.
    const stableIndex = sequentiallyOrderedInvoices.findIndex(item => item._id === inv._id);
    
    // NOTE: For a *new* invoice being created, inv._id will be null, leading to stableIndex = -1. 
    // This is fixed in the buildPayload/handleCreate logic by calculating the index based on length.
    
    if (stableIndex === -1 && inv.createdAt) {
      // If index is -1 but we have a creation date, we can't accurately get the sequential count
      // based on the fetched list. This path should mostly be for list filtering logic.
      // We will skip here and rely on the logic in buildInvoicePayload for new invoice numbers.
      return inv.invoiceNumber || `ERR-${inv._id?.substring(0, 4) || 'NULL'}`; 
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

  // --- Customer Handlers ---
  const handleCustomerSearch = useCallback(async () => {
    // UPDATED: Search logic to check if input is a phone number or business name
    if (!customerSearch.trim()) {
      showAlert('Please enter Mobile Number or Business Name.', 'warning');
      return;
    }
    
    let searchQuery = customerSearch.trim();
    // Use isNaN check as a proxy for identifying phone numbers
    let searchField = isNaN(searchQuery) || searchQuery.length < 5 ? 'businessName' : 'phone';

    try {
      // Pass the search query to the backend which determines the filter (phone OR businessName)
      const found = await searchCustomerByPhone(searchQuery); 
      
      if (found) {
        setSearchedCustomer(found);
        setSelectedCustomer(found._id);
        setLocalCustomerPayload({
          name: found.name, businessName: found.businessName || '', email: found.email || '', phone: found.phone,
          address: found.address || { street: '', city: '', state: '', zipCode: '' }
        });
        showAlert('Customer found!', 'success');
        // 🐛 Removed setShowCustomerForm(false) - logic now depends only on searchedCustomer state
      } else {
        setSearchedCustomer(null);
        setSelectedCustomer(null);
        // Initialize new customer form with whatever was searched
        setLocalCustomerPayload(prev => ({ 
            name: '', businessName: searchField === 'businessName' ? searchQuery : '', 
            email: '', phone: searchField === 'phone' ? searchQuery : '',
            address: { street: '', city: '', state: '', zipCode: '' } 
        }));
        showAlert('Customer not found. Fill details and create new customer.', 'info');
        // 🐛 Removed setShowCustomerForm(true)
      }
    } catch (error) {
      showAlert('Error searching for customer', 'danger');
    }
  }, [customerSearch, searchCustomerByPhone, showAlert]);

  const handleCreateCustomer = useCallback(async () => {
    try {
      if (!localCustomerPayload.name || !localCustomerPayload.phone) {
        showAlert('Please enter Contact Name and Phone.', 'warning');
        return;
      }
      const created = await createCustomer(localCustomerPayload);
      setSelectedCustomer(created._id);
      setSearchedCustomer(created);
      // 🐛 Removed setShowCustomerForm(false)
      setCustomerSearch(created.phone);
    } catch (err) {
        // Handled by backend hook
    }
  }, [localCustomerPayload, createCustomer, showAlert]);
  
  const handleLocalCustomerPayloadChange = useCallback((e) => {
      const { name, value } = e.target;
      setLocalCustomerPayload(prev => ({ ...prev, [name]: value }));
  }, []);

  // --- Product/Item Handlers ---
  const handleProductSelect = useCallback((index, productId) => {
    updateItem(index, 'product', productId);
  }, [updateItem]);

  const handleItemFieldChange = useCallback((index, field, value) => {
    updateItem(index, field, value);
  }, [updateItem]);


  // --- Form Logic ---
  
  const resetFormLocal = useCallback(() => {
    resetForm(); 
    setSelectedCustomer(null);
    setInvoiceItems([]);
    setTaxDetails({ cgst: 9, sgst: 9, igst: 0, gstType: 'cgst_sgst' });
    setNotes('');
    setDueDate('');
    setPaymentType('cash');
    setCustomerSearch('');
    setSearchedCustomer(null);
    // 🐛 Removed setShowCustomerForm(false)
    // UPDATED: Reset businessName as well
    setLocalCustomerPayload({ name: '', businessName: '', email: '', phone: '', address: { street: '', city: '', state: '', zipCode: '' } });
  }, [resetForm, setInvoiceItems, setTaxDetails, setNotes, setDueDate, setPaymentType, setSelectedCustomer]);
  
  const buildInvoicePayload = useCallback((existingInvoice = null) => {
      const { subtotal, cgstAmount, sgstAmount, igstAmount, totalTax, total, taxDetails: derivedTaxDetails } = totals;

      const invalidItems = invoiceItems.filter(item => 
        !item.product || !item.description || !item.quantity || !item.price
      );
      
      if (invalidItems.length > 0) {
        showAlert('Please fill all required fields for all items', 'warning');
        return null;
      }
      
      let invoiceNum;
      if (existingInvoice) {
          invoiceNum = existingInvoice.invoiceNumber;
      } else {
          const currentCount = invoices.length; 
          const date = new Date();
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear().toString(); 
          const sequentialCount = (currentCount + 1).toString().padStart(3, '0'); 
          invoiceNum = `${day}${month}${year}${sequentialCount}`;
      }
      
      return {
        invoiceNumber: invoiceNum, // Use the determined number
        customer: selectedCustomer,
        items: invoiceItems.map(item => ({
          product: item.product, description: item.description, hsnCode: item.hsnCode, 
          quantity: item.quantity, price: item.price, taxRate: item.taxRate,
          total: (Number(item.quantity) || 0) * (Number(item.price) || 0)
        })),
        subtotal,
        taxDetails: {
          ...derivedTaxDetails, cgstAmount, sgstAmount, igstAmount, totalTax
        },
        total, dueDate, notes, paymentType,
        status: existingInvoice?.status || 'draft', // Preserve status on update
        createdAt: existingInvoice?.createdAt || new Date().toISOString(), // Preserve date on update
        createdBy: user?._id 
      };
  }, [totals, invoiceItems, showAlert, invoices.length, selectedCustomer, dueDate, notes, paymentType, user?._id]);

  const handleCreateInvoiceClick = useCallback(async () => {
    const finalDueDate = dueDate || new Date().toISOString().split('T')[0];

    if (!selectedCustomer || invoiceItems.length === 0 || !finalDueDate) {
        showAlert('Please ensure a customer is selected and items are added.', 'warning');
        return;
    }
    
    const stockError = invoiceItems.some(item => Number(item.quantity) > getProductStock(item.product));
    if (stockError) {
        showAlert('Cannot create invoice: Quantity exceeds available stock for one or more items.', 'danger');
        return;
    }

    const invoicePayload = buildInvoicePayload(null); 
    if (!invoicePayload) return;

    invoicePayload.dueDate = finalDueDate;

    try {
      await createInvoice(invoicePayload);
      setShowModal(false);
      resetFormLocal();
    } catch (e) {
        // Error handling in backend hook
    }
  }, [dueDate, selectedCustomer, invoiceItems, getProductStock, showAlert, buildInvoicePayload, createInvoice, resetFormLocal]);

  const handleUpdateInvoiceClick = useCallback(async () => {
    if (!editingInvoice) return;
    
    const finalDueDate = dueDate || new Date().toISOString().split('T')[0];

    const stockError = invoiceItems.some(item => Number(item.quantity) > getProductStock(item.product));
    if (stockError) {
        showAlert('Cannot update invoice: Quantity exceeds available stock for one or more items.', 'danger');
        return;
    }

    const payload = buildInvoicePayload(editingInvoice);
    if (!payload) return;

    payload.dueDate = finalDueDate;

    delete payload.createdBy; 
    
    try {
      await updateInvoice(editingInvoice._id, payload);
      setShowEditModal(false);
      resetFormLocal();
    } catch (e) {
        // Error handling in backend hook
    }
  }, [editingInvoice, dueDate, invoiceItems, getProductStock, showAlert, buildInvoicePayload, updateInvoice, resetFormLocal]);
  
const handleEditInvoice = useCallback((invoice) => {
    const seqNum = formatOfficialInvoiceNumber(invoice);
    
    setEditingInvoice({ ...invoice, sequentialNumber: seqNum }); 
    setSelectedCustomer(invoice.customer?._id || invoice.customer);
    setInvoiceItems(invoice.items || []);
    setTaxDetails(invoice.taxDetails || { cgst: 9, sgst: 9, igst: 0, gstType: 'cgst_sgst' }); 
    setNotes(invoice.notes || '');
    setDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : ''); 
    setPaymentType(invoice.paymentType || 'cash');
    setShowEditModal(true);
}, [formatOfficialInvoiceNumber, setInvoiceItems, setTaxDetails, setNotes, setDueDate, setPaymentType, setSelectedCustomer]);
  
  const handleDeleteInvoice = useCallback(async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    await deleteInvoice(invoiceId);
  }, [deleteInvoice]);

// 🟢 UPDATED: LOGO INTEGRATION IN PRINT/PDF HANDLER
  const handleDownloadPDF = useCallback((invoiceId) => {
      const invoice = invoices.find(inv => inv._id === invoiceId);
      const customer = customers.find(c => c._id === (invoice.customer?._id || invoice.customer));
      
      // Get logo path from company settings
      const logoPath = companySettings.logo;
      const logoHtml = logoPath 
          ? `<img src="http://localhost:5000/${logoPath}" alt="Company Logo" style="max-height: 50px; margin-bottom: 10px;"/>`
          : '';

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice ${invoice.invoiceNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .total-row { font-weight: bold; background-color: #f8f9fa; }
              .text-right { text-align: right; }
              
              /* Custom styles for professional look */
              .invoice-header { background-color: #f5f5f5; padding: 15px; border-bottom: 2px solid #007bff; display: flex; justify-content: space-between; align-items: center; }
              .invoice-header h1 { color: #007bff; margin: 0; }
            </style>
          </head>
          <body>
            <div class="invoice-header">
              <div>
                ${logoHtml} <h1>TAX INVOICE</h1>
              </div>
              <div class="text-right">
                <p style="margin-bottom: 5px;"><strong>Invoice #:</strong> ${formatOfficialInvoiceNumber(invoice)}</p>
                <p style="margin-bottom: 5px;"><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div class="section">
              <div style="display: flex; justify-content: space-between;">
                <div style="width: 48%;">
                  <h3>Bill From:</h3>
                  <p style="margin-bottom: 2px;"><strong>${companySettings.name || 'Your Company Name'}</strong></p>
                  <p style="margin-bottom: 2px;"><b>Branch: </b>${companySettings.branchLocation || 'Your Branch Location'}</p>
                  <p style="margin-bottom: 2px;"><b>Head Office: </b>${companySettings.address || 'Your Business Address'}</p>
                  <p style="margin-bottom: 2px;"><b>GST-IN: </b>${companySettings.gstIn ? `${companySettings.gstIn}` : ''}</p>
                  <p style="margin-bottom: 2px;"><b>Phone: </b>${companySettings.phone ? ` ${companySettings.phone}` : ''}</p>
                </div>
                <div style="width: 48%;">
                  <h3>Bill To:</h3>
                  <p style="margin-bottom: 2px;"><strong>Business Name: </strong>${customer?.businessName || 'N/A'}</p>
                  <p style="margin-bottom: 2px;"><b>Name: </b> ${customer?.name || 'N/A'}</p>
                  <p style="margin-bottom: 2px;"><b>Address:</b>${customer?.address?.street || customer?.address?.city ? ` ${customer?.address?.street || ''}, ${customer?.address?.city || ''}` : ''}</p>
                  <p style="margin-bottom: 2px;">${customer?.gstNumber ? `GST-IN: ${customer?.gstNumber}` : ''}</p>
                  <p style="margin-bottom: 2px;"><b>Contact: </b>${customer?.phone || 'N/A'} / ${customer?.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div class="section">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description (HSN)</th>
                    <th>Qty</th>
                    <th>Price (${currencySymbol})</th>
                    <th>Tax Rate</th>
                    <th>Amount (${currencySymbol})</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.items?.map((item, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${item.description || `Item ${index + 1}`} ${item.hsnCode ? `(${item.hsnCode})` : ''}</td>
                      <td>${item.quantity}</td>
                      <td>${formatCurrency(item.price)}</td>
                      <td>${item.taxRate || '0'}%</td>
                      <td class="text-right">${formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0) * (1 + (Number(item.taxRate) || 0) / 100))}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <table style="width: 50%; margin-left: auto;">
                <tbody>
                  <tr>
                    <td><strong>Subtotal</strong></td>
                    <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
                  </tr>
                  ${invoice.taxDetails?.gstType === 'cgst_sgst' ? `
                    <tr>
                      <td>CGST (${invoice.taxDetails?.cgst?.toFixed(2)}%)</td>
                      <td class="text-right">${formatCurrency(invoice.taxDetails?.cgstAmount)}</td>
                    </tr>
                    <tr>
                      <td>SGST (${invoice.taxDetails?.sgst?.toFixed(2)}%)</td>
                      <td class="text-right">${formatCurrency(invoice.taxDetails?.sgstAmount)}</td>
                    </tr>
                  ` : `
                    <tr>
                      <td>IGST (${invoice.taxDetails?.igst?.toFixed(2)}%)</td>
                      <td class="text-right">${formatCurrency(invoice.taxDetails?.igstAmount)}</td>
                    </tr>
                  `}
                  <tr class="total-row">
                    <td><strong>Total Amount</strong></td>
                    <td class="text-right"><strong>${formatCurrency(invoice.total)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="section" style="border-top: 1px solid #ddd; padding-top: 10px;">
                <p><strong>Payment Method:</strong> ${invoice.paymentType?.toUpperCase() || 'CASH'}</p>
                <p style="white-space: pre-wrap;"><strong>Payment Terms:</strong> ${paymentSettings.terms || 'Payment due upon receipt.'}</p>
                ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
            </div>
            
            <div class="text-right" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #000;">
                <p>Authorized Signature</p>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
      showAlert('PDF ready for printing', 'success');
  }, [invoices, customers, companySettings, paymentSettings, formatOfficialInvoiceNumber, formatCurrency, currencySymbol, showAlert]);


  const getStatusVariant = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'danger';
      case 'draft': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-4">
      {/* Alert (same) */}
      {alert.show && (
        <Alert 
          variant={alert.type} 
          className="position-fixed top-0 end-0 m-3" 
          style={{ zIndex: 1060 }} 
          dismissible 
          onClose={() => showAlert('', 'hidden')}
        >
          {alert.message}
        </Alert>
      )}
      
      {/* Header and Controls (same) */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-1">Invoice Management</h2>
          <p className="text-muted mb-0">Manage all your customer invoices, billing, and payments.</p>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-primary" className="d-flex align-items-center fw-semibold" onClick={exportInvoices}>
            <Download size={18} className="me-2" /> Export
          </Button>
          <Button variant="primary" className="d-flex align-items-center fw-semibold" onClick={() => setShowModal(true)}>
            <Plus size={18} className="me-2" /> New Invoice
          </Button>
        </Col>
      </Row>
      
      {/* Dashboard Summary Cards (Currency Updated) */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="shadow-sm border-start border-4 border-primary h-100">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2">Total Invoices</h6>
              <h3 className="mb-0">{invoiceSummary.totalCount}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-start border-4 border-success h-100">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2">Total Revenue</h6>
              <h3 className="mb-0">{formatCurrency(invoiceSummary.totalRevenue)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-start border-4 border-warning h-100">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2">Pending/Draft</h6>
              <h3 className="mb-0">{invoiceSummary.pendingCount}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-start border-4 border-danger h-100">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2">Overdue</h6>
              <h3 className="mb-0">{invoiceSummary.overdueCount}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Invoice Table (Currency Updated) */}
      <Card className="shadow-lg border-0">
        <Card.Header className="bg-light py-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0">All Invoices</h5>
          <Badge bg="primary" className="fs-6 py-2 px-3 fw-bold">
            <FileText size={18} className="me-2" />
            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'Invoice' : 'Invoices'}
          </Badge>
        </Card.Header>

        <Card.Body className="p-0">
          <Row className="p-3">
            <Col md={3}>
              <Form.Select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-white">
                <option value="all">Filter by Status...</option>
                <option value="draft">Draft</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </Form.Select>
            </Col>
            <Col md={9}>
              {/* FIXED SEARCH BAR USING InputGroup */}
              <InputGroup>
                <InputGroup.Text>
                  <Search size={18} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by invoice #, customer name, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
          </Row>
          
          {isLoading ? (
             <div className="text-center py-5">
                <Spinner animation="border" variant="primary" role="status" className="mb-3" />
                <p className="text-muted">Loading invoices...</p>
             </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-5">
              <FileText size={48} className="text-muted mb-3" />
              <h5 className="text-muted">No invoices found</h5>
              <p className="text-muted">Try adjusting your filters or search term.</p>
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <Plus size={18} className="me-2" /> Create New Invoice
              </Button>
            </div>
          ) : (
            <Table responsive hover className="mb-0 table-sm"> 
              <thead className="bg-light">
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Amount ({currencySymbol})</th>
                  <th>Status</th>
                  <th>Date</th> 
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id}>
                    <td className="fw-semibold">
                      <div className='d-flex flex-column'>
                        <span className='fw-bold text-primary'>
                          #{formatOfficialInvoiceNumber(inv)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                            {/* 1. Icon/Avatar Block (Child 1) */}
                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px' }}>
                                <span className="text-white fw-bold small">
                                    {inv.customer?.name?.charAt(0)?.toUpperCase() || 'C'}
                                </span>
                            </div>

                            {/* 2. Name/Details Block (Child 2) */}
                            <div>
                                <div className="fw-semibold">
                                    {inv.customer?.businessName || inv.customer?.name || 'Unknown Customer'}
                                </div>
                                {inv.customer?.businessName && <small className="text-muted">{inv.customer?.name}</small>}
                            </div>
                        </div>
                    </td>
                    <td className="fw-bold">{formatCurrency(inv.total)}</td>
                    <td>
                      <Badge bg={getStatusVariant(inv.status)} className="rounded-pill text-uppercase px-3 py-2 fw-bold">
                        {inv.status}
                      </Badge>
                    </td>
                    <td>
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Dropdown>
                        <Dropdown.Toggle 
                          variant="outline-secondary" 
                          size="sm" 
                          className="border-0 p-1"
                          aria-label="Invoice actions"
                        >
                          <MoreVertical size={16} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => { setCurrentInvoice({...inv, sequentialNumber: formatOfficialInvoiceNumber(inv)}); setShowInvoicePreview(true); }}>
                            <Eye size={16} className="me-2" />View Details
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleEditInvoice(inv)}>
                            <Edit size={16} className="me-2" />Edit Invoice
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleDownloadPDF(inv._id)}>
                            <Download size={16} className="me-2" />Download PDF
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item className="text-danger" onClick={() => handleDeleteInvoice(inv._id)}>
                            <Trash2 size={16} className="me-2" />Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>


      {/* Create Invoice Modal */}
      <Modal 
        show={showModal} 
        onHide={() => { setShowModal(false); resetFormLocal(); }} 
        size="xl" 
        centered 
        scrollable
      >
        <Modal.Header closeButton className="border-0"> 
          <Modal.Title className="h4 text-primary fw-bold">Create New Invoice</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <InvoiceForm
            onSubmit={handleCreateInvoiceClick}
            onCancel={() => { setShowModal(false); resetFormLocal(); }}
            submitButtonText="Create Invoice"
            
            // Pass necessary props (state/handlers) to the memoized form
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            handleCustomerSearch={handleCustomerSearch}
            searchedCustomer={searchedCustomer}
            // Removed setShowCustomerForm prop
            handleLocalCustomerPayloadChange={handleLocalCustomerPayloadChange}
            localCustomerPayload={localCustomerPayload}
            handleCreateCustomer={handleCreateCustomer}
            dueDate={dueDate}
            setDueDate={setDueDate}
            paymentType={paymentType}
            setPaymentType={setPaymentType}
            paymentTypes={paymentTypes}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            invoiceItems={invoiceItems}
            handleProductSelect={handleProductSelect}
            handleItemFieldChange={handleItemFieldChange}
            products={products}
            getProductStock={getProductStock}
            notes={notes}
            setNotes={setNotes}
            totals={totals}
            formatCurrency={formatCurrency}
            currencySymbol={currencySymbol}
            selectedCustomer={selectedCustomer}
          />
        </Modal.Body>
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal 
          show={showEditModal} 
          onHide={() => { setShowEditModal(false); resetFormLocal(); }} 
          size="xl" 
          centered 
          scrollable
      >
          <Modal.Header closeButton className="border-0">
              <Modal.Title className="h4 text-warning fw-bold">
                  Edit Invoice - #{editingInvoice?.sequentialNumber || editingInvoice?.invoiceNumber}
              </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <InvoiceForm
              isEdit={true}
              onSubmit={handleUpdateInvoiceClick}
              onCancel={() => { setShowEditModal(false); resetFormLocal(); }}
              submitButtonText="Update Invoice"
              
              // Pass necessary props (state/handlers) to the memoized form
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              handleCustomerSearch={handleCustomerSearch}
              searchedCustomer={searchedCustomer}
              // Removed setShowCustomerForm prop
              handleLocalCustomerPayloadChange={handleLocalCustomerPayloadChange}
              localCustomerPayload={localCustomerPayload}
              handleCreateCustomer={handleCreateCustomer}
              dueDate={dueDate}
              setDueDate={setDueDate}
              paymentType={paymentType}
              setPaymentType={setPaymentType}
              paymentTypes={paymentTypes}
              addItem={addItem}
              removeItem={removeItem}
              updateItem={updateItem}
              invoiceItems={invoiceItems}
              handleProductSelect={handleProductSelect}
              handleItemFieldChange={handleItemFieldChange}
              products={products}
              getProductStock={getProductStock}
              notes={notes}
              setNotes={setNotes}
              totals={totals}
              formatCurrency={formatCurrency}
              currencySymbol={currencySymbol}
              selectedCustomer={selectedCustomer}
            />
          </Modal.Body>
      </Modal>

      {/* Invoice Preview Modal */}
{(() => {
    // This is defined outside the main return for clarity but executed here.
    const logoPath = companySettings.logo;
    const logoElement = logoPath 
        ? <img 
            src={`http://localhost:5000${logoPath}`}

            alt="Company Logo" 
            style={{ maxHeight: '50px', marginBottom: '10px' }} 
          />
        : null;
    return (
        <Modal show={showInvoicePreview} onHide={() => setShowInvoicePreview(false)} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Invoice Preview - #{currentInvoice?.sequentialNumber || currentInvoice?.invoiceNumber}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {currentInvoice ? (
                    <div className="p-3">
                        {/* 🟢 ADDED LOGO HERE */}
                        <div className="text-center mb-4">
                            {logoElement}
                            <h2>TAX INVOICE</h2>
                            <p>
                                <strong>Invoice #:</strong> {currentInvoice.sequentialNumber || currentInvoice.invoiceNumber}
                                <small className="text-muted ms-2 fst-italic">
                                    ({new Date(currentInvoice.createdAt).toLocaleDateString()})
                                </small>
                            </p>
                        </div>
                        {/* 🟢 END LOGO ADDITION */}
                        
                        <Row className="mb-4">
                            <Col md={6}>
                                <h5>Bill From:</h5>
                                <p><strong>{companySettings.name || 'Company Name Not Set'}</strong></p>
                                <p><b>Branch:</b> {companySettings.branchLocation || 'Branch Location Not Set'}</p>
                                
                                <p><b>Head Office: </b>{companySettings.address || 'Your Business Address'}</p>
                                
                                {companySettings.gstIn && <p><b>GST-IN:</b> {companySettings.gstIn}</p>}
                                {companySettings.phone && <p><b>Phone:</b> {companySettings.phone}</p>}
                            </Col>
                            <Col md={6}>
                                {(() => {
                                    const customerId = currentInvoice.customer?._id || currentInvoice.customer;
                                    const customer = customers.find(c => c._id === customerId);
                                    return (
                                        <>
                                            <h5>Bill To:</h5>
                                            <p><strong>Business Name: </strong>{customer?.businessName || customer?.name || 'Unknown Customer'}</p>
                                            {customer?.businessName && <p><b>Name: </b>{customer.name}</p>}
                                            <p>  <b>Address: </b> {customer?.address?.street || customer?.address?.city ?`${customer?.address?.street || ''}, ${customer?.address?.city || ''}` : 'N/A'}</p>
                                            {customer?.gstNumber && <p>GST-IN: {customer.gstNumber}</p>}
                                            <p><b>Contact: </b>{customer?.phone || 'N/A'} / {customer?.email || 'N/A'}</p>
                                        </>
                                    );
                                })()}
                            </Col>
                        </Row>

                        <Table responsive className="mb-4 table-sm">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Description</th>
                                    <th>Qty</th>
                                    <th>Price ({currencySymbol})</th>
                                    <th>Tax %</th> 
                                    <th>Amount ({currencySymbol})</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentInvoice.items?.map((it, i) => (
                                    <tr key={i}>
                                        <td>{i+1}</td>
                                        <td>{it.description}</td>
                                        <td>{it.quantity}</td>
                                        <td>{formatCurrency(it.price)}</td>
                                        <td>{it.taxRate ?? 'N/A'}</td> 
                                        <td>{formatCurrency((it.quantity||0)*(it.price||0))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                        <Row>
                            <Col md={6}></Col>
                            <Col md={6}>
                                <Table className='table-sm'>
                                    <tbody>
                                        <tr>
                                            <td><strong>Subtotal</strong></td>
                                            <td className="text-end">{formatCurrency(currentInvoice.subtotal)}</td>
                                        </tr>
                                        {currentInvoice.taxDetails?.gstType === 'cgst_sgst' && currentInvoice.taxDetails?.cgstAmount > 0 ? (
                                            <>
                                                <tr>
                                                    <td>CGST ({currentInvoice.taxDetails?.cgst?.toFixed(2)}%)</td>
                                                    <td className="text-end">{formatCurrency(currentInvoice.taxDetails?.cgstAmount)}</td>
                                                </tr>
                                                <tr>
                                                    <td>SGST ({currentInvoice.taxDetails?.sgst?.toFixed(2)}%)</td>
                                                    <td className="text-end">{formatCurrency(currentInvoice.taxDetails?.sgstAmount)}</td>
                                                </tr>
                                            </>
                                        ) : currentInvoice.taxDetails?.totalTax > 0 ? (
                                            <tr>
                                                <td>IGST/Total Tax</td>
                                                <td className="text-end">{formatCurrency(currentInvoice.taxDetails?.totalTax)}</td>
                                            </tr>
                                        ) : null}
                                        <tr className="fw-bold fs-5 text-success">
                                            <td>Total</td>
                                            <td className="text-end"><strong>{formatCurrency(currentInvoice.total)}</strong></td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </Col>
                        </Row>

                        {currentInvoice.notes && (
                            <div className="mt-4">
                                <h6>Notes:</h6>
                                <p>{currentInvoice.notes}</p>
                            </div>
                        )}
                        <div className="mt-4">
                            <p>
                                <strong>Payment Type:</strong> {currentInvoice.paymentType?.toUpperCase() || 'CASH'} <br/>
                                <strong> Billing Date:</strong> ({new Date(currentInvoice.createdAt).toLocaleDateString()})</p> 
                        </div>
                    </div>
                ) : <div>No invoice selected</div>}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" onClick={() => setShowInvoicePreview(false)}>Close</Button>
                <Button variant="primary" onClick={() => handleDownloadPDF(currentInvoice._id)}>
                    <Printer size={16} className="me-2" />Print
                </Button>
            </Modal.Footer>
        </Modal>
    );
})()}

    </div>
  );
}