// InvoiceBackend.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const SETTINGS_API_BASE_URL = `${API_BASE_URL}/settings`;

/**
 * useInvoiceBackend
 * - centralises API calls + state management for invoices feature
 */
export default function useInvoiceBackend() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]); 
  
  // NEW STATE: Global Settings
  const [settings, setSettings] = useState({
      company: {},
      payment: {}
  });
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  
  const [taxDetails, setTaxDetails] = useState({ 
    cgst: 9, sgst: 9, igst: 0, gstType: 'cgst_sgst' 
  }); 

  // NEW STATE: Invoice Stats
  const [invoiceStats, setInvoiceStats] = useState({
      totalCount: 0,
      totalRevenue: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      draftCount: 0
  }); 

  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showAlert = useCallback((message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 4000);
  }, []);
  
  // --- FETCH SETTINGS ---
  const fetchSettings = useCallback(async () => {
    try {
        const res = await axios.get(SETTINGS_API_BASE_URL, { headers: getAuthHeaders() });
        setSettings(res.data);
    } catch (error) {
        console.error("Failed to load company settings:", error);
    }
  }, []); 
  
  // --- Core API Handlers (Stock Check integrated) ---

  const fetchInvoices = useCallback(async (queryParams = {}) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/invoices`, { 
          headers: getAuthHeaders(),
          params: queryParams 
      });
      const invoicesData = res.data.invoices || res.data;
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (err) {
      showAlert('Error fetching invoices', 'danger');
    }
  }, [showAlert]);

  // NEW: Fetch Invoice Stats
  const fetchInvoiceStats = useCallback(async () => {
      try {
          const res = await axios.get(`${API_BASE_URL}/invoices/stats`, { headers: getAuthHeaders() });
          setInvoiceStats(res.data);
      } catch (err) {
          console.error("Error fetching invoice stats:", err);
      }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/customers`, { 
        headers: getAuthHeaders(),
        params: { limit: 1000 }
      });
      const customersData = res.data.customers || res.data;
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (err) {
      showAlert('Error fetching customers', 'danger');
    }
  }, [showAlert]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/products`, { 
        headers: getAuthHeaders(),
        params: { limit: 1000 }
      });
      const productsData = res.data.products || res.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      showAlert('Error fetching products', 'danger');
    }
  }, [showAlert]);

  const createInvoice = async (invoicePayload) => {
    // Stock check integration for validation
    const itemsToCheck = invoicePayload.items;
    const errors = [];
    
    itemsToCheck.forEach(item => {
        const product = products.find(p => p._id === item.product);
        const requiredQuantity = Number(item.quantity) || 0;
        const currentStock = Number(product?.stock) || 0;

        if (!product) {
            errors.push(`Product ID ${item.product} not found.`);
        } else if (currentStock === 0) {
            errors.push(`${product.name} is currently out of stock (0 available).`);
        } else if (requiredQuantity > currentStock) {
            errors.push(`${product.name} only has ${currentStock} units available. You requested ${requiredQuantity}.`);
        }
    });

    if (errors.length > 0) {
        showAlert(errors.join(' | '), 'danger');
        throw new Error('Stock check failed');
    }
    
    try {
      // Backend will save the sequential invoiceNumber provided in payload
      const res = await axios.post(`${API_BASE_URL}/invoices`, invoicePayload, { headers: getAuthHeaders() });
      await Promise.all([fetchInvoices(), fetchProducts(), fetchInvoiceStats()]); // Refetch stats too
      showAlert('Invoice created successfully!', 'success');
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Error creating invoice';
      showAlert(message, 'danger');
      throw err;
    }
  };

  const updateInvoice = async (invoiceId, invoicePayload) => {
    try {
      // Backend will use the existing sequential invoiceNumber in payload
      await axios.put(`${API_BASE_URL}/invoices/${invoiceId}`, invoicePayload, { headers: getAuthHeaders() });
      await Promise.all([fetchInvoices(), fetchProducts(), fetchInvoiceStats()]);
      showAlert('Invoice updated successfully!', 'success');
    } catch (err) {
      const message = err.response?.data?.message || 'Error updating invoice';
      showAlert(message, 'danger');
      throw err;
    }
  };

  const deleteInvoice = async (invoiceId, refetchParams = {}) => {
    try {
      await axios.delete(`${API_BASE_URL}/invoices/${invoiceId}`, { headers: getAuthHeaders() });
      await Promise.all([fetchInvoices(refetchParams), fetchProducts(), fetchInvoiceStats()]);
      showAlert('Invoice moved to trash!', 'success');
    } catch (err) {
      showAlert('Error deleting invoice', 'danger');
      throw err;
    }
  };

  const restoreInvoice = async (invoiceId, refetchParams = {}) => {
    try {
      await axios.patch(`${API_BASE_URL}/invoices/${invoiceId}/restore`, {}, { headers: getAuthHeaders() });
      await Promise.all([fetchInvoices(refetchParams), fetchInvoiceStats()]);
      showAlert('Invoice restored successfully!', 'success');
    } catch (err) {
      const message = err.response?.data?.message || 'Error restoring invoice';
      showAlert(message, 'danger');
      throw err;
    }
  };
  
  const createCustomer = async (customerPayload) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/customers`, customerPayload, { headers: getAuthHeaders() });
      setCustomers(prev => [...prev, res.data]);
      showAlert('Customer created successfully', 'success');
      return res.data;
    } catch (err) {
      showAlert('Error creating customer', 'danger');
      throw err;
    }
  };

  // UPDATED: Search function to handle both phone (primary) and business name (if provided in payload)
  const searchCustomerByPhone = async (searchQuery) => {
    try {
      let params = {};
      
      // Determine if the query is likely a phone number (mostly digits) or a business name
      const isPhone = !isNaN(searchQuery.trim()) && searchQuery.trim().length >= 5;

      if (isPhone) {
          params.phone = searchQuery;
      } else {
          params.businessName = searchQuery;
      }
      
      // Assuming the backend handles the OR logic based on these parameters
      const res = await axios.get(`${API_BASE_URL}/customers/search`, { 
          params,
          headers: getAuthHeaders() 
      });
      return res.data;
    } catch (err) {
      return null;
    }
  };

  const exportInvoices = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/invoices/export`, { responseType: 'blob', headers: getAuthHeaders() });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'invoices.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showAlert('Invoices exported successfully', 'success');
    } catch (err) {
      showAlert('Error exporting invoices', 'danger');
    }
  };
  
  // --- Invoice Item Handlers ---

  const addItem = () => {
    setInvoiceItems(prev => [...prev, {
      product: '', description: '', hsnCode: '', quantity: 1, price: 0, mrp: 0, discount: 0, taxRate: 18
    }]);
  };

  const removeItem = (index) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setInvoiceItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      if (field === 'product' && value) {
        const found = products.find(p => p._id === value);
        if (found) {
          // Default logic: Price = Selling Price (from DB). 
          // If MRP exists, set it. Discount = MRP - Price (initially).
          // Or just 0 discount initially.
          const dbPrice = typeof found.price === 'number' ? found.price : parseFloat(found.price || 0);
          const dbMrp = typeof found.mrp === 'number' ? found.mrp : (dbPrice * 1.0); // Fallback MRP = Price if missing

          copy[index].price = dbPrice; 
          copy[index].mrp = dbMrp;
          copy[index].discount = 0; // Reset discount on product select
          copy[index].description = found.description || found.name || copy[index].description;
          copy[index].hsnCode = found.hsnCode || '';
          copy[index].taxRate = found.taxRate ?? 18; 
          
          const currentStock = Number(found.stock) || 0;
          if (currentStock <= 0) {
              showAlert(`${found.name} is currently out of stock.`, 'danger');
          } else if (currentStock < 5) {
              showAlert(`${found.name} is low in stock: ${currentStock} units remaining.`, 'warning');
          }
        }
      }
      return copy;
    });
  };

  const calculateTotalsForItems = useCallback((items = invoiceItems) => {
    let subtotal = 0; // Taxable Value
    let totalTax = 0;
    const breakdown = {}; // { '18': { taxable: 0, tax: 0 } }
    
    items.forEach(it => {
      const price = Number(it.price) || 0; 
      const quantity = Number(it.quantity) || 0;
      const taxRate = Number(it.taxRate) || 0;
      
      const itemTaxableValue = price * quantity;
      const itemTaxAmount = itemTaxableValue * (taxRate / 100);
      
      subtotal += itemTaxableValue;
      totalTax += itemTaxAmount;
      
      if (!breakdown[taxRate]) {
          breakdown[taxRate] = { taxable: 0, tax: 0 };
      }
      breakdown[taxRate].taxable += itemTaxableValue;
      breakdown[taxRate].tax += itemTaxAmount;
    });

    const total = subtotal + totalTax;
    
    // Sort rates for consistent display
    const sortedRates = Object.keys(breakdown).map(Number).sort((a,b) => a-b);
    const sortedBreakdown = sortedRates.map(rate => ({ 
        rate, 
        ...breakdown[rate] 
    }));

    const avgTaxRate = (subtotal > 0) ? (totalTax / subtotal) * 100 : 0;
    
    return { 
      subtotal, 
      cgstAmount: totalTax / 2, 
      sgstAmount: totalTax / 2, 
      igstAmount: totalTax, 
      totalTax, 
      total,
      breakdown: sortedBreakdown, // Passing the breakdown array
      taxDetails: {
        cgst: avgTaxRate / 2, 
        sgst: avgTaxRate / 2, 
        igst: avgTaxRate,
        gstType: totalTax > 0 ? 'cgst_sgst' : 'none',
        totalTax
      }
    };
  }, [invoiceItems]);
  
  const resetForm = () => {
    setSelectedCustomer(null);
    setInvoiceItems([]);
    setTaxDetails({ cgst: 9, sgst: 9, igst: 0, gstType: 'cgst_sgst' }); 
    setNotes('');
    setDueDate('');
    setPaymentType('cash');
  };
  
  const getProductStock = useCallback((productId) => {
      const product = products.find(p => p._id === productId);
      return Number(product?.stock) || 0;
  }, [products]);


  // --- Initial Load ---

  useEffect(() => {
    fetchSettings();
    fetchInvoices();
    fetchCustomers();
    fetchProducts(); 
    fetchInvoiceStats(); // NEW: Initial fetch
  }, [fetchSettings, fetchInvoices, fetchCustomers, fetchProducts, fetchInvoiceStats]);

  return {
    // Data
    invoices, customers, products, settings, invoiceStats, // Export stats 
    
    // Form State
    selectedCustomer, setSelectedCustomer,
    invoiceItems, setInvoiceItems,
    taxDetails, setTaxDetails, 
    notes, setNotes,
    dueDate, setDueDate,
    paymentType, setPaymentType,

    // Actions
    fetchInvoices, fetchInvoiceStats, createInvoice, updateInvoice, deleteInvoice, restoreInvoice, exportInvoices,
    createCustomer, searchCustomerByPhone, addItem, removeItem, updateItem,

    // Totals & Helpers
    calculateTotalsForItems, resetForm, getProductStock,
    
    // Alerts
    alert, showAlert
  };
}