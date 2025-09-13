const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Contact, Deal, UserProfile, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'isAdmin']
    });
    
    if (!user || user.isAdmin !== true) {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    
    req.adminUser = user;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Get all users in organization (admin only)
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const adminUser = await User.findByPk(req.userId, {
      attributes: ['organizationId']
    });

    const users = await User.findAll({
      where: { 
        organizationId: adminUser.organizationId 
      },
      attributes: {
        exclude: ['password', 'resetToken', 'resetTokenExpiry']
      },
      include: [{
        model: Contact,
        as: 'assignedContacts',
        attributes: ['id'],
        required: false
      }],
      order: [['createdAt', 'DESC']]
    });

    // Get profiles for all users
    const userIds = users.map(u => u.id);
    const profiles = await UserProfile.findAll({
      where: { userId: userIds },
      attributes: ['userId', 'firstName', 'lastName', 'phone', 'nmlsId', 'stateLicenses']
    });
    
    const profileMap = profiles.reduce((acc, profile) => {
      acc[profile.userId] = profile;
      return acc;
    }, {});

    // Get stats for each user
    const userStats = await Promise.all(users.map(async (user) => {
      const contactCount = await Contact.count({
        where: { assignedTo: user.id }
      });
      
      const dealStats = await Deal.findOne({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('value')), 'totalValue']
        ],
        where: { userId: user.id },
        raw: true
      });

      return {
        ...user.toJSON(),
        profile: profileMap[user.id] ? {
          firstName: profileMap[user.id].firstName,
          lastName: profileMap[user.id].lastName,
          phone: profileMap[user.id].phone,
          nmlsId: profileMap[user.id].nmlsId,
          stateLicenses: profileMap[user.id].stateLicenses
        } : null,
        stats: {
          contactCount,
          dealCount: parseInt(dealStats?.count || 0),
          totalDealValue: parseFloat(dealStats?.totalValue || 0)
        }
      };
    }));

    res.json(userStats);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user (admin only)
router.post('/', 
  authMiddleware, 
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('isLoanOfficer').optional().isBoolean(),
    body('licensedStates').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, firstName, lastName, isLoanOfficer, licensedStates } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Get admin's organization
      const adminUser = await User.findByPk(req.userId, {
        attributes: ['organizationId']
      });

      // Generate invitation token
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create temporary password (user will be required to change it)
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create user
      const newUser = await User.create({
        email,
        password: hashedPassword,
        organizationId: adminUser.organizationId,
        isAdmin: false,
        isLoanOfficer: isLoanOfficer || false,
        licensedStates: licensedStates || [],
        resetToken: inviteToken,
        resetTokenExpiry: inviteExpiry,
        requirePasswordChange: true
      });

      // Send invitation email
      try {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const setupLink = `${appUrl}/setup-password?token=${inviteToken}&email=${encodeURIComponent(email)}`;

        await emailService.sendEmail({
          userId: req.userId,
          contactEmail: email,
          subject: 'Welcome to CRM - Account Setup',
          message: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Welcome to the CRM System!</h2>
              <p>Hi ${firstName},</p>
              <p>An account has been created for you. Please click the link below to set up your password:</p>
              <div style="margin: 30px 0;">
                <a href="${setupLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Set Up Your Password
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p style="color: #666; font-size: 14px; word-break: break-all;">${setupLink}</p>
              <p style="margin-top: 30px;">This link will expire in 7 days.</p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              <p style="color: #666; font-size: 14px;">
                Your temporary login credentials:<br>
                Email: ${email}<br>
                Temporary Password: ${tempPassword}
              </p>
              <p style="color: #666; font-size: 14px;">
                You can either use the link above or log in directly with these credentials. 
                You will be required to change your password on first login.
              </p>
            </div>
          `,
          userName: 'CRM System',
          userEmail: 'noreply@crm.com',
          userFirstName: 'CRM',
          contactData: {
            firstName: firstName,
            lastName: lastName,
            email: email
          },
          enableTracking: false
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the user creation if email fails
      }

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          organizationId: newUser.organizationId,
          isLoanOfficer: newUser.isLoanOfficer,
          createdAt: newUser.createdAt
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// Update user (admin only)
router.put('/:id',
  authMiddleware,
  requireAdmin,
  [
    body('email').optional().isEmail(),
    body('isAdmin').optional().isBoolean().withMessage('isAdmin must be a boolean'),
    body('isLoanOfficer').optional().isBoolean().withMessage('isLoanOfficer must be a boolean'),
    body('licensedStates').optional().isArray(),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('profile.firstName').optional({ nullable: true, checkFalsy: true }),
    body('profile.lastName').optional({ nullable: true, checkFalsy: true }),
    body('profile.phone').optional({ nullable: true, checkFalsy: true }),
    body('profile.nmlsId').optional({ nullable: true, checkFalsy: true }).matches(/^\d*$/).withMessage('NMLS ID must contain only numbers'),
    body('profile.stateLicenses').optional({ nullable: true, checkFalsy: true }).isArray(),
    body('profile.stateLicenses.*.state').optional({ nullable: true, checkFalsy: true }).isIn(['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC']),
    body('profile.stateLicenses.*.licenseNumber').optional({ nullable: true, checkFalsy: true })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { profile, ...userUpdates } = req.body;
      
      console.log('Update user request:', {
        userId: id,
        profile,
        userUpdates,
        fullBody: req.body,
        isAdmin: userUpdates.isAdmin,
        isLoanOfficer: userUpdates.isLoanOfficer
      });

      // Get admin's organization
      const adminUser = await User.findByPk(req.userId, {
        attributes: ['organizationId']
      });

      // Find user and verify they're in the same organization
      const user = await User.findOne({
        where: {
          id,
          organizationId: adminUser.organizationId
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent admin from removing their own admin status
      if (id === req.userId && userUpdates.isAdmin === false) {
        return res.status(400).json({ error: 'Cannot remove your own admin privileges' });
      }

      // Update user - including email if provided
      if (userUpdates.email) {
        // Check if email is already taken by another user
        const existingUser = await User.findOne({
          where: { 
            email: userUpdates.email,
            id: { [Op.ne]: id }
          }
        });
        if (existingUser) {
          return res.status(400).json({ error: 'Email already in use' });
        }
      }
      
      console.log('Before update - user roles:', {
        isAdmin: user.isAdmin,
        isLoanOfficer: user.isLoanOfficer
      });
      
      await user.update(userUpdates);
      
      console.log('After update - user roles:', {
        isAdmin: user.isAdmin,
        isLoanOfficer: user.isLoanOfficer
      });

      // Update profile if any profile fields are provided
      if (profile && (
        profile.firstName !== undefined || 
        profile.lastName !== undefined || 
        profile.phone !== undefined ||
        profile.nmlsId !== undefined || 
        profile.stateLicenses !== undefined
      )) {
        const [userProfile] = await UserProfile.findOrCreate({
          where: { userId: user.id },
          defaults: { 
            userId: user.id,
            firstName: profile.firstName || 'Unknown',
            lastName: profile.lastName || 'User'
          }
        });
        
        const profileUpdates = {};
        if (profile.firstName !== undefined) {
          profileUpdates.firstName = profile.firstName;
        }
        if (profile.lastName !== undefined) {
          profileUpdates.lastName = profile.lastName;
        }
        if (profile.phone !== undefined) {
          profileUpdates.phone = profile.phone;
        }
        if (profile.nmlsId !== undefined) {
          profileUpdates.nmlsId = profile.nmlsId;
        }
        if (profile.stateLicenses !== undefined) {
          profileUpdates.stateLicenses = profile.stateLicenses;
        }
        
        console.log('Updating profile with:', profileUpdates);
        await userProfile.update(profileUpdates);
        console.log('Profile updated:', userProfile.toJSON());
      }

      res.json({
        message: 'User updated successfully',
        user: {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          isLoanOfficer: user.isLoanOfficer,
          licensedStates: user.licensedStates,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// Delete/Deactivate user (admin only)
router.delete('/:id',
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reassignTo } = req.body; // Optional: reassign contacts to another user

      // Prevent admin from deleting themselves
      if (id === req.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Get admin's organization
      const adminUser = await User.findByPk(req.userId, {
        attributes: ['organizationId']
      });

      // Find user and verify they're in the same organization
      const user = await User.findOne({
        where: {
          id,
          organizationId: adminUser.organizationId
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check for assigned contacts
      const assignedContacts = await Contact.count({
        where: { assignedTo: id }
      });

      if (assignedContacts > 0 && !reassignTo) {
        return res.status(400).json({ 
          error: `User has ${assignedContacts} assigned contacts. Please reassign them first or provide a reassignTo user ID.`,
          assignedContacts
        });
      }

      // Reassign contacts if requested
      if (reassignTo) {
        await Contact.update(
          { assignedTo: reassignTo },
          { where: { assignedTo: id } }
        );
      }

      // Soft delete - just mark as inactive
      await user.update({ isActive: false });

      res.json({ 
        message: 'User deactivated successfully',
        reassignedContacts: reassignTo ? assignedContacts : 0
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
);

// Reset user password (admin only)
router.post('/:id/reset-password',
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get admin's organization
      const adminUser = await User.findByPk(req.userId, {
        attributes: ['organizationId']
      });

      // Find user and verify they're in the same organization
      const user = await User.findOne({
        where: {
          id,
          organizationId: adminUser.organizationId
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate new temporary password
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Update user with new password and require change flag
      await user.update({
        password: hashedPassword,
        requirePasswordChange: true
      });

      // Send password reset email
      try {
        await emailService.sendEmail({
          userId: req.userId,
          contactEmail: user.email,
          subject: 'Your Password Has Been Reset',
          message: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Password Reset</h2>
              <p>Your password has been reset by an administrator.</p>
              <p style="margin: 20px 0;">Your new temporary password is:</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <code style="font-size: 18px; font-weight: bold;">${tempPassword}</code>
              </div>
              <p>You will be required to change this password when you next log in.</p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              <p style="color: #666; font-size: 14px;">
                If you did not expect this password reset, please contact your administrator immediately.
              </p>
            </div>
          `,
          userName: 'CRM System',
          userEmail: 'noreply@crm.com',
          userFirstName: 'CRM',
          enableTracking: false
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Return error to user so they know email didn't send
        return res.status(500).json({ 
          error: 'Password reset but email could not be sent. Please contact support.',
          tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined
        });
      }

      res.json({ 
        message: 'Password reset successfully',
        tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined // Only for development
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

module.exports = router;