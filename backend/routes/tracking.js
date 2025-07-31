const express = require('express');
const { EmailSend, EmailEvent, EmailLink, EmailSuppression, Contact } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// 1x1 transparent GIF
const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// Pixel tracking endpoint
router.get('/track/pixel/:trackingId.gif', async (req, res) => {
  const { trackingId } = req.params;
  
  try {
    // Find the email send record
    const emailSend = await EmailSend.findOne({ where: { trackingId } });
    
    if (emailSend) {
      // Update open stats
      await emailSend.update({
        openedAt: emailSend.openedAt || new Date(),
        lastOpenedAt: new Date(),
        openCount: (emailSend.openCount || 0) + 1
      });

      // Log the open event
      await EmailEvent.create({
        emailSendId: emailSend.id,
        eventType: 'open',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        eventData: {
          timestamp: new Date(),
          referer: req.get('referer'),
          acceptLanguage: req.get('accept-language')
        }
      });
    }
  } catch (error) {
    console.error('Tracking pixel error:', error);
  }

  // Always return the pixel, even if tracking fails
  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': PIXEL_GIF.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Expires': '0',
    'Pragma': 'no-cache'
  });
  res.send(PIXEL_GIF);
});

// Click tracking endpoint
router.get('/track/click/:trackingId/:linkId', async (req, res) => {
  const { trackingId, linkId } = req.params;
  
  try {
    // Get the link record
    const link = await EmailLink.findOne({ 
      where: { linkId },
      include: [{
        model: EmailSend,
        as: 'emailSend',
        where: { trackingId }
      }]
    });

    if (!link) {
      // If link not found, redirect to app home
      return res.redirect(process.env.CLIENT_URL || '/');
    }

    // Update link click stats
    await link.update({
      clickCount: (link.clickCount || 0) + 1,
      firstClickedAt: link.firstClickedAt || new Date(),
      lastClickedAt: new Date()
    });

    // Update email send click stats
    if (link.emailSend) {
      await link.emailSend.update({
        clickedAt: link.emailSend.clickedAt || new Date(),
        clickCount: (link.emailSend.clickCount || 0) + 1
      });

      // Log the click event
      await EmailEvent.create({
        emailSendId: link.emailSend.id,
        eventType: 'click',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        eventData: {
          linkId: link.linkId,
          originalUrl: link.originalUrl,
          timestamp: new Date(),
          referer: req.get('referer')
        }
      });
    }

    // Redirect to the original URL
    res.redirect(link.originalUrl);
  } catch (error) {
    console.error('Click tracking error:', error);
    // On error, try to redirect to home
    res.redirect(process.env.CLIENT_URL || '/');
  }
});

// Unsubscribe endpoint
router.get('/track/unsubscribe/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  
  try {
    const emailSend = await EmailSend.findOne({ 
      where: { trackingId },
      include: [{
        model: Contact,
        as: 'contact'
      }]
    });

    if (emailSend && emailSend.contact) {
      // Update email send record
      await emailSend.update({
        unsubscribedAt: new Date()
      });

      // Add to suppression list
      await EmailSuppression.findOrCreate({
        where: { email: emailSend.contact.email },
        defaults: {
          email: emailSend.contact.email,
          userId: emailSend.userId,
          reason: 'unsubscribe'
        }
      });

      // Log the unsubscribe event
      await EmailEvent.create({
        emailSendId: emailSend.id,
        eventType: 'unsubscribe',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        eventData: {
          timestamp: new Date()
        }
      });

      // Redirect to unsubscribe confirmation page
      res.redirect(`${process.env.CLIENT_URL}/unsubscribe-success`);
    } else {
      res.status(404).send('Invalid unsubscribe link');
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send('Error processing unsubscribe request');
  }
});

module.exports = router;