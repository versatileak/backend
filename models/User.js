const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription_status: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  plan_type: {
    type: String,
    enum: ['none', 'monthly', 'yearly'],
    default: 'none'
  },
  expiry_date: {
    type: Date,
    default: null
  },
  payment_history: [{
    order_id: String,
    payment_id: String,
    amount: Number,
    currency: String,
    plan_type: String,
    status: String,
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  razorpay_customer_id: {
    type: String,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_login: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updated_at = Date.now();
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if subscription is active
userSchema.methods.hasActiveSubscription = function() {
  if (this.subscription_status !== 'premium') return false;
  if (!this.expiry_date) return false;
  return new Date() < this.expiry_date;
};

// Get subscription days remaining
userSchema.methods.getSubscriptionDaysRemaining = function() {
  if (!this.hasActiveSubscription()) return 0;
  const diffTime = this.expiry_date - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('User', userSchema);
