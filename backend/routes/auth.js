const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { User, UserProfile } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim()
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, companyName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user and profile in transaction
    const result = await User.sequelize.transaction(async (t) => {
      const user = await User.create({ email, password }, { transaction: t });
      
      const profile = await UserProfile.create({
        userId: user.id,
        firstName,
        lastName,
        companyName: companyName || null
      }, { transaction: t });

      return { user, profile };
    });

    const token = generateToken(result.user.id);

    res.status(201).json({
      message: 'Registration successful',
      user: result.user,
      profile: result.profile,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Login validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    const user = await User.findOne({ 
      where: { email },
      include: [{ model: UserProfile, as: 'profile' }]
    });

    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('No user found with email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Stored password hash:', user.password ? `${user.password.substring(0, 20)}...` : 'NO PASSWORD');
    console.log('Input password:', password);
    
    const passwordValid = await user.comparePassword(password);
    console.log('Password valid:', passwordValid);

    if (!passwordValid) {
      console.log('Invalid password for user:', email);
      // Let's also test with a known working password
      const testHash = await require('bcryptjs').hash('password123', 10);
      const testCompare = await require('bcryptjs').compare('password123', testHash);
      console.log('Test hash/compare works:', testCompare);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: UserProfile, as: 'profile' }]
    });

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout (client-side token removal, but we can track it server-side if needed)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Request password reset
router.post('/forgot-password', 
  body('email').isEmail().normalizeEmail(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: 'If the email exists, a reset link will be sent' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await user.update({ resetToken, resetTokenExpiry });

      // Send password reset email
      try {
        const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        await emailService.sendEmail({
          userId: user.id,
          contactEmail: user.email,
          subject: 'Password Reset Request',
          message: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p>You requested a password reset for your account.</p>
              <p>Click the link below to reset your password:</p>
              <div style="margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                ${resetUrl}
              </p>
            </div>
          `,
          userName: 'CRM System',
          userEmail: 'noreply@crmkiller.com',
          userFirstName: 'CRM',
          enableTracking: false
        });

        res.json({ 
          message: 'Password reset email sent',
          // In development, include token for testing
          ...(process.env.NODE_ENV === 'development' && { resetToken })
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Still return success to not reveal if email exists
        res.json({ 
          message: 'If the email exists, a reset link will be sent',
          ...(process.env.NODE_ENV === 'development' && { 
            resetToken,
            emailError: emailError.message 
          })
        });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Failed to process password reset' });
    }
  }
);

// Reset password
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password } = req.body;

      const user = await User.findOne({
        where: {
          resetToken: token,
          resetTokenExpiry: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      await user.update({
        password,
        resetToken: null,
        resetTokenExpiry: null
      });

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

module.exports = router;