// routes/products.js
import express from 'express';
import Product from '../models/Product.js';
import { auth } from '../middleware/auth.js';
import pkg from 'csv-writer';
import { sendRestockNotification, sendLowStockOrderSuggestion } from '../utils/emailService.js';
const createObjectCsvStringifier = pkg.createObjectCsvStringifier;

const router = express.Router();

// Get all products with pagination
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter query (currently just active products)
    const query = { isActive: true };

    // Execute queries in parallel
    const [products, totalItems] = await Promise.all([
      Product.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }), // Sort by newest
      Product.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    console.log(`Fetched page ${page} with ${products.length} products. Total: ${totalItems}`);
    
    // Return standard pagination structure
    res.json({
      products,
      currentPage: page,
      totalPages,
      totalItems,
      hasMore: page < totalPages
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create product (Handles initial stock/threshold fields)
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating product with data:', req.body);
    
    // Ensure all required numeric fields are converted/defaulted
    const productData = {
      ...req.body,
      taxRate: req.body.taxRate || 18,
      stock: parseInt(req.body.stock) || 0, // Ensure stock is handled
      lowStockThreshold: parseInt(req.body.lowStockThreshold) || 10
    };
    
    const product = new Product(productData);
    const savedProduct = await product.save();
    
    console.log('Product created successfully:', savedProduct._id);
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'SKU already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

// Update product (Handles stock/threshold updates via main edit form)
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Updating product ID:', req.params.id);
    console.log('Update data:', req.body);
    
    const updateData = {
      ...req.body,
      price: parseFloat(req.body.price),
      costPrice: req.body.costPrice ? parseFloat(req.body.costPrice) : undefined,
      taxRate: req.body.taxRate ? parseFloat(req.body.taxRate) : 18,
      stock: parseInt(req.body.stock) || 0, // Handle stock update
      lowStockThreshold: parseInt(req.body.lowStockThreshold) || 10
    };
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Optional: Check if stock dropped below threshold after a general edit
    if (product.stock <= product.lowStockThreshold && product.stock > 0) {
        sendLowStockOrderSuggestion(product);
    }
    
    console.log('Product updated successfully:', product._id);
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'SKU already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

// --- NEW ROUTE: Update Stock Level (used by Inventory.jsx Restock Modal) ---
router.put('/:id/stock', auth, async (req, res) => {
  try {
    const { stock } = req.body;
    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ message: 'Invalid stock value provided.' });
    }

    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const oldStock = currentProduct.stock;
    const restockAmount = stock - oldStock;

    if (restockAmount > 0) {
        // 1. Update the stock quantity
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { stock: stock },
            { new: true, runValidators: true }
        );

        // 2. Send email notification for the restock action
        sendRestockNotification(updatedProduct, oldStock, restockAmount);

        // 3. Check if the new stock is below the threshold and send a general alert if needed (though it shouldn't be if it was a restock)
        if (updatedProduct.stock <= updatedProduct.lowStockThreshold && updatedProduct.stock > 0) {
            sendLowStockOrderSuggestion(updatedProduct);
        }

        console.log(`Stock updated for ${updatedProduct.name}. Restocked ${restockAmount} units.`);
        res.json(updatedProduct);
    } else {
        // Handle case where stock is reduced via the inventory page (optional warning)
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { stock: stock },
            { new: true, runValidators: true }
        );
        res.json(updatedProduct);
    }

  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ message: 'Error updating stock level.' });
  }
});
// --------------------------------------------------------------------------


// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted permanently' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export products to CSV
router.get('/export', auth, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'name', title: 'Product Name' },
        { id: 'sku', title: 'SKU' },
        { id: 'price', title: 'Price' },
        { id: 'stock', title: 'Current Stock' }, // ADDED STOCK
        { id: 'taxRate', title: 'Tax Rate %' },
        { id: 'category', title: 'Category' },
        { id: 'description', title: 'Description' }
      ]
    });

    const records = products.map(product => ({
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock: product.stock, // ADDED STOCK
      taxRate: product.taxRate,
      category: product.category,
      description: product.description
    }));

    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csvString);
  } catch (error) {
    console.error('Error exporting products:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;