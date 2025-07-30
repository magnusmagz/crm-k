const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, UserProfile } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateProfileUpdate = [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('companyName').optional().trim(),
  body('phone').optional().matches(/^[\d\s\-\+\(\)]+$/),
  body('website').optional().isURL(),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional().matches(/^\d{5}(-\d{4})?$/),
  body('primaryColor').optional().matches(/^#[0-9A-Fa-f]{6}$/i).withMessage('Invalid hex color format'),
  body('crmName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('CRM name must be between 1 and 50 characters')
];

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, validateProfileUpdate, async (req, res) => {
  try {
    console.log('Profile update request received:', {
      userId: req.user?.id,
      body: req.body,
      headers: req.headers
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const profile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      console.log('Profile not found for user:', req.user.id);
      return res.status(404).json({ error: 'Profile not found' });
    }

    const allowedFields = ['firstName', 'lastName', 'companyName', 'phone', 'website', 'address', 'profilePhoto', 'companyLogo', 'primaryColor', 'crmName'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    console.log('Updates to be applied:', updates);

    await profile.update(updates);

    console.log('Profile updated successfully:', profile.toJSON());

    res.json({ 
      message: 'Profile updated successfully',
      profile 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Change password
router.put('/change-password', 
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findByPk(req.user.id);
      
      if (!(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      await user.update({ password: newPassword });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// Delete account
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    // Delete user and all associated data
    await User.destroy({
      where: { id: req.user.id }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;