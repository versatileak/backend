const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Niche = require('../models/Niche');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');

// Protect all admin routes
router.use(protect, adminOnly);

// ===============================
// DASHBOARD
// ===============================

router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ subscription_status: 'premium' });
    const freeUsers = await User.countDocuments({ subscription_status: 'free' });
    const activeUsers = await User.countDocuments({ is_active: true });

    const totalNiches = await Niche.countDocuments();
    const freeNiches = await Niche.countDocuments({ is_free: true });
    const paidNiches = await Niche.countDocuments({ is_free: false });

    const users = await User.find().select('payment_history created_at subscription_status name email is_active');

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let totalPayments = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    users.forEach((user) => {
      if (Array.isArray(user.payment_history)) {
        user.payment_history.forEach((payment) => {
          if (payment.status === 'completed' || payment.status === 'captured') {
            const amount = Number(payment.amount || 0);
            totalRevenue += amount;
            totalPayments += 1;

            const paymentDate = payment.created_at ? new Date(payment.created_at) : null;
            if (
              paymentDate &&
              paymentDate.getMonth() === currentMonth &&
              paymentDate.getFullYear() === currentYear
            ) {
              monthlyRevenue += amount;
            }
          }
        });
      }
    });

    const premiumConversionRate =
      totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(2) : '0.00';

    const recentUsers = await User.find()
      .sort({ created_at: -1 })
      .limit(5)
      .select('name email subscription_status created_at is_active');

    res.json({
      status: 'success',
      stats: {
        users: {
          total: totalUsers,
          premium: premiumUsers,
          free: freeUsers,
          active: activeUsers,
          premium_conversion_rate: Number(premiumConversionRate)
        },
        niches: {
          total: totalNiches,
          free: freeNiches,
          paid: paidNiches
        },
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          total_payments: totalPayments,
          currency: 'INR'
        }
      },
      recent_users: recentUsers
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 'error',
      message: 'Dashboard error'
    });
  }
});

// ===============================
// GET ALL USERS
// ===============================

router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ created_at: -1 });

    res.json({
      status: 'success',
      users
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
});

// ===============================
// UPDATE USER
// ===============================

router.put('/users/:id', async (req, res) => {
  try {
    const updateData = {
      subscription_status: req.body.subscription_status,
      plan_type: req.body.plan_type,
      expiry_date: req.body.expiry_date || null,
      is_active: req.body.is_active
    };

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'User updated',
      user
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user'
    });
  }
});

// ===============================
// DELETE USER
// ===============================

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'User deleted'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Delete failed'
    });
  }
});

// ===============================
// GET NICHES
// ===============================

router.get('/niches', async (req, res) => {
  try {
    const niches = await Niche.find().sort({ created_at: -1 });

    res.json({
      status: 'success',
      niches
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch niches'
    });
  }
});

// ===============================
// CREATE NICHE
// ===============================

router.post('/niches', async (req, res) => {
  try {
    const niche = await Niche.create({
      ...req.body,
      image: req.body.image || req.body.thumbnail || '',
      thumbnail: req.body.image || req.body.thumbnail || '',
      created_by: req.user._id
    });

    res.json({
      status: 'success',
      message: 'Niche created',
      niche
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create niche'
    });
  }
});

// ===============================
// UPDATE NICHE
// ===============================

router.put('/niches/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body
    };

    if (req.body.image || req.body.thumbnail) {
      updateData.image = req.body.image || req.body.thumbnail;
      updateData.thumbnail = req.body.image || req.body.thumbnail;
    }

    const niche = await Niche.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!niche) {
      return res.status(404).json({
        status: 'error',
        message: 'Niche not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Niche updated',
      niche
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Update failed'
    });
  }
});

// ===============================
// DELETE NICHE
// ===============================

router.delete('/niches/:id', async (req, res) => {
  try {
    await Niche.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Niche deleted'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Delete failed'
    });
  }
});

// ===============================
// SETTINGS
// ===============================

router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.json({
      status: 'success',
      settings
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Settings error'
    });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    Object.keys(req.body).forEach((key) => {
      settings[key] = req.body[key];
    });

    await settings.save();

    res.json({
      status: 'success',
      message: 'Settings updated',
      settings
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Settings update failed'
    });
  }
});

module.exports = router;