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
  mrp: { // Added MRP
    type: Number,
    min: 0
  },
  discount: { // Added Discount (percent or fixed value, let's assume value or percent. Usually value is safer for totals, but UI might use percent. Let's add both or just value. Let's add value for now)
      type: Number,
      default: 0,
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
  // Total = (Price * Quantity) - Discount
  // OR Total = ((MRP or Price) * Quantity) - Discount ?
  // Usually Price is "Selling Price" which might be after discount.
  // User asked for "Add discount".
  // If we have Price and Discount, usually Total = (Price * Qty) - Discount?
  // OR Price is unit price, scale by Qty, then subtract discount?
  // Let's assume Discount is Total Discount for line item or Per Unit?
  // Commonly Per Unit Discount or Total Line Discount.
  // Let's assume Per Unit Discount for now? Or Total. 
  // Let's stick effectively to: Total = (Quantity * Price) - (Discount || 0) 
  // Wait, if Price is the final selling price per unit, then discount is just for display.
  // But often users want Base Price -> Discount -> Net Price.
  // Let's interpret: Price = Unit Selling Price (after discount).
  //  Start with MRP.
  //  Discount = MRP - Price.
  // OR User enters MRP, Discount, and we calculate Price.
  // Let's enable storing them. Logic will be in frontend or backend.
  // Backend `pre('save')` should be consistent.
  // Let's say: Total = (this.price * this.quantity). 
  // If discount is stored, it's informational or derived. 
  // Let's keep Total = Price * Quantity. (Where Price is the effective unit price).
  this.total = (this.price * this.quantity); 
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
  // Detailed tax totals per tax rate
  breakdown: [{
      rate: Number,
      taxable: Number,
      tax: Number
  }],
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
  
  // 1. Calculate Subtotal (Sum of Taxable Values)
  this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  // 2. Calculate Tax per Item and Build Breakdown
  let calculatedTotalTax = 0;
  const breakdownMap = {};

  this.items.forEach(item => {
      const itemTaxable = item.quantity * item.price;
      const itemTax = itemTaxable * (item.taxRate / 100);
      calculatedTotalTax += itemTax;

      if (!breakdownMap[item.taxRate]) {
          breakdownMap[item.taxRate] = { rate: item.taxRate, taxable: 0, tax: 0 };
      }
      breakdownMap[item.taxRate].taxable += itemTaxable;
      breakdownMap[item.taxRate].tax += itemTax;
  });

  // 3. Update Breakdown Array
  // Sort by rate for consistency
  this.breakdown = Object.values(breakdownMap).sort((a, b) => a.rate - b.rate);

  // 4. Update Tax Details & Total
  if (!this.taxDetails) {
      this.taxDetails = { gstType: 'cgst_sgst', cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
  }

  this.taxDetails.totalTax = calculatedTotalTax;

  if (this.taxDetails.gstType === 'cgst_sgst') {
      this.taxDetails.cgstAmount = calculatedTotalTax / 2;
      this.taxDetails.sgstAmount = calculatedTotalTax / 2;
      this.taxDetails.igstAmount = 0;
      // Derived average rates for display if needed (though breakdown is better)
      const avgRate = this.subtotal > 0 ? (calculatedTotalTax / this.subtotal) * 100 : 0;
      this.taxDetails.cgst = avgRate / 2;
      this.taxDetails.sgst = avgRate / 2;
  } else {
      this.taxDetails.igstAmount = calculatedTotalTax;
      this.taxDetails.cgstAmount = 0;
      this.taxDetails.sgstAmount = 0;
      const avgRate = this.subtotal > 0 ? (calculatedTotalTax / this.subtotal) * 100 : 0;
      this.taxDetails.igst = avgRate;
  }
  
  // 5. Final Total
  this.total = this.subtotal + this.taxDetails.totalTax;
  
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