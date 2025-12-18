// Invoices.jsx
import React from 'react';
import useInvoiceBackend from './Invoices/InvoiceBackend';
import InvoiceFrontend from './Invoices/InvoiceFrontend';
import { useAuth } from '../context/AuthContext'; // Re-imported from your original file

const Invoices = () => {
  const { user } = useAuth(); // Get user from context
  const backend = useInvoiceBackend();

  return (
      <InvoiceFrontend {...backend} user={user} />
  );
};

export default Invoices;