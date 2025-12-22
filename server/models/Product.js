// models/Product.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  mrp: { type: Number },
  costPrice: Number,
  sku: { type: String, unique: true },
  category: String,
  taxRate: { type: Number, default: 0 },
  
  // --- ADDED STOCK FIELDS ---
  stock: { type: Number, required: true, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  // --------------------------
  
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export const ProductSchema = productSchema;
export default mongoose.model('Product', productSchema);