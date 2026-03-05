const express = require('express');
const router = express.Router();
const Niche = require('../models/Niche');
const { protect, optionalAuth } = require('../middleware/auth');

// @route   GET /api/niches
// @desc    Get all niches (with access control)
// @access  Public/Private
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 12 } = req.query;
    
    let query = { is_active: true };
    
    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Check user access
    const isPremium = req.user && req.user.subscription_status === 'premium' && req.user.hasActiveSubscription();
    const isAdmin = req.user && req.user.role === 'admin';

    // If not premium and not admin, only show free niches
    if (!isPremium && !isAdmin) {
      query.is_free = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const niches = await Niche.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Niche.countDocuments(query);

    // Get total free and paid niches for reference
    const freeCount = await Niche.countDocuments({ is_active: true, is_free: true });
    const paidCount = await Niche.countDocuments({ is_active: true, is_free: false });

    res.status(200).json({
      status: 'success',
      count: niches.length,
      total,
      free_niches_count: freeCount,
      paid_niches_count: paidCount,
      has_premium_access: isPremium || isAdmin,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit))
      },
      niches: niches.map(niche => ({
        id: niche._id,
        niche_name: niche.niche_name,
        channel_name: niche.channel_name,
        description: niche.description,
        slug: niche.slug,
        earning: niche.earning,
        competition: niche.competition,
        is_free: niche.is_free,
        category: niche.category,
        tags: niche.tags,
        thumbnail: niche.thumbnail,
        created_at: niche.created_at,
        // For non-premium users, hide detailed content
        ...(isPremium || isAdmin || niche.is_free ? {
          how_to_work: niche.how_to_work,
          tools_required: niche.tools_required
        } : {
          how_to_work: null,
          tools_required: null,
          locked: true
        })
      }))
    });
  } catch (error) {
    console.error('Get niches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/niches/free
// @desc    Get only free niches
// @access  Public
router.get('/free', async (req, res) => {
  try {
    const niches = await Niche.getFreeNiches();
    
    res.status(200).json({
      status: 'success',
      count: niches.length,
      niches: niches.map(niche => ({
        id: niche._id,
        niche_name: niche.niche_name,
        channel_name: niche.channel_name,
        description: niche.description,
        slug: niche.slug,
        earning: niche.earning,
        competition: niche.competition,
        is_free: niche.is_free,
        category: niche.category,
        tags: niche.tags,
        thumbnail: niche.thumbnail,
        how_to_work: niche.how_to_work,
        tools_required: niche.tools_required,
        created_at: niche.created_at
      }))
    });
  } catch (error) {
    console.error('Get free niches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/niches/:slug
// @desc    Get single niche by slug
// @access  Public/Private
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const niche = await Niche.findOne({ slug: req.params.slug, is_active: true });

    if (!niche) {
      return res.status(404).json({
        status: 'error',
        message: 'Niche not found'
      });
    }

    // Increment view count
    niche.view_count += 1;
    await niche.save({ validateBeforeSave: false });

    // Check access
    const isPremium = req.user && req.user.subscription_status === 'premium' && req.user.hasActiveSubscription();
    const isAdmin = req.user && req.user.role === 'admin';
    const hasAccess = isPremium || isAdmin || niche.is_free;

    res.status(200).json({
      status: 'success',
      has_full_access: hasAccess,
      niche: {
        id: niche._id,
        niche_name: niche.niche_name,
        channel_name: niche.channel_name,
        description: niche.description,
        slug: niche.slug,
        earning: niche.earning,
        competition: niche.competition,
        is_free: niche.is_free,
        category: niche.category,
        tags: niche.tags,
        thumbnail: niche.thumbnail,
        view_count: niche.view_count,
        created_at: niche.created_at,
        ...(hasAccess ? {
          how_to_work: niche.how_to_work,
          tools_required: niche.tools_required
        } : {
          how_to_work: null,
          tools_required: null,
          locked: true,
          upgrade_message: 'Upgrade to Premium to unlock this content'
        })
      }
    });
  } catch (error) {
    console.error('Get niche error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/niches/categories/list
// @desc    Get all categories
// @access  Public
router.get('/categories/list', async (req, res) => {
  try {
    const categories = [
      { value: 'all', label: 'All Categories' },
      { value: 'entertainment', label: 'Entertainment' },
      { value: 'education', label: 'Education' },
      { value: 'gaming', label: 'Gaming' },
      { value: 'tech', label: 'Technology' },
      { value: 'lifestyle', label: 'Lifestyle' },
      { value: 'business', label: 'Business' },
      { value: 'health', label: 'Health & Fitness' },
      { value: 'other', label: 'Other' }
    ];

    res.status(200).json({
      status: 'success',
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/niches/stats/overview
// @desc    Get niche statistics
// @access  Public
router.get('/stats/overview', async (req, res) => {
  try {
    const totalNiches = await Niche.countDocuments({ is_active: true });
    const freeNiches = await Niche.countDocuments({ is_active: true, is_free: true });
    const paidNiches = await Niche.countDocuments({ is_active: true, is_free: false });
    
    const categories = await Niche.aggregate([
      { $match: { is_active: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      status: 'success',
      stats: {
        total_niches: totalNiches,
        free_niches: freeNiches,
        paid_niches: paidNiches,
        categories: categories.map(c => ({ name: c._id, count: c.count }))
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;
