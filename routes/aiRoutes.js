const express = require('express');
const router = express.Router();
const { protect, requirePremium } = require('../middleware/auth');
const { aiScriptValidation, handleValidationErrors } = require('../middleware/validation');
const { 
  generateScript, 
  generateTitle, 
  generateDescription, 
  generateTags,
  generateCompletePackage 
} = require('../utils/openai');

// @route   POST /api/ai/generate-script
// @desc    Generate YouTube script
// @access  Premium
router.post('/generate-script', protect, requirePremium, aiScriptValidation, handleValidationErrors, async (req, res) => {
  try {
    const { niche, topic, duration = 'medium' } = req.body;

    const script = await generateScript(niche, topic, duration);

    res.status(200).json({
      status: 'success',
      data: {
        type: 'script',
        niche,
        topic,
        duration,
        content: script,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate script error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate script'
    });
  }
});

// @route   POST /api/ai/generate-title
// @desc    Generate YouTube titles
// @access  Premium
router.post('/generate-title', protect, requirePremium, async (req, res) => {
  try {
    const { niche, topic } = req.body;

    if (!niche) {
      return res.status(400).json({
        status: 'error',
        message: 'Niche is required'
      });
    }

    const titles = await generateTitle(niche, topic);

    res.status(200).json({
      status: 'success',
      data: {
        type: 'titles',
        niche,
        topic,
        content: titles,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate title error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate titles'
    });
  }
});

// @route   POST /api/ai/generate-description
// @desc    Generate YouTube description
// @access  Premium
router.post('/generate-description', protect, requirePremium, async (req, res) => {
  try {
    const { niche, topic, title } = req.body;

    if (!niche || !title) {
      return res.status(400).json({
        status: 'error',
        message: 'Niche and title are required'
      });
    }

    const description = await generateDescription(niche, topic, title);

    res.status(200).json({
      status: 'success',
      data: {
        type: 'description',
        niche,
        topic,
        title,
        content: description,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate description error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate description'
    });
  }
});

// @route   POST /api/ai/generate-tags
// @desc    Generate YouTube tags
// @access  Premium
router.post('/generate-tags', protect, requirePremium, async (req, res) => {
  try {
    const { niche, topic, title } = req.body;

    if (!niche || !title) {
      return res.status(400).json({
        status: 'error',
        message: 'Niche and title are required'
      });
    }

    const tags = await generateTags(niche, topic, title);

    res.status(200).json({
      status: 'success',
      data: {
        type: 'tags',
        niche,
        topic,
        title,
        content: tags,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate tags error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate tags'
    });
  }
});

// @route   POST /api/ai/generate-complete
// @desc    Generate complete package (script, title, description, tags)
// @access  Premium
router.post('/generate-complete', protect, requirePremium, aiScriptValidation, handleValidationErrors, async (req, res) => {
  try {
    const { niche, topic, duration = 'medium' } = req.body;

    const package_data = await generateCompletePackage(niche, topic, duration);

    res.status(200).json({
      status: 'success',
      data: {
        type: 'complete_package',
        ...package_data
      }
    });
  } catch (error) {
    console.error('Generate complete package error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate complete package'
    });
  }
});

// @route   GET /api/ai/status
// @desc    Check AI service status
// @access  Public
router.get('/status', async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();
    
    const isConfigured = !!settings.openai_api_key;

    res.status(200).json({
      status: 'success',
      ai_configured: isConfigured,
      model: settings.openai_model || 'gpt-3.5-turbo'
    });
  } catch (error) {
    console.error('AI status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check AI status'
    });
  }
});

module.exports = router;
