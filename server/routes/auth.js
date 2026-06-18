const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth');
const { auth } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/verify-email/:token', ctrl.verifyEmail);
router.post('/resend-verification', ctrl.resendVerification);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password/:token', ctrl.resetPassword);
router.get('/me', auth, ctrl.getProfile);
router.put('/me', auth, ctrl.updateProfile);

module.exports = router;
