const { body, validationResult } = require('express-validator');

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validation rules
exports.registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

// Niche validation rules
exports.nicheValidation = [
  body('niche_name')
    .trim()
    .notEmpty().withMessage('Niche name is required')
    .isLength({ max: 100 }).withMessage('Niche name cannot exceed 100 characters'),
  body('channel_name')
    .trim()
    .notEmpty().withMessage('Channel name is required')
    .isLength({ max: 100 }).withMessage('Channel name cannot exceed 100 characters'),
  body('how_to_work')
    .trim()
    .notEmpty().withMessage('How to work guide is required'),
  body('earning.min_earning')
    .optional()
    .isNumeric().withMessage('Minimum earning must be a number'),
  body('earning.max_earning')
    .optional()
    .isNumeric().withMessage('Maximum earning must be a number'),
  body('competition.level')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Competition level must be low, medium, or high'),
  body('is_free')
    .optional()
    .isBoolean().withMessage('Is free must be a boolean')
];

// Payment validation rules
exports.paymentValidation = [
  body('plan_type')
    .notEmpty().withMessage('Plan type is required')
    .isIn(['monthly', 'yearly']).withMessage('Plan type must be monthly or yearly')
];

// AI validation rules
exports.aiScriptValidation = [
  body('niche')
    .trim()
    .notEmpty().withMessage('Niche is required')
    .isLength({ max: 200 }).withMessage('Niche cannot exceed 200 characters'),
  body('topic')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Topic cannot exceed 500 characters'),
  body('duration')
    .optional()
    .isIn(['short', 'medium', 'long']).withMessage('Duration must be short, medium, or long')
];

// Settings validation rules
exports.settingsValidation = [
  body('razorpay_key_id')
    .optional()
    .trim()
    .notEmpty().withMessage('Razorpay Key ID cannot be empty'),
  body('razorpay_key_secret')
    .optional()
    .trim()
    .notEmpty().withMessage('Razorpay Key Secret cannot be empty'),
  body('openai_api_key')
    .optional()
    .trim()
    .notEmpty().withMessage('OpenAI API Key cannot be empty')
];

// Admin user update validation
exports.adminUserUpdateValidation = [
  body('subscription_status')
    .optional()
    .isIn(['free', 'premium']).withMessage('Subscription status must be free or premium'),
  body('plan_type')
    .optional()
    .isIn(['none', 'monthly', 'yearly']).withMessage('Plan type must be none, monthly, or yearly'),
  body('expiry_date')
    .optional()
    .isISO8601().withMessage('Expiry date must be a valid date')
];
