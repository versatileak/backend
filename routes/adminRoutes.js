const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Niche = require('../models/Niche');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');
const { 
  nicheValidation, 
  settingsValidation,
  adminUserUpdateValidation,
  handleValidationErrors 
} = require('../middleware/validation');

// All routes are protected and admin-only
router.use(protect, adminOnly);

// ==========================================
// DASHBOARD STATS
// ==========================================

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Admin
router.get('/dashboard', async (req, res) => {
  try {
    // User stats
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ subscription_status: 'premium' });
    const freeUsers = await User.countDocuments({ subscription_status: 'free' });
    const newUsersToday = await User.countDocuments({
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Niche stats
    const totalNiches = await Niche.countDocuments();
    const activeNiches = await Niche.countDocuments({ is_active: true });
    const freeNiches = await Niche.countDocuments({ is_free: true });
    const paidNiches = await Niche.countDocuments({ is_free: false });

    // Revenue stats (from payment history)
    const usersWithPayments = await User.find({ 'payment_history.status': 'completed' });
    const totalRevenue = usersWithPayments.reduce((sum, user) => {
      return sum + user.payment_history
        .filter(p => p.status === 'completed')
        .reduce((pSum, p) => pSum + p.amount, 0);
    }, 0);

    // Recent users
    const recentUsers = await User.find()
      .sort({ created_at: -1 })
      .limit(5)
      .select('name email subscription_status created_at');

    res.status(200).json({
      status: 'success',
      stats: {
        users: {
          total: totalUsers,
          premium: premiumUsers,
          free: freeUsers,
          new_today: newUsersToday
        },
        niches: {
          total: totalNiches,
          active: activeNiches,
          free: freeNiches,
          paid: paidNiches
        },
        revenue: {
          total: totalRevenue,
          currency: 'INR'
        }
      },
      recent_users: recentUsers
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard stats'
    });
  }
});

// ==========================================
// USER MANAGEMENT
// ==========================================

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, subscription_status } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (subscription_status) {
      query.subscription_status = subscription_status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password');

    const total = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      count: users.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit))
      },
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get single user
// @access  Admin
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user'
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user subscription
// @access  Admin
router.put('/users/:id', adminUserUpdateValidation, handleValidationErrors, async (req, res) => {
  try {
    const { subscription_status, plan_type, expiry_date, is_active } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        subscription_status,
        plan_type,
        expiry_date,
        is_active
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user'
    });
  }
});

// ==========================================
// NICHE MANAGEMENT
// ==========================================

// @route   GET /api/admin/niches
// @desc    Get all niches (including inactive)
// @access  Admin
router.get('/niches', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    let query = {};
    
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const niches = await Niche.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Niche.countDocuments(query);

    res.status(200).json({
      status: 'success',
      count: niches.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit))
      },
      niches
    });
  } catch (error) {
    console.error('Get admin niches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch niches'
    });
  }
});

// @route   POST /api/admin/niches
// @desc    Create new niche
// @access  Admin
router.post('/niches', nicheValidation, handleValidationErrors, async (req, res) => {
  try {
    const nicheData = {
      ...req.body,
      created_by: req.user._id
    };

    const niche = await Niche.create(nicheData);

    res.status(201).json({
      status: 'success',
      message: 'Niche created successfully',
      niche
    });
  } catch (error) {
    console.error('Create niche error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create niche'
    });
  }
});

// @route   GET /api/admin/niches/:id
// @desc    Get single niche
// @access  Admin
router.get('/niches/:id', async (req, res) => {
  try {
    const niche = await Niche.findById(req.params.id);
    
    if (!niche) {
      return res.status(404).json({
        status: 'error',
        message: 'Niche not found'
      });
    }

    res.status(200).json({
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

// @route   PUT /api/admin/niches/:id
// @desc    Update niche
// @access  Admin
router.put('/niches/:id', async (req, res) => {
  try {
    const niche = await Niche.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!niche) {
      return res.status(404).json({
        status: 'error',
        message: 'Niche not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Niche updated successfully',
      niche
    });
  } catch (error) {
    console.error('Update niche error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update niche'
    });
  }
});

// @route   DELETE /api/admin/niches/:id
// @desc    Delete niche
// @access  Admin
router.delete('/niches/:id', async (req, res) => {
  try {
    const niche = await Niche.findByIdAndDelete(req.params.id);

    if (!niche) {
      return res.status(404).json({
        status: 'error',
        message: 'Niche not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Niche deleted successfully'
    });
  } catch (error) {
    console.error('Delete niche error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete niche'
    });
  }
});

// ==========================================
// SETTINGS MANAGEMENT
// ==========================================

// @route   GET /api/admin/settings
// @desc    Get all settings
// @access  Admin
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      status: 'success',
      settings: {
        razorpay_key_id: settings.razorpay_key_id,
        razorpay_webhook_secret: settings.razorpay_webhook_secret ? '********' : '',
        openai_api_key: settings.openai_api_key ? '********' : '',
        openai_model: settings.openai_model,
        pricing: settings.pricing,
        app_name: settings.app_name,
        app_description: settings.app_description,
        support_email: settings.support_email,
        features: settings.features,
        maintenance_mode: settings.maintenance_mode,
        maintenance_message: settings.maintenance_message
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch settings'
    });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update settings
// @access  Admin
router.put('/settings', settingsValidation, handleValidationErrors, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Update fields
    const updateFields = [
      'razorpay_key_id',
      'razorpay_key_secret',
      'razorpay_webhook_secret',
      'openai_api_key',
      'openai_model',
      'pricing',
      'app_name',
      'app_description',
      'support_email',
      'features',
      'maintenance_mode',
      'maintenance_message'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    settings.updated_by = req.user._id;
    await settings.save();

    res.status(200).json({
      status: 'success',
      message: 'Settings updated successfully',
      settings: {
        razorpay_key_id: settings.razorpay_key_id,
        openai_model: settings.openai_model,
        pricing: settings.pricing,
        app_name: settings.app_name,
        support_email: settings.support_email
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update settings'
    });
  }
});

module.exports = router;
