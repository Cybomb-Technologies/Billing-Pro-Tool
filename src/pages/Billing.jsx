import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Card, Row, Col, Form, Badge, Dropdown, Alert, InputGroup, Spinner, ListGroup, Container, Image,
  Collapse, Modal
} from 'react-bootstrap';
import {
  Plus, Search, X, Box, Building, User as UserIcon, Save, ArrowLeft,
  ShoppingCart, ChevronDown, ChevronUp, Printer, CreditCard, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useInvoiceBackend from './Invoices/InvoiceBackend';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL, SERVER_URL } from '../config';

const Billing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const backend = useInvoiceBackend();
  const {
      customers, products, settings,
      selectedCustomer, setSelectedCustomer,
      invoiceItems, setInvoiceItems,
      taxDetails, setTaxDetails,
      notes, setNotes,
      dueDate, setDueDate,
      paymentType, setPaymentType,
      createInvoice,
      createCustomer,
      searchCustomerByPhone,
      addItem,
      removeItem,
      updateItem,
      calculateTotalsForItems,
      resetForm,
      getProductStock,
      showAlert,
      alert 
  } = backend;

  // --- UI Local State ---
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchedCustomer, setSearchedCustomer] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [discount, setDiscount] = useState(0);
  
  // Product Search for Sidebar
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Extended Customer Form State
  const [showFullCustomerForm, setShowFullCustomerForm] = useState(false);
  const [localCustomerPayload, setLocalCustomerPayload] = useState({
      name: '', businessName: '', email: '', phone: '', gstNumber: '',
      address: { street: '', city: '', state: '', zipCode: '' }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);

  // --- Currency & Settings Helpers ---
  const companySettings = settings.company || {};
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

  // --- Search & Suggestions Logic ---
  useEffect(() => {
    if (!customers) return;
    if (customerSearch && !selectedCustomer) { 
         const term = customerSearch.toLowerCase();
         if (term.length < 1) { setShowSuggestions(false); return; }

         const matches = customers.filter(c => 
             (c.name || '').toLowerCase().includes(term) ||
             (c.phone || '').includes(term) ||
             (c.businessName || '').toLowerCase().includes(term)
         ).slice(0, 5);
         setSuggestions(matches);
         setShowSuggestions(matches.length > 0);
    } else {
        setShowSuggestions(false);
    }
  }, [customerSearch, customers, selectedCustomer]);

  const handleSuggestionClick = (c) => {
      setSearchedCustomer(c);
      setSelectedCustomer(c._id);
      setCustomerSearch(c.phone || c.businessName || c.name);
      setShowSuggestions(false);
      showAlert('Customer selected', 'success');
  };

  const handleCustomerSearchSubmit = useCallback(async () => {
    if (!customerSearch.trim()) {
      showAlert('Please enter Mobile Number or Business Name.', 'warning');
      return;
    }
    
    let searchQuery = customerSearch.trim();
    let searchField = isNaN(searchQuery) || searchQuery.length < 5 ? 'businessName' : 'phone';

    try {
      setSearchedCustomer(null);
      setSelectedCustomer(null);
      
      const found = await searchCustomerByPhone(searchQuery); 
      if (found) {
        setSearchedCustomer(found);
        setSelectedCustomer(found._id);
        showAlert('Customer found!', 'success');
      } else {
        setSearchedCustomer(null);
        setSelectedCustomer(null);
        setLocalCustomerPayload(prev => ({ 
            ...prev,
            name: '', businessName: searchField === 'businessName' ? searchQuery : '', 
            email: '', phone: searchField === 'phone' ? searchQuery : '',
            gstNumber: '',
            address: { street: '', city: '', state: '', zipCode: '' } 
        }));
        showAlert('Customer not found. Fill details and create new customer.', 'info');
      }
    } catch (error) {
      showAlert('Error searching for customer', 'danger');
    }
  }, [customerSearch, searchCustomerByPhone, showAlert, setSelectedCustomer]);

  const handleCreateCustomer = useCallback(async () => {
    try {
      if (!localCustomerPayload.name) {
        showAlert('Please enter Contact Name.', 'warning');
        return;
      }
      if (!localCustomerPayload.phone || localCustomerPayload.phone.length < 10) {
        showAlert('Please enter a valid Phone Number (min 10 digits).', 'warning');
        return;
      }
      const created = await createCustomer(localCustomerPayload);
      setSelectedCustomer(created._id);
      setSearchedCustomer(created);
      setCustomerSearch(created.phone);
      // Reset expanded form
      setShowFullCustomerForm(false);
    } catch (err) {
        // Handled by backend hook
    }
  }, [localCustomerPayload, createCustomer, showAlert, setSelectedCustomer]);

  const handleDeselectCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setSearchedCustomer(null);
    setCustomerSearch('');
    setLocalCustomerPayload({ name: '', businessName: '', email: '', phone: '', gstNumber: '', address: { street: '', city: '', state: '', zipCode: '' } });
  }, [setSelectedCustomer]);

  const handleLocalCustomerPayloadChange = useCallback((e) => {
      const { name, value } = e.target;
      if (name.includes('.')) {
          const [parent, child] = name.split('.');
          setLocalCustomerPayload(prev => ({
              ...prev,
              [parent]: { ...prev[parent], [child]: value }
          }));
      } else {
          setLocalCustomerPayload(prev => ({ ...prev, [name]: value }));
      }
  }, []);

  // --- Invoice Logic ---
  const totals = useMemo(() => calculateTotalsForItems(invoiceItems), [invoiceItems, calculateTotalsForItems]);

  const handleProductSelect = useCallback((index, productId) => {
    updateItem(index, 'product', productId);
  }, [updateItem]);

  const handleItemFieldChange = useCallback((index, field, value) => {
    
    // Auto-calculate logic if MRP or Discount changes
    if (field === 'mrp' || field === 'discount') {
       setInvoiceItems(prev => {
           const copy = [...prev];
           const item = { ...copy[index], [field]: value }; // Apply new value
           
           const mrp =  Number(item.mrp) || 0;
           const discountPercent = Number(item.discount) || 0; // Interpreting discount as %
           
           // Formula: Price = MRP * (1 - Discount%/100)
           // If Discount is 0, Price = MRP.
           
           const price = mrp * (1 - (discountPercent / 100));
           item.price = Math.max(0, price); // Ensure no negative price
           
           // We store 'discount' as the percentage value (e.g. 10 for 10%)
           
           copy[index] = item;
           return copy;
       });
       return; 
    }
    
    // If 'price' is manually changed, calculate implied discount % ?
    if (field === 'price') {
       setInvoiceItems(prev => {
           const copy = [...prev];
           const item = { ...copy[index], [field]: value };
           const mrp = Number(item.mrp) || 0;
           const price = Number(item.price) || 0;
           
           if (mrp > 0 && price <= mrp) {
               // Implied Discount % = ((MRP - Price) / MRP) * 100
               const impliedDiscount = ((mrp - price) / mrp) * 100;
               item.discount = parseFloat(impliedDiscount.toFixed(2));
           } else if (mrp > 0 && price > mrp) {
               // Price > MRP? Set discount 0? Or allow?
               item.discount = 0;
           }
           
           copy[index] = item;
           return copy;
       });
       return;
    }

    updateItem(index, field, value);
  }, [updateItem, setInvoiceItems]);

  // --- Quick Add Product from List ---
  const handleAddProductFromList = useCallback((product) => {
      if (!product) return;
      if (Number(product.stock) === 0) {
          showAlert(`${product.name} is out of stock`, 'warning');
          return;
      }
      
      setInvoiceItems(prev => {
          const existingIdx = prev.findIndex(item => item.product === product._id);
          
          if (existingIdx >= 0) {
              const copy = [...prev];
              const currentQty = Number(copy[existingIdx].quantity) || 0;
              const stock = Number(product.stock) || 0;
              
              if (currentQty + 1 > stock) {
                  showAlert(`Cannot add more. Limit reached for ${product.name}`, 'warning');
                  return prev;
              }
              
              copy[existingIdx] = { ...copy[existingIdx], quantity: currentQty + 1 };
              return copy;
          } else {
              const dbPrice = typeof product.price === 'number' ? product.price : parseFloat(product.price || 0);
              const dbMrp = typeof product.mrp === 'number' ? product.mrp : dbPrice;

              // Default logic: Set MRP, Discount=0, Price=MRP (or DB Price)
              // If we want Price = MRP initially, discount 0.
              // If DB Price < DB MRP, calculate initial discount.
              
              let initialDiscount = 0;
              if (dbMrp > 0 && dbPrice < dbMrp) {
                  initialDiscount = ((dbMrp - dbPrice) / dbMrp) * 100;
              }
              
              return [...prev, {
                  product: product._id,
                  description: product.name, 
                  hsnCode: product.hsnCode || '',
                  quantity: 1,
                  price: dbPrice,
                  mrp: dbMrp,
                  discount: parseFloat(initialDiscount.toFixed(2)), // Store as %
                  taxRate: product.taxRate ?? 18
              }];
          }
      });
  }, [setInvoiceItems, showAlert]);

  const filteredProducts = useMemo(() => {
      if (!products) return [];
      const term = productSearchTerm.toLowerCase();
      const filtered = products.filter(p => 
          (p.name || '').toLowerCase().includes(term) ||
          (p.sku || '').toLowerCase().includes(term)
      );
      
      // Sort: In-stock first, then by name
      return filtered.sort((a, b) => {
          const stockA = Number(a.stock) || 0;
          const stockB = Number(b.stock) || 0;
          const aInStock = stockA > 0;
          const bInStock = stockB > 0;
          
          if (aInStock && !bInStock) return -1;
          if (!aInStock && bInStock) return 1;
          return 0; // Maintain original order or sort by name if needed
      });
  }, [products, productSearchTerm]);


  const buildInvoicePayload = useCallback(() => {
      const { subtotal, cgstAmount, sgstAmount, igstAmount, totalTax, total, taxDetails: derivedTaxDetails, breakdown } = totals;

      const invalidItems = invoiceItems.filter(item => 
        !item.product || !item.quantity || (!item.price && item.price !== 0)
      );
      
      if (invalidItems.length > 0) {
        showAlert('Please fill all required fields for all items', 'warning');
        return null;
      }
      
      return {
        // invoiceNumber is now generated by the backend to ensure uniqueness
        customer: selectedCustomer,
        items: invoiceItems.map(item => ({
          product: item.product, 
          description: item.description, 
          hsnCode: item.hsnCode, 
          quantity: item.quantity, 
          price: item.price, 
          mrp: item.mrp || item.price,
          discount: item.discount || 0, // This is % now
          taxRate: item.taxRate,
          total: (Number(item.quantity) || 0) * (Number(item.price) || 0)
        })),
        subtotal,
        breakdown, // Added breakdown here
        taxDetails: {
          ...derivedTaxDetails, cgstAmount, sgstAmount, igstAmount, totalTax
        },
        total, 
        notes, 
        paymentType,
        status: paymentStatus,
        paymentDetails: {
          type: paymentType,
          status: paymentStatus,
        },
        createdAt: new Date().toISOString(),
        createdBy: user?._id 
      };
  }, [totals, invoiceItems, showAlert, backend.invoices, selectedCustomer, notes, paymentType, paymentStatus, user?._id]);

  const handleCreateInvoice = async () => {
      if (!selectedCustomer) {
          showAlert('Please select a customer first.', 'warning');
          return;
      }
      // Mandatory Mobile Number Check
      if (searchedCustomer && (!searchedCustomer.phone || searchedCustomer.phone.length < 10)) {
           showAlert('Customer Mobile Number is mandatory for creating an invoice.', 'warning');
           return;
      }
      if (invoiceItems.length === 0) {
          showAlert('Please add at least one item.', 'warning');
          return;
      }
      
      const stockError = invoiceItems.some(item => Number(item.quantity) > getProductStock(item.product));
      if (stockError) {
          showAlert('Cannot create invoice: Quantity exceeds available stock for one or more items.', 'danger');
          return;
      }

      setIsLoading(true);
      const invoicePayload = buildInvoicePayload();
      
      if (invoicePayload) {
          try {
              const newInvoice = await createInvoice(invoicePayload);
              setIsLoading(false);
              setCreatedInvoice(newInvoice);
              setShowSuccessModal(true);
              resetForm();
          } catch (err) {
              console.error(err);
              setIsLoading(false);
          }
      } else {
          setIsLoading(false);
      }
  };

  // --- Print Logic (Ported from InvoiceFrontend) ---
  
  const getBase64ImageFromUrl = async (imageUrl) => {
      try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
          });
      } catch (error) {
          console.error("Error converting image to base64:", error);
          return null;
      }
  };

  const generateInvoiceHTML = (invoice, customer, companySettings, paymentSettings, logoBase64) => {
      const logoHtml = logoBase64 
        ? `<img src="${logoBase64}" alt="Company Logo" style="max-height: 50px; margin-bottom: 10px;"/>`
        : '';
        
       const paymentTermsHtml = paymentSettings.terms 
        ? `<p style="white-space: pre-wrap;"><strong>Payment Terms:</strong> ${paymentSettings.terms}</p>` 
        : '';
        
       // Use invoiceNumber properly
       const invoiceNumDisplay = invoice.invoiceNumber; // Already formatted as requested

      return `
        <html>
          <head>
            <title>Invoice ${invoiceNumDisplay}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
              th { background-color: #f5f5f5; }
              .total-row { font-weight: bold; background-color: #f8f9fa; }
              .text-right { text-align: right; }
              
              .invoice-header { background-color: #f5f5f5; padding: 15px; border-bottom: 2px solid #007bff; display: flex; justify-content: space-between; align-items: center; }
              .invoice-header h1 { color: #007bff; margin: 0; font-size: 24px; }
            </style>
          </head>
          <body>
            <div class="invoice-header">
              <div>
                ${logoHtml} <h1>TAX INVOICE</h1>
              </div>
              <div class="text-right">
                <p style="margin-bottom: 5px;"><strong>Invoice #:</strong> ${invoiceNumDisplay}</p>
                <p style="margin-bottom: 5px;"><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleString()}</p>
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
                    <th>Price</th>
                    <th>Disc %</th>
                    <th>Taxable Value</th>
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
                      <td>${formatCurrency(item.mrp || item.price)}</td>
                      <td>${item.discount || 0}%</td>
                      <td>${formatCurrency(item.price)}</td>
                      <td>${item.taxRate || '0'}%</td>
                      <td class="text-right">${formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0) * (1 + (Number(item.taxRate) || 0) / 100))}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div style="display: flex; justify-content: flex-end;">
                 <table style="width: 40%; border-collapse: collapse;">
                    <tr>
                        <td style="border: none; padding: 5px; text-align: right;"><strong>Taxable Amount:</strong></td>
                        <td style="border: none; padding: 5px; text-align: right;">${formatCurrency(invoice.subtotal)}</td>
                    </tr>
                    <tr>
                        <td style="border: none; padding: 5px; text-align: right;"><strong>Total Tax:</strong></td>
                        <td style="border: none; padding: 5px; text-align: right;">${formatCurrency(invoice.taxDetails?.totalTax || 0)}</td>
                    </tr>
                    <tr style="font-size: 14px; border-top: 1px solid #ddd;">
                        <td style="border: none; padding: 10px 5px; text-align: right;"><strong>Grand Total:</strong></td>
                        <td style="border: none; padding: 10px 5px; text-align: right;"><strong>${formatCurrency(invoice.total)}</strong></td>
                    </tr>
                 </table>
              </div>
            </div>

            <div class="section">
                <h3>Tax Analysis</h3>
                <table>
                  <thead>
                    <tr>
                      <th rowspan="2">Tax Rate</th>
                      <th rowspan="2" class="text-right">Taxable Value</th>
                      ${invoice.taxDetails?.gstType === 'cgst_sgst' ? `
                          <th colspan="2" class="text-center">CGST</th>
                          <th colspan="2" class="text-center">SGST</th>
                      ` : `
                          <th colspan="2" class="text-center">IGST</th>
                      `}
                      <th rowspan="2" class="text-right">Total Tax</th>
                    </tr>
                    <tr>
                       ${invoice.taxDetails?.gstType === 'cgst_sgst' ? `
                           <th class="text-right">Rate</th>
                           <th class="text-right">Amount</th>
                           <th class="text-right">Rate</th>
                           <th class="text-right">Amount</th>
                       ` : `
                           <th class="text-right">Rate</th>
                           <th class="text-right">Amount</th>
                       `}
                    </tr>
                  </thead>
                  <tbody>
                    ${(() => {
                        // Ensure we have a breakdown
                        let breakdown = invoice.breakdown;
                        if (!breakdown || breakdown.length === 0) {
                             // Attempt to reconstruct simple breakdown from total if missing (fallback)
                             breakdown = [{
                                 rate: (invoice.taxDetails?.totalTax / invoice.subtotal * 100) || 0,
                                 taxable: invoice.subtotal,
                                 tax: invoice.taxDetails?.totalTax
                             }];
                        }

                        return breakdown.map(b => {
                            const rate = Number(b.rate || 0);
                            const taxable = Number(b.taxable || 0);
                            const tax = Number(b.tax || 0);
                            
                            if (invoice.taxDetails?.gstType === 'cgst_sgst') {
                                const halfRate = rate / 2;
                                const halfTax = tax / 2;
                                return `
                                    <tr>
                                      <td>GST ${rate}%</td>
                                      <td class="text-right">${formatCurrency(taxable)}</td>
                                      <td class="text-right">${halfRate}%</td>
                                      <td class="text-right">${formatCurrency(halfTax)}</td>
                                      <td class="text-right">${halfRate}%</td>
                                      <td class="text-right">${formatCurrency(halfTax)}</td>
                                      <td class="text-right">${formatCurrency(tax)}</td>
                                    </tr>
                                `;
                            } else {
                                return `
                                    <tr>
                                      <td>IGST ${rate}%</td>
                                      <td class="text-right">${formatCurrency(taxable)}</td>
                                      <td class="text-right">${rate}%</td>
                                      <td class="text-right">${formatCurrency(tax)}</td>
                                      <td class="text-right">${formatCurrency(tax)}</td>
                                    </tr>
                                `;
                            }
                        }).join('');
                    })()}
                    <tr class="total-row">
                        <td><strong>Total</strong></td>
                        <td class="text-right"><strong>${formatCurrency(invoice.subtotal)}</strong></td>
                         ${invoice.taxDetails?.gstType === 'cgst_sgst' ? `
                           <td></td>
                           <td class="text-right"><strong>${formatCurrency(invoice.taxDetails?.cgstAmount || 0)}</strong></td>
                           <td></td>
                           <td class="text-right"><strong>${formatCurrency(invoice.taxDetails?.sgstAmount || 0)}</strong></td>
                       ` : `
                           <td></td>
                           <td class="text-right"><strong>${formatCurrency(invoice.taxDetails?.igstAmount || 0)}</strong></td>
                       `}
                        <td class="text-right"><strong>${formatCurrency(invoice.taxDetails?.totalTax || 0)}</strong></td>
                    </tr>
                  </tbody>
                </table>
            </div>
            
            <div class="section" style="border-top: 1px solid #ddd; padding-top: 10px;">
                <p><strong>Payment Method:</strong> ${invoice.paymentType?.toUpperCase() || 'CASH'}</p>
                ${paymentTermsHtml}
                ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
            </div>
            
            <div class="text-right" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #000;">
                <p>Authorized Signature</p>
            </div>
          </body>
        </html>
      `;
  };

  const handlePrintInvoice = async (invoiceToPrint) => {
      const invoice = invoiceToPrint || createdInvoice;
      if (!invoice) return;

      const customer = invoice.customer || {}; // Should be full object
      const paymentSettings = settings.payment || {}; // Assuming settings available
      
      let logoBase64 = null;
      if (companySettings.logo) {
          logoBase64 = await getBase64ImageFromUrl(`${SERVER_URL}${companySettings.logo}`);
      }

      const htmlContent = generateInvoiceHTML(invoice, customer, companySettings, paymentSettings, logoBase64);
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
  };

  const paymentTypes = [
      { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, 
      { value: 'upi', label: 'UPI' }, { value: 'bank_transfer', label: 'Bank Transfer' }, 
      { value: 'cheque', label: 'Cheque' }
  ];
  
  const shouldShowCustomerCard = customerSearch && (searchedCustomer === null || (searchedCustomer && !selectedCustomer));

  return (
    <Container fluid className="vh-100 d-flex flex-column overflow-hidden p-3 bg-light-subtle">
        <div className="d-flex justify-content-between align-items-center mb-2 flex-shrink-0">
             <h4 className="fw-bold text-dark mb-0 d-flex align-items-center">
                 <ShoppingCart className="me-2"/> Billing
             </h4>
             <Button variant="outline-secondary" size="sm" onClick={() => navigate('/invoices')}>
                    <ArrowLeft size={16} className="me-1" /> History
             </Button>
        </div>

        {backend.alert.show && (
            <Alert variant={backend.alert.type} onClose={() => backend.showAlert('', '')} dismissible className="flex-shrink-0 mb-2">
                {backend.alert.message}
            </Alert>
        )}

        <Row className="flex-grow-1 overflow-hidden g-3">
            {/* LEFT COLUMN: Billing Details */}
            <Col md={8} className="d-flex flex-column h-100 overflow-hidden">
                  
                  {/* Customer Card */}
                  <Card className="shadow-sm mb-3 border-0 flex-shrink-0">
                      <Card.Body className="">
                        <Row className="gy-2">
                          <Col md={6}>
                            <InputGroup className="mt-3 gap-1">
                                    <InputGroup.Text><Search size={18}/></InputGroup.Text>
                                    <Form.Control 
                                      type="text" 
                                      placeholder="Customer Phone/Name" 
                                      value={customerSearch} 
                                      onChange={(e) => setCustomerSearch(e.target.value)} 
                                      onKeyPress={(e) => { if (e.key === 'Enter') handleCustomerSearchSubmit(); }}
                                      autoComplete="off"
                                    />
                                    <Button className="py-1" variant="primary" onClick={handleCustomerSearchSubmit} disabled={!customerSearch.trim()}>
                                        Check
                                    </Button>
                            </InputGroup>
                            
                             {showSuggestions && (
                                <ListGroup className="position-absolute shadow" style={{ zIndex: 1050, top: '100%', left: '15px', right: '15px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {suggestions.map(c => (
                                        <ListGroup.Item key={c._id} action onClick={() => handleSuggestionClick(c)}>
                                            <strong>{c.businessName || c.name}</strong> <small className='text-muted'>({c.phone})</small>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}

                             {selectedCustomer && searchedCustomer && (
                                <div className="mt-2 d-flex align-items-center justify-content-between bg-primary-subtle p-2 rounded text-primary border border-primary-subtle">
                                    <div className="d-flex align-items-center">
                                       <UserIcon size={16} className="me-2"/>
                                       <div>
                                           <div className="fw-bold lh-1">{searchedCustomer.name}</div>
                                           <div className="small opacity-75">{searchedCustomer.phone}</div>
                                       </div>
                                    </div>
                                    <X size={16} role="button" onClick={handleDeselectCustomer}/>
                                </div>
                             )}
                          </Col>
                          
                          <Col md={6} className="d-flex align-items-start">
                             {/* Payment Type & Status */}
              <Row className="g-2 mb-3">
                 <Col md={6}>
                    <Form.Group>
                        <Form.Label className="text-muted small mb-1">Payment Type</Form.Label>
                         <div className="input-group input-group-sm">
                              <span className="input-group-text bg-light border-end-0">
                                   <CreditCard size={16} />
                              </span>
                             <Form.Select 
                                value={paymentType} 
                                onChange={(e) => setPaymentType(e.target.value)}
                                className="border-start-0 shadow-none"
                             >
                                 {paymentTypes.map(type => (
                                     <option key={type.value} value={type.value}>{type.label}</option>
                                 ))}
                             </Form.Select>
                         </div>
                    </Form.Group>
                 </Col>
                 <Col md={6}>
                    <Form.Group>
                        <Form.Label className="text-muted small mb-1">Payment Status</Form.Label>
                        <div className="input-group input-group-sm">
                             <span className="input-group-text bg-light border-end-0">
                                  <Clock size={16} />
                             </span>
                            <Form.Select 
                               value={paymentStatus} 
                               onChange={(e) => setPaymentStatus(e.target.value)}
                               className="border-start-0 shadow-none"
                            >
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="draft">Draft</option>
                                <option value="overdue">Overdue</option>
                            </Form.Select>
                        </div>
                   </Form.Group>
                 </Col>
              </Row>          </Col>
                        </Row>
                        
                         {/* New Customer Form Inline */}
                        {shouldShowCustomerCard && (
                            <div className="mt-3 p-3 bg-light rounded border border-warning">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                     <strong><Plus size={16} className="me-1"/>New Customer</strong>
                                     <X className="cursor-pointer" size={16} onClick={() => setCustomerSearch('')} />
                                  </div>
                                  <Row className="g-2">
                                    <Col md={6}><Form.Control placeholder="Name *" name="name" value={localCustomerPayload.name} onChange={handleLocalCustomerPayloadChange} size="sm"/></Col>
                                    <Col md={6}><Form.Control placeholder="Phone" name="phone" value={localCustomerPayload.phone} onChange={handleLocalCustomerPayloadChange} size="sm"/></Col>
                                    
                                    <Col md={12}>
                                        <div className="text-end mb-2">
                                            <span 
                                                className="text-primary small cursor-pointer text-decoration-underline" 
                                                onClick={() => setShowFullCustomerForm(!showFullCustomerForm)}
                                                style={{cursor: 'pointer'}}
                                            >
                                                {showFullCustomerForm ? 'Hide Details' : 'Add Address & GST'}
                                                {showFullCustomerForm ? <ChevronUp size={12} className="ms-1"/> : <ChevronDown size={12} className="ms-1"/>}
                                            </span>
                                        </div>
                                    </Col>

                                    {showFullCustomerForm && (
                                        <>
                                            <Col md={6}><Form.Control placeholder="Business Name" name="businessName" value={localCustomerPayload.businessName} onChange={handleLocalCustomerPayloadChange} size="sm"/></Col>
                                            <Col md={6}><Form.Control placeholder="Email" name="email" value={localCustomerPayload.email} onChange={handleLocalCustomerPayloadChange} size="sm"/></Col>
                                            <Col md={6}><Form.Control placeholder="GST Number" name="gstNumber" value={localCustomerPayload.gstNumber} onChange={handleLocalCustomerPayloadChange} size="sm"/></Col>
                                            <Col md={6}><Form.Control placeholder="Street Address" name="address.street" value={localCustomerPayload.address.street} onChange={handleLocalCustomerPayloadChange} size="sm"/></Col>
                                            <Col md={4}><Form.Control placeholder="City" name="address.city" value={localCustomerPayload.address.city} onChange={handleLocalCustomerPayloadChange} size="sm"/></Col>
                                            <Col md={4}><Form.Control placeholder="State" name="address.state" value={localCustomerPayload.address.state} onChange={handleLocalCustomerPayloadChange} size="sm"/></Col>
                                            <Col md={4}><Form.Control placeholder="Zip Code" name="address.zipCode" value={localCustomerPayload.address.zipCode} onChange={handleLocalCustomerPayloadChange} size="sm"/></Col>
                                        </>
                                    )}

                                    <Col md={12} className="text-end">
                                        <Button size="sm" variant="success" onClick={handleCreateCustomer} disabled={!localCustomerPayload.name}>Create & Select</Button>
                                    </Col>
                                  </Row>
                            </div>
                        )}
                      </Card.Body>
                  </Card>

                  {/* Items Table Container */}
                  <Card className="shadow-sm border-0 flex-grow-1 overflow-hidden d-flex flex-column">
                       <Card.Header className="bg-light py-2 fw-bold d-flex justify-content-between align-items-center flex-shrink-0">
                           <span>Items ({invoiceItems.length})</span>
                           <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={addItem}><Plus size={16}/> Manual Row</Button>
                       </Card.Header>
                       
                       <div className="table-responsive flex-grow-1 overflow-auto">
                            <Table hover className="mb-0 table-sm align-middle sticky-header-table">
                                <thead className="bg-light section-header">
                                    <tr>
                                        <th style={{width: '20%'}}>Product</th>
                                        <th style={{width: '10%'}}>Qty</th>
                                        <th style={{width: '12%'}}>Price</th>
                                        <th style={{width: '10%'}}>Disc %</th>
                                        <th style={{width: '15%'}}>Taxable Value</th>
                                        <th style={{width: '10%'}}>Tax %</th>
                                        <th style={{width: '15%'}} className="text-end">Total</th>
                                        <th style={{width: '5%'}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoiceItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <Form.Select size="sm" value={item.product} onChange={(e) => handleProductSelect(idx, e.target.value)} style={{maxWidth: '180px'}}>
                                                    <option value="">Select</option>
                                                    {products.map(p => (
                                                        <option key={p._id} value={p._id} disabled={Number(p.stock)===0}>
                                                            {p.name} {Number(p.stock)===0 ? '(No Stock)' : ''}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </td>
                                            <td>
                                                <Form.Control size="sm" type="number" min="1" value={item.quantity} 
                                                    onChange={(e) => handleItemFieldChange(idx, 'quantity', Math.max(1, parseInt(e.target.value)||1))}
                                                />
                                            </td>
                                            <td>
                                                <Form.Control size="sm" type="number" min="0" value={item.mrp || 0}
                                                    onChange={(e) => handleItemFieldChange(idx, 'mrp', Math.max(0, parseFloat(e.target.value) || 0))}
                                                />
                                            </td>
                                            <td>
                                                 <Form.Control size="sm" type="number" min="0" value={item.discount || 0}
                                                    onChange={(e) => handleItemFieldChange(idx, 'discount', Math.max(0, parseFloat(e.target.value) || 0))}
                                                />
                                            </td>
                                            <td>
                                                <Form.Control size="sm" type="number" min="0" value={item.price} 
                                                    onChange={(e) => handleItemFieldChange(idx, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                                                    className="bg-light"
                                                    title="Net Price"
                                                />
                                            </td>
                                            <td>
                                                <Form.Control size="sm" type="number" min="0" value={item.taxRate} 
                                                    onChange={(e) => handleItemFieldChange(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                                                    placeholder="%"
                                                />
                                            </td>
                                            <td className="text-end fw-bold">
                                                {formatCurrency((Number(item.quantity)||0) * (Number(item.price)||0) * (1 + (Number(item.taxRate)||0)/100))}
                                            </td>
                                            <td>
                                                <X size={16} className="text-danger cursor-pointer" onClick={() => removeItem(idx)}/>
                                            </td>
                                        </tr>
                                    ))}
                                    {invoiceItems.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="text-center py-5 text-muted">
                                                Click items from the list on the right.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                       </div>
                       
                       <Card.Footer className="bg-white border-top pb-4 flex-shrink-0">
                           <Row>
                               <Col>
                                  <div className="d-flex justify-content-between mb-1">
                                      <span>Taxable Subtotal:</span>
                                      <strong>{formatCurrency(totals.subtotal)}</strong>
                                  </div>
                                  <div className="d-flex justify-content-between mb-1 text-muted small">
                                      <span>Total Tax:</span>
                                      <span>{formatCurrency(totals.totalTax)}</span>
                                  </div>
                                  <div className="d-flex justify-content-between fs-5 text-primary fw-bold mt-2 pt-2 border-top">
                                      <span>Total:</span>
                                      <span>{formatCurrency(totals.total)}</span>
                                  </div>
                               </Col>
                               <Col className="d-flex align-items-end justify-content-end">
                                    <Button 
                                        variant="primary" 
                                        size="lg" 
                                        onClick={handleCreateInvoice}
                                        disabled={!selectedCustomer || invoiceItems.length===0 || isLoading}
                                        className="w-100"
                                    >
                                        {isLoading ? <Spinner size="sm"/> : 'Create Invoice'}
                                    </Button>
                               </Col>
                           </Row>
                       </Card.Footer>
                  </Card>
            </Col>

            {/* RIGHT COLUMN: Product Picker (POS) */}
            <Col md={4} className="h-100 ps-0 d-flex flex-column overflow-hidden">
                <Card className="h-100 shadow-sm border-0 d-flex flex-column overflow-hidden">
                    <Card.Header className="bg-light p-2 flex-shrink-0">
                         <InputGroup size="sm">
                            <InputGroup.Text><Search size={14}/></InputGroup.Text>
                            <Form.Control 
                                placeholder="Search Products..." 
                                value={productSearchTerm}
                                onChange={(e) => setProductSearchTerm(e.target.value)}
                            />
                         </InputGroup>
                    </Card.Header>
                    <div className="flex-grow-1 overflow-auto p-2" style={{backgroundColor: '#f8f9fa'}}>
                        <Row className="g-2">
                             {filteredProducts.map(p => {
                                 const stock = Number(p.stock) || 0;
                                 const isOut = stock <= 0;
                                 return (
                                     <Col xs={6} key={p._id}>
                                         <Card 
                                            className={`h-100 border-0 shadow-sm product-card ${isOut ? 'opacity-50' : ''}`} 
                                            onClick={() => !isOut && handleAddProductFromList(p)}
                                            style={{cursor: isOut ? 'not-allowed' : 'pointer', transition: 'transform 0.1s'}}
                                         >
                                             <Card.Body className="d-flex flex-column text-center">
                                                 {/* <div className="mb-2 d-flex justify-content-center align-items-center bg-light rounded" style={{height: '60px'}}> */}
                                                     {/* Use product image if available, else placeholder */}
                                                     {/* <Box size={24} className="text-secondary"/> */}
                                                 {/* </div> */}
                                                 <div className="fw-bold text-truncate mb-1" title={p.name}>{p.name}</div>
                                                 <div className="small text-muted mb-1">{p.sku}</div>
                                                 <div className="mt-auto">
                                                     <div className="fw-bold text-primary">{formatCurrency(p.price)}</div>
                                                      <div className="d-flex justify-content-between align-items-center mt-1">
                                                          <small className={stock < 5 ? 'text-warning' : 'text-success'}>
                                                              {isOut ? 'Out' : `Quantity: ${stock}`}
                                                          </small>
                                                          {p.mrp && p.mrp > p.price && (
                                                              <small className="text-decoration-line-through text-muted ms-1" style={{fontSize: '0.7rem'}}>
                                                                  {formatCurrency(p.mrp)}
                                                              </small>
                                                          )}
                                                      </div>
                                                 </div>
                                             </Card.Body>
                                         </Card>
                                     </Col>
                                 )
                             })}
                             {filteredProducts.length === 0 && (
                                 <div className="text-center text-muted mt-5">No products found</div>
                             )}
                        </Row>
                    </div>
                </Card>
            </Col>

        </Row>

        {/* Success Modal */}
        <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title className="text-success">Invoice Created Successfully</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center py-4">
                <div className="mb-3">
                    <div className="rounded-circle bg-success bg-opacity-10 d-inline-flex p-3">
                        <Save size={32} className="text-success"/>
                    </div>
                </div>
                <h4>Invoice #{createdInvoice?.invoiceNumber}</h4>
                <p className="text-muted">has been saved to the system.</p>
                
                <div className="d-flex justify-content-center gap-3 mt-4">
                    <Button variant="outline-secondary" onClick={() => { setShowSuccessModal(false); setCreatedInvoice(null); }}>
                        <Plus size={18} className="me-2"/> Create New
                    </Button>
                    <Button variant="primary" size="lg" onClick={() => handlePrintInvoice(createdInvoice)}>
                        <Printer size={20} className="me-2"/> Print Invoice
                    </Button>
                </div>
            </Modal.Body>
        </Modal>

        <style>
            {`
            .product-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
            }
            .sticky-header-table th {
                position: sticky;
                top: 0;
                background-color: #f8f9fa;
                z-index: 10;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            `}
        </style>
    </Container>
  );
};

export default Billing;
