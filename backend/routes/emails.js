const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { User, Contact } = require('../models');
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

    // Get user details
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send email using the email service
    const result = await emailService.sendEmail({
      userId,
      contactId,
      subject,
      message,
      userName: user.email.split('@')[0], // Use email prefix as name
      userEmail: user.email,
      contactEmail: contact.email
    });

    res.json(result);

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
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

module.exports = router;