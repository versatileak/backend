const Razorpay = require('razorpay');
const crypto = require('crypto');
const Settings = require('../models/Settings');

// Initialize Razorpay with settings from database
let razorpayInstance = null;

const initializeRazorpay = async () => {
  try {
    const settings = await Settings.getSettings();
    
    if (!settings.razorpay_key_id || !settings.razorpay_key_secret) {
      throw new Error('Razorpay credentials not configured');
    }

    razorpayInstance = new Razorpay({
      key_id: settings.razorpay_key_id,
      key_secret: settings.razorpay_key_secret
    });

    return razorpayInstance;
  } catch (error) {
    console.error('Razorpay initialization error:', error.message);
    throw error;
  }
};

// Get Razorpay instance
exports.getRazorpay = async () => {
  if (!razorpayInstance) {
    await initializeRazorpay();
  }
  return razorpayInstance;
};

// Create order
exports.createOrder = async (amount, currency, receipt, notes = {}) => {
  try {
    const razorpay = await exports.getRazorpay();
    
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency || 'INR',
      receipt: receipt,
      notes: notes
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
};

// Verify payment signature
exports.verifyPayment = (orderId, paymentId, signature) => {
  try {
    const text = orderId + '|' + paymentId;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
};

// Verify webhook signature
exports.verifyWebhookSignature = (body, signature, secret) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
};

// Fetch payment details
exports.fetchPayment = async (paymentId) => {
  try {
    const razorpay = await exports.getRazorpay();
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Fetch payment error:', error);
    throw error;
  }
};

// Calculate plan amount
exports.getPlanAmount = async (planType) => {
  const settings = await Settings.getSettings();
  
  if (planType === 'monthly') {
    return {
      amount: settings.pricing.monthly.amount,
      currency: settings.pricing.monthly.currency,
      description: settings.pricing.monthly.description
    };
  } else if (planType === 'yearly') {
    return {
      amount: settings.pricing.yearly.amount,
      currency: settings.pricing.yearly.currency,
      description: settings.pricing.yearly.description,
      discount_percentage: settings.pricing.yearly.discount_percentage
    };
  }
  
  throw new Error('Invalid plan type');
};

// Calculate expiry date
exports.calculateExpiryDate = (planType) => {
  const now = new Date();
  
  if (planType === 'monthly') {
    return new Date(now.setMonth(now.getMonth() + 1));
  } else if (planType === 'yearly') {
    return new Date(now.setFullYear(now.getFullYear() + 1));
  }
  
  return null;
};
