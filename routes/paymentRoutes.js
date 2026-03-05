const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/auth');
const { paymentValidation, handleValidationErrors } = require('../middleware/validation');
const { 
  createOrder, 
  verifyPayment, 
  verifyWebhookSignature,
  getPlanAmount,
  calculateExpiryDate 
} = require('../utils/razorpay');

// @route   POST /api/payment/create-order
// @desc    Create Razorpay order
// @access  Private
router.post('/create-order', protect, paymentValidation, handleValidationErrors, async (req, res) => {
  try {
    const { plan_type } = req.body;

    // Get plan details
    const plan = await getPlanAmount(plan_type);

    // Create receipt ID
    const receipt = `order_${req.user._id}_${Date.now()}`;

    // Create Razorpay order
    const order = await createOrder(
      plan.amount,
      plan.currency,
      receipt,
      {
        user_id: req.user._id.toString(),
        plan_type: plan_type,
        email: req.user.email
      }
    );

    res.status(200).json({
      status: 'success',
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      plan: {
        type: plan_type,
        amount: plan.amount,
        currency: plan.currency,
        description: plan.description
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create order'
    });
  }
});

// @route   POST /api/payment/verify
// @desc    Verify payment and update subscription
// @access  Private
router.post('/verify', protect, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      plan_type 
    } = req.body;

    // Verify payment signature
    const isValid = verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment signature'
      });
    }

    // Calculate expiry date
    const expiryDate = calculateExpiryDate(plan_type);

    // Update user subscription
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        subscription_status: 'premium',
        plan_type: plan_type,
        expiry_date: expiryDate,
        $push: {
          payment_history: {
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
            amount: req.body.amount / 100, // Convert from paise
            currency: req.body.currency || 'INR',
            plan_type: plan_type,
            status: 'completed'
          }
        }
      },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Payment verified and subscription activated',
      user: {
        id: user._id,
        subscription_status: user.subscription_status,
        plan_type: user.plan_type,
        expiry_date: user.expiry_date,
        days_remaining: user.getSubscriptionDaysRemaining()
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify payment'
    });
  }
});

// @route   POST /api/payment/webhook
// @desc    Razorpay webhook handler
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const settings = await Settings.getSettings();
    
    // Verify webhook signature
    const isValid = verifyWebhookSignature(
      req.body,
      signature,
      settings.razorpay_webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook signature'
      });
    }

    const event = JSON.parse(req.body);

    // Handle payment captured event
    if (event.event === 'payment.captured') {
      const { order_id, id: payment_id } = event.payload.payment.entity;
      
      // Find user by order notes
      const orderNotes = event.payload.payment.entity.notes;
      if (orderNotes && orderNotes.user_id) {
        const user = await User.findById(orderNotes.user_id);
        if (user) {
          // Update payment history status
          const paymentRecord = user.payment_history.find(
            p => p.order_id === order_id
          );
          if (paymentRecord) {
            paymentRecord.status = 'captured';
            await user.save({ validateBeforeSave: false });
          }
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Webhook processing failed'
    });
  }
});

// @route   GET /api/payment/plans
// @desc    Get available subscription plans
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      status: 'success',
      plans: {
        monthly: {
          type: 'monthly',
          amount: settings.pricing.monthly.amount,
          currency: settings.pricing.monthly.currency,
          description: settings.pricing.monthly.description,
          features: [
            'Access to all niches',
            'AI Script Generator',
            'Detailed how-to guides',
            'Tools & resources list',
            'Priority support'
          ]
        },
        yearly: {
          type: 'yearly',
          amount: settings.pricing.yearly.amount,
          currency: settings.pricing.yearly.currency,
          description: settings.pricing.yearly.description,
          discount_percentage: settings.pricing.yearly.discount_percentage,
          savings: settings.pricing.monthly.amount * 12 - settings.pricing.yearly.amount,
          features: [
            'All Monthly features',
            '2 months FREE',
            'Early access to new niches',
            'Exclusive webinars',
            'Community access'
          ]
        }
      }
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch plans'
    });
  }
});

// @route   GET /api/payment/history
// @desc    Get user payment history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('payment_history');

    res.status(200).json({
      status: 'success',
      payments: user.payment_history.sort((a, b) => b.created_at - a.created_at)
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payment history'
    });
  }
});

module.exports = router;
