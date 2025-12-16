// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Socket
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
import uploadRoutes from './routes/upload.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------- CORS CONFIG -------------------- */

const allowedOrigins = [
  'http://localhost:5173',
  'https://testing.cybomb.com'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman, curl, server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/* -------------------- MIDDLEWARE -------------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- DATABASE -------------------- */

const MONGODB_URI =
  process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

/* -------------------- SOCKET.IO -------------------- */

initializeSocket(server);

/* -------------------- ROUTES -------------------- */

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
app.use('/api/upload', uploadRoutes);

/* -------------------- STATIC FILES -------------------- */

app.use(express.static(path.join(__dirname, 'public')));

/* -------------------- TEST API -------------------- */

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

/* -------------------- SERVER START -------------------- */

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🧪 Test URL: http://localhost:${PORT}/api/test`);
});
