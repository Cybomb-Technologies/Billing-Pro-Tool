import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, default: 0 },
  minStockLevel: { type: Number, default: 0 },
  lastRestocked: Date,
  location: String
});

export const InventorySchema = inventorySchema;
export default mongoose.model('Inventory', inventorySchema);