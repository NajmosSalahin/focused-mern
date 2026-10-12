const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const ctrl = require('../controllers/auth');
const { auth } = require('../middleware/auth');

const handler = (req, res) => {
  res.status(429).json({ message: 'Too many requests, please try again later.' });
};

// Credential-stuffing / brute-force protection on login and registration.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler
});

// These mint and email a token on every hit, so they get a much tighter budget.
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler
});

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.get('/verify-email/:token', authLimiter, ctrl.verifyEmail);
router.post('/resend-verification', emailLimiter, ctrl.resendVerification);
router.post('/forgot-password', emailLimiter, ctrl.forgotPassword);
router.post('/reset-password/:token', authLimiter, ctrl.resetPassword);
router.get('/me', auth, ctrl.getProfile);
router.put('/me', auth, ctrl.updateProfile);

module.exports = router;
