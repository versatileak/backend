const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const User = require('../models/User');
const { protect } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  handleValidationErrors
} = require('../middleware/validation');
const { sendTokenResponse, clearTokenCookie } = require('../utils/jwt');
const { sendEmail } = require('../utils/emailService');

// ===============================
// REGISTER
// ===============================
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email,
      password
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during registration'
    });
  }
});

// ===============================
// LOGIN
// ===============================
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        status: 'error',
        message: 'Your account has been deactivated'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    user.last_login = Date.now();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
});

// ===============================
// FORGOT PASSWORD
// ===============================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with this email'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'https://ytlcnich.online';
    const resetURL = `${frontendUrl}/reset-password/${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset.</p>
        <p>Click the button below to reset your password:</p>
        <p>
          <a href="${resetURL}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;">
            Reset Password
          </a>
        </p>
        <p>If the button does not work, copy this link and open it in your browser:</p>
        <p>${resetURL}</p>
        <p>This link will expire in 15 minutes.</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html
    });

    res.json({
      status: 'success',
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Email sending failed'
    });
  }
});

// ===============================
// RESET PASSWORD
// ===============================
router.post('/reset-password/:token', async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    res.json({
      status: 'success',
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Password reset failed'
    });
  }
});

// ===============================
// LOGOUT
// ===============================
router.post('/logout', protect, (req, res) => {
  clearTokenCookie(res);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

// ===============================
// GET CURRENT USER
// ===============================
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: 'success',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription_status: user.subscription_status,
        plan_type: user.plan_type,
        expiry_date: user.expiry_date,
        days_remaining: user.getSubscriptionDaysRemaining(),
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// ===============================
// UPDATE PROFILE
// ===============================
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription_status: user.subscription_status
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// ===============================
// CHANGE PASSWORD
// ===============================
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;
