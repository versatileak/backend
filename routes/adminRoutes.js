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
    const activeNiches = await Niche.countDocuments({ is_active: true });

    const usersWithPayments = await User.find(
      { 'payment_history.0': { $exists: true } },
      { payment_history: 1, created_at: 1, name: 1, email: 1, subscription_status: 1 }
    ).lean();

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let totalPayments = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    usersWithPayments.forEach((user) => {
      (user.payment_history || []).forEach((payment) => {
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
    });

    const conversionRate =
      totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0.0';

    const recentUsers = await User.find()
      .select('name email subscription_status created_at')
      .sort({ created_at: -1 })
      .limit(5)
      .lean();

    res.json({
      status: 'success',
      stats: {
        users: {
          total: totalUsers,
          premium: premiumUsers,
          free: freeUsers,
          active: activeUsers
        },
        niches: {
          total: totalNiches,
          active: activeNiches,
          free: freeNiches,
          paid: paidNiches
        },
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          currency: 'INR',
          payments_count: totalPayments
        },
        conversions: {
          premium_rate: conversionRate
        }
      },
      recent_users: recentUsers
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
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
    const { search = '', subscription_status = '', page = 1, limit = 10 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (subscription_status) {
      query.subscription_status = subscription_status;
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .select('-password')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      status: 'success',
      users: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription_status: user.subscription_status,
        plan_type: user.plan_type,
        expiry_date: user.expiry_date,
        is_active: user.is_active,
        created_at: user.created_at
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
});

// ===============================
// GET SINGLE USER
// ===============================
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription_status: user.subscription_status,
        plan_type: user.plan_type,
        expiry_date: user.expiry_date,
        is_active: user.is_active,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user'
    });
  }
});

// ===============================
// UPDATE USER
// ===============================
router.put('/users/:id', async (req, res) => {
  try {
    const allowedFields = [
      'subscription_status',
      'plan_type',
      'expiry_date',
      'is_active'
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription_status: user.subscription_status,
        plan_type: user.plan_type,
        expiry_date: user.expiry_date,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
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
    console.error('Delete user error:', error);
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
    const niches = await Niche.find().sort({ created_at: -1 }).lean();

    res.json({
      status: 'success',
      niches
    });
  } catch (error) {
    console.error('Get niches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch niches'
    });
  }
});

// ===============================
// GET SINGLE NICHE
// ===============================
router.get('/niches/:id', async (req, res) => {
  try {
    const niche = await Niche.findById(req.params.id).lean();

    if (!niche) {
      return res.status(404).json({
        status: 'error',
        message: 'Niche not found'
      });
    }

    res.json({
      status: 'success',
      niche
    });
  } catch (error) {
    console.error('Get niche error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch niche'
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
      tutorial_video: req.body.tutorial_video || '',
      created_by: req.user._id
    });

    res.json({
      status: 'success',
      message: 'Niche created',
      niche
    });
  } catch (error) {
    console.error('Create niche error:', error);
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

    if (req.body.tutorial_video !== undefined) {
      updateData.tutorial_video = req.body.tutorial_video;
    }

    const niche = await Niche.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

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
    console.error('Update niche error:', error);
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
    console.error('Delete niche error:', error);
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
    console.error('Get settings error:', error);
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
    console.error('Update settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Settings update failed'
    });
  }
});

module.exports = router;
