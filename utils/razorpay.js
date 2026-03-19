const Razorpay = require('razorpay');
const crypto = require('crypto');
const Settings = require('../models/Settings');

// ===============================
// GET RAZORPAY INSTANCE
// ===============================
const getRazorpay = async () => {
  const settings = await Settings.getSettings();

  if (!settings.razorpay_key_id || !settings.razorpay_key_secret) {
    throw new Error('Razorpay credentials not configured');
  }

  return new Razorpay({
    key_id: settings.razorpay_key_id,
    key_secret: settings.razorpay_key_secret
  });
};

// ===============================
// CREATE ORDER
// ===============================
exports.createOrder = async (amount, currency, receipt, notes = {}) => {
  try {
    const razorpay = await getRazorpay();

    const order = await razorpay.orders.create({
      amount: Number(amount) * 100,
      currency: currency || 'INR',
      receipt,
      notes
    });

    return order;
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
};

// ===============================
// VERIFY PAYMENT SIGNATURE
// ===============================
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

// ===============================
// VERIFY WEBHOOK
// ===============================
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

// ===============================
// FETCH PAYMENT
// ===============================
exports.fetchPayment = async (paymentId) => {
  try {
    const razorpay = await getRazorpay();
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    console.error('Fetch payment error:', error);
    throw error;
  }
};

// ===============================
// GET PLAN AMOUNT (FIXED)
// ===============================
exports.getPlanAmount = async (planType) => {
  const settings = await Settings.getSettings();

  const monthly = settings?.pricing?.monthly || {};
  const quarterly = settings?.pricing?.quarterly || {};
  const yearly = settings?.pricing?.yearly || {};

  if (planType === 'monthly') {
    return {
      amount: Number(monthly.amount || 999),
      currency: monthly.currency || 'INR',
      description: monthly.description || 'Monthly Premium Access'
    };
  }

  if (planType === 'quarterly') {
    return {
      amount: Number(quarterly.amount || 2499),
      currency: quarterly.currency || 'INR',
      description: quarterly.description || 'Quarterly Premium Access',
      discount_percentage: Number(quarterly.discount_percentage || 10)
    };
  }

  if (planType === 'yearly') {
    return {
      amount: Number(yearly.amount || 2999),
      currency: yearly.currency || 'INR',
      description: yearly.description || 'Yearly Premium Access',
      discount_percentage: Number(yearly.discount_percentage || 17)
    };
  }

  throw new Error('Invalid plan type');
};

// ===============================
// CALCULATE EXPIRY DATE
// ===============================
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