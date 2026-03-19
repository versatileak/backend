const express = require('express');
const router = express.Router();
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

router.post('/create-order', protect, paymentValidation, handleValidationErrors, async (req, res) => {
  try {
    const { plan_type } = req.body;

    const plan = await getPlanAmount(plan_type);
    const settings = await Settings.getSettings();

    if (!settings.razorpay_key_id || !settings.razorpay_key_secret) {
      return res.status(400).json({
        status: 'error',
        message: 'Razorpay credentials are not configured in admin settings'
      });
    }

    const receipt = `ord_${Date.now()}`;

    const order = await createOrder(
      plan.amount,
      plan.currency,
      receipt,
      {
        user_id: req.user._id.toString(),
        plan_type,
        email: req.user.email
      }
    );

    return res.status(200).json({
      status: 'success',
      key: settings.razorpay_key_id,
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
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create order'
    });
  }
});

router.post('/verify', protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan_type
    } = req.body;

    const isValid = await verifyPayment(
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

    const expiryDate = calculateExpiryDate(plan_type);

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
            amount: req.body.amount / 100,
            currency: req.body.currency || 'INR',
            plan_type: plan_type,
            status: 'completed'
          }
        }
      },
      { new: true }
    );

    return res.status(200).json({
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
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify payment'
    });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const settings = await Settings.getSettings();

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

    if (event.event === 'payment.captured') {
      const { order_id } = event.payload.payment.entity;
      const orderNotes = event.payload.payment.entity.notes;

      if (orderNotes && orderNotes.user_id) {
        const user = await User.findById(orderNotes.user_id);
        if (user) {
          const paymentRecord = user.payment_history.find(
            (p) => p.order_id === order_id
          );
          if (paymentRecord) {
            paymentRecord.status = 'captured';
            await user.save({ validateBeforeSave: false });
          }
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Webhook processing failed'
    });
  }
});

router.get('/plans', async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    const monthlyAmount = Number(settings?.pricing?.monthly?.amount || 999);
    const quarterlyAmount = Number(settings?.pricing?.quarterly?.amount || 2499);
    const yearlyAmount = Number(settings?.pricing?.yearly?.amount || 2999);

    return res.status(200).json({
      status: 'success',
      plans: {
        monthly: {
          type: 'monthly',
          amount: monthlyAmount,
          currency: settings?.pricing?.monthly?.currency || 'INR',
          description: settings?.pricing?.monthly?.description || 'Monthly Premium Access',
          features: [
            'Access to all niches',
            'AI Script Generator',
            'Detailed how-to guides',
            'Tools & resources list',
            'Priority support'
          ]
        },
        quarterly: {
          type: 'quarterly',
          amount: quarterlyAmount,
          currency: settings?.pricing?.quarterly?.currency || 'INR',
          description: settings?.pricing?.quarterly?.description || 'Quarterly Premium Access',
          discount_percentage: Number(settings?.pricing?.quarterly?.discount_percentage || 10),
          savings: monthlyAmount * 3 - quarterlyAmount,
          features: [
            'All Monthly features',
            'Better value than monthly',
            'Priority support',
            'Faster content workflow',
            'More consistent growth'
          ]
        },
        yearly: {
          type: 'yearly',
          amount: yearlyAmount,
          currency: settings?.pricing?.yearly?.currency || 'INR',
          description: settings?.pricing?.yearly?.description || 'Yearly Premium Access',
          discount_percentage: Number(settings?.pricing?.yearly?.discount_percentage || 17),
          savings: monthlyAmount * 12 - yearlyAmount,
          features: [
            'All Quarterly features',
            'Biggest discount',
            'Early access to new niches',
            'Exclusive webinars',
            'Community access'
          ]
        }
      }
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch plans'
    });
  }
});

router.get('/history', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('payment_history');

    return res.status(200).json({
      status: 'success',
      payments: user.payment_history.sort((a, b) => b.created_at - a.created_at)
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payment history'
    });
  }
});

module.exports = router;