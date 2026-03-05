const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/user/subscription
// @desc    Get user subscription details
// @access  Private
router.get('/subscription', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: 'success',
      subscription: {
        status: user.subscription_status,
        plan_type: user.plan_type,
        expiry_date: user.expiry_date,
        is_active: user.hasActiveSubscription(),
        days_remaining: user.getSubscriptionDaysRemaining()
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch subscription details'
    });
  }
});

// @route   GET /api/user/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const Niche = require('../models/Niche');

    // Get accessible niches count
    const accessibleNiches = user.subscription_status === 'premium' && user.hasActiveSubscription()
      ? await Niche.countDocuments({ is_active: true })
      : await Niche.countDocuments({ is_active: true, is_free: true });

    const totalNiches = await Niche.countDocuments({ is_active: true });

    res.status(200).json({
      status: 'success',
      dashboard: {
        user: {
          name: user.name,
          email: user.email,
          subscription_status: user.subscription_status,
          plan_type: user.plan_type,
          days_remaining: user.getSubscriptionDaysRemaining()
        },
        niches: {
          accessible: accessibleNiches,
          total: totalNiches,
          locked: totalNiches - accessibleNiches
        },
        ai_credits: user.subscription_status === 'premium' ? 'Unlimited' : 0
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard data'
    });
  }
});

module.exports = router;
