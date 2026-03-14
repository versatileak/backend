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
const sendEmail = require('../utils/emailService');

// ===============================
// REGISTER
// ===============================
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
try {

```
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
```

} catch (error) {

```
console.error('Register error:', error);

res.status(500).json({
  status: 'error',
  message: 'Server error during registration'
});
```

}
});

// ===============================
// LOGIN
// ===============================
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {

try {

```
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
```

} catch (error) {

```
console.error('Login error:', error);

res.status(500).json({
  status: 'error',
  message: 'Server error during login'
});
```

}

});

// ===============================
// FORGOT PASSWORD
// ===============================
router.post('/forgot-password', async (req, res) => {

try {

```
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

const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

const message = `
  You requested a password reset.

  Click this link to reset your password:

  ${resetURL}

  This link will expire in 15 minutes.
`;

await sendEmail({
  to: user.email,
  subject: "Password Reset Request",
  text: message
});

res.json({
  status: 'success',
  message: 'Password reset email sent'
});
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  status: 'error',
  message: 'Email sending failed'
});
```

}

});

// ===============================
// RESET PASSWORD
// ===============================
router.post('/reset-password/:token', async (req, res) => {

try {

```
const hashedToken = crypto
  .createHash('sha256')
  .update(req.params.token)
  .digest('hex');

const user = await User.findOne({
  resetPasswordToken: hashedToken,
  resetPasswordExpire: { $gt: Date.now() }
});

if (!user) {
  return res.status(400).json({
    status: 'error',
    message: 'Invalid or expired token'
  });
}

user.password = req.body.password;

user.resetPasswordToken = undefined;
user.resetPasswordExpire = undefined;

await user.save();

res.json({
  status: 'success',
  message: 'Password reset successful'
});
```

} catch (error) {

```
console.error(error);

res.status(500).json({
  status: 'error',
  message: 'Password reset failed'
});
```

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

```
const user = await User.findById(req.user.id);

res.json({
  status: 'success',
  user
});
```

} catch (error) {

```
res.status(500).json({
  status: 'error',
  message: 'Server error'
});
```

}

});

module.exports = router;
