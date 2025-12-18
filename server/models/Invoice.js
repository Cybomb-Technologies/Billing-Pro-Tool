import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  description: {
    type: String,
    required: true
  },
  hsnCode: String,
  quantity: { 
    type: Number, 
    required: true,
    min: 1
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  taxRate: { 
    type: Number, 
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    default: 0
  },
   paymentType: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque'],
    default: 'cash'
  }
});

// Calculate total before saving item
invoiceItemSchema.pre('save', function(next) {
  this.total = this.quantity * this.price;
  next();
});

const taxDetailsSchema = new mongoose.Schema({
  gstType: {
    type: String,
    enum: ['cgst_sgst', 'igst'],
    default: 'cgst_sgst'
  },
  cgst: {
    type: Number,
    default: 0
  },
  sgst: {
    type: Number,
    default: 0
  },
  igst: {
    type: Number,
    default: 0
  },
  cgstAmount: {
    type: Number,
    default: 0
  },
  sgstAmount: {
    type: Number,
    default: 0
  },
  igstAmount: {
    type: Number,
    default: 0
  },
  totalTax: {
    type: Number,
    default: 0
  }
});

const formattedBillSchema = new mongoose.Schema({
  invoiceNumber: String,
  invoiceDate: String,
  companyName: String, // <-- ADDED: Company Name
  branchName: String, // <-- ADDED: Branch Name from company info
  customer: {
    name: String,
    phone: String,
    email: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    gstNumber: String
  },
  items: [{
    description: String,
    hsnCode: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  subtotal: Number,
  taxDetails: taxDetailsSchema,
  total: Number,
  notes: String,
  dueDate: Date,
  status: String
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  items: [invoiceItemSchema],
  subtotal: { 
    type: Number, 
    required: true,
    min: 0
  },
  taxDetails: taxDetailsSchema,
  total: { 
    type: Number, 
    required: true,
    min: 0
  },
  status: { 
    type: String, 
    enum: ['draft', 'paid', 'pending', 'overdue'], 
    default: 'draft' 
  },
  dueDate: {
    type: Date,
    required: false // Make optional
  },
  paymentType: { // Moved/Added to root level
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque'],
    default: 'cash'
  },
  notes: String,
  formattedBill: formattedBillSchema,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
});

// Calculate totals before saving invoice
invoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  // Calculate tax amounts
  if (this.taxDetails) {
    if (this.taxDetails.gstType === 'cgst_sgst') {
      this.taxDetails.cgstAmount = this.subtotal * (this.taxDetails.cgst / 100);
      this.taxDetails.sgstAmount = this.subtotal * (this.taxDetails.sgst / 100);
      this.taxDetails.totalTax = this.taxDetails.cgstAmount + this.taxDetails.sgstAmount;
      this.taxDetails.igstAmount = 0;
    } else {
      this.taxDetails.igstAmount = this.subtotal * (this.taxDetails.igst / 100);
      this.taxDetails.totalTax = this.taxDetails.igstAmount;
      this.taxDetails.cgstAmount = 0;
      this.taxDetails.sgstAmount = 0;
    }
  }
  
  // Calculate total
  this.total = this.subtotal + (this.taxDetails?.totalTax || 0);
  
  next();
});

invoiceSchema.pre('save', async function(next) {
  // Only auto-generate if it's a new document AND no invoiceNumber was provided
  if (this.isNew && !this.invoiceNumber) { 
    try {
      const count = await mongoose.model('Invoice').countDocuments();
      // This is the old, long format.
      this.invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;
    } catch (error) {
      this.invoiceNumber = `INV-${Date.now()}`;
    }
  }
  // If this.invoiceNumber is already set by the frontend, this block is skipped.
  next();
});

export default mongoose.model('Invoice', invoiceSchema);