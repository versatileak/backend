const Razorpay = require('razorpay');
const crypto = require('crypto');
const Settings = require('../models/Settings');

// Always get fresh Razorpay instance from database settings
const getFreshRazorpayInstance = async () => {
  const settings = await Settings.getSettings();

  if (!settings.razorpay_key_id || !settings.razorpay_key_secret) {
    throw new Error('Razorpay credentials not configured');
  }

  return new Razorpay({
    key_id: settings.razorpay_key_id,
    key_secret: settings.razorpay_key_secret
  });
};

// Get Razorpay instance
exports.getRazorpay = async () => {
  return await getFreshRazorpayInstance();
};

// Create order
exports.createOrder = async (amount, currency, receipt, notes = {}) => {
  try {
    const razorpay = await exports.getRazorpay();

    const options = {
      amount: Number(amount) * 100,
      currency: currency || 'INR',
      receipt,
      notes
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
};

// Verify payment signature
exports.verifyPayment = async (orderId, paymentId, signature) => {
  try {
    const settings = await Settings.getSettings();

    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', settings.razorpay_key_secret)
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

  const monthlyAmount = Number(settings?.pricing?.monthly?.amount || 999);
  const monthlyCurrency = settings?.pricing?.monthly?.currency || 'INR';
  const monthlyDescription = settings?.pricing?.monthly?.description || 'Monthly Premium Access';

  const yearlyAmount = Number(settings?.pricing?.yearly?.amount || 2999);
  const yearlyCurrency = settings?.pricing?.yearly?.currency || 'INR';
  const yearlyDescription = settings?.pricing?.yearly?.description || 'Yearly Premium Access';
  const yearlyDiscount = Number(settings?.pricing?.yearly?.discount_percentage || 17);

  if (planType === 'monthly') {
    return {
      amount: monthlyAmount,
      currency: monthlyCurrency,
      description: monthlyDescription
    };
  }

  if (planType === 'quarterly') {
    const quarterlyAmount = Math.round(monthlyAmount * 3 * 0.9); // 10% off
    return {
      amount: quarterlyAmount,
      currency: monthlyCurrency,
      description: 'Quarterly Premium Access',
      discount_percentage: 10
    };
  }

  if (planType === 'yearly') {
    return {
      amount: yearlyAmount,
      currency: yearlyCurrency,
      description: yearlyDescription,
      discount_percentage: yearlyDiscount
    };
  }

  throw new Error('Invalid plan type');
};

// Calculate expiry date
exports.calculateExpiryDate = (planType) => {
  const now = new Date();

  if (planType === 'monthly') {
    return new Date(now.setMonth(now.getMonth() + 1));
  }

  if (planType === 'quarterly') {
    return new Date(now.setMonth(now.getMonth() + 3));
  }

  if (planType === 'yearly') {
    return new Date(now.setFullYear(now.getFullYear() + 1));
  }

  return null;
};