// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';

// Socket initializer
import { initializeSocket } from './utils/notifier.js';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import invoiceRoutes from './routes/invoices.js';
import inventoryRoutes from './routes/inventory.js';
import reportRoutes from './routes/reports.js';
import staffRoutes from './routes/stafflogs.js';
import settingsRoutes from './routes/settings.js';
import supportRoutes from './routes/support.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// ======================
// CORS CONFIG (IMPORTANT)
// ======================
app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  })
);

// ======================
// MIDDLEWARE
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
// DATABASE CONNECTION
// ======================
const MONGODB_URI =
  process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ======================
// SOCKET.IO INIT
// ======================
initializeSocket(server);

// ======================
// ROUTES
// ======================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stafflogs', staffRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/support', supportRoutes);

// ======================
// TEST ROUTE
// ======================
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// ======================
// SERVER START
// ======================
const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
});
