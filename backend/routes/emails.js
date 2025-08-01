const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { User, Contact, UserProfile } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Validation middleware for sending email
const validateSendEmail = [
  body('contactId').notEmpty().isUUID(),
  body('subject').notEmpty().trim().isLength({ max: 255 }),
  body('message').notEmpty().trim()
];

// Send email endpoint
router.post('/send', authMiddleware, validateSendEmail, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactId, subject, message } = req.body;
    const userId = req.user.id;

    // Verify contact belongs to user
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (!contact.email) {
      return res.status(400).json({ error: 'Contact does not have an email address' });
    }

    // Get user details with profile
    const user = await User.findByPk(userId, {
      include: [{ model: UserProfile, as: 'profile' }]
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the user's first name
    const firstName = user.profile?.firstName || user.email.split('@')[0];
    const fullName = user.profile ? `${user.profile.firstName} ${user.profile.lastName}`.trim() : user.email.split('@')[0];

    // Send email using the email service
    const result = await emailService.sendEmail({
      userId,
      contactId,
      subject,
      message,
      userName: fullName,
      userEmail: user.email,
      userFirstName: firstName.toLowerCase(),
      contactEmail: contact.email,
      contactData: contact.get({ plain: true }) // Pass full contact data for variable replacement
    });

    res.json(result);

  } catch (error) {
    console.error('Error sending email:', error);
    console.error('Full error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      response: error.response
    });
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message,
      code: error.code
    });
  }
});

// Get email history for a contact
router.get('/contact/:contactId', authMiddleware, [
  param('contactId').isUUID()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactId } = req.params;
    const userId = req.user.id;

    // Verify contact belongs to user
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get email history
    const emails = await emailService.getEmailHistory(contactId, userId);

    res.json(emails);

  } catch (error) {
    console.error('Error fetching email history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch email history',
      details: error.message 
    });
  }
});

// Test email configuration endpoint
router.get('/test-config', authMiddleware, async (req, res) => {
  try {
    const config = {
      POSTMARK_API_KEY: process.env.POSTMARK_API_KEY ? 'Set (hidden)' : 'NOT SET',
      EMAIL_DOMAIN: process.env.EMAIL_DOMAIN || 'NOT SET',
      FROM_EMAIL: process.env.FROM_EMAIL || 'NOT SET',
      APP_URL: process.env.APP_URL || 'NOT SET',
      emailServiceConfig: {
        emailDomain: emailService.emailDomain,
        fromEmail: emailService.fromEmail,
        appUrl: emailService.appUrl,
        hasPostmarkClient: !!emailService.client
      }
    };
    
    res.json({ 
      success: true, 
      config,
      message: 'Configuration retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get configuration',
      details: error.message 
    });
  }
});

module.exports = router;