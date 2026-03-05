const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ✅ IMPORTANT FOR RENDER
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ytlcnich')
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});


// ================= ROUTES =================

// Auth
app.use('/api/auth', require('./routes/authRoutes'));

// Niches
app.use('/api/niches', require('./routes/nicheRoutes'));

// Payment
app.use('/api/payment', require('./routes/paymentRoutes'));

// AI
app.use('/api/ai', require('./routes/aiRoutes'));

// Admin
app.use('/api/admin', require('./routes/adminRoutes'));

// User
app.use('/api/user', require('./routes/userRoutes'));


// ✅ ADD THIS NEW PLANS API
app.get('/api/plans', (req, res) => {
  res.json({
    status: "success",
    plans: [
      {
        id: "free",
        name: "Free Plan",
        price: 0,
        features: [
          "5 Niches Access",
          "Basic AI Script Generator",
          "Limited Support"
        ]
      },
      {
        id: "pro",
        name: "Pro Plan",
        price: 19,
        features: [
          "Unlimited Niches",
          "Advanced AI Script",
          "Premium Support"
        ]
      }
    ]
  });
});


// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});


// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});


// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});


// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;