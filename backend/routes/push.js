/**
 * Push Notification API Routes
 *
 * Endpoints:
 * - GET  /api/push/vapid-public-key - Get VAPID public key for frontend
 * - POST /api/push/subscribe         - Save a push subscription
 * - POST /api/push/unsubscribe       - Remove a push subscription
 * - POST /api/push/test              - Send a test notification
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { PushSubscription } = require('../models');
const pushService = require('../services/pushNotificationService');

const router = express.Router();

/**
 * GET /api/push/vapid-public-key
 * Returns the VAPID public key needed for service worker subscription
 * Public endpoint - no authentication required
 */
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = pushService.getVapidPublicKey();

    if (!publicKey) {
      return res.status(503).json({
        success: false,
        message: 'Push notifications are not configured on the server'
      });
    }

    res.json({
      success: true,
      publicKey
    });

  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve VAPID public key'
    });
  }
});

/**
 * POST /api/push/subscribe
 * Save a push notification subscription for the authenticated user
 * Body: { subscription: { endpoint, keys: { p256dh, auth } }, deviceType, userAgent }
 */
router.post('/subscribe',
  authMiddleware,
  [
    body('subscription').isObject().withMessage('Subscription object is required'),
    body('subscription.endpoint').isURL().withMessage('Valid endpoint URL is required'),
    body('subscription.keys.p256dh').notEmpty().withMessage('p256dh key is required'),
    body('subscription.keys.auth').notEmpty().withMessage('auth key is required'),
    body('deviceType').optional().isString().isLength({ max: 20 }),
    body('userAgent').optional().isString()
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { subscription, deviceType, userAgent } = req.body;
      const userId = req.user.id;

      // Check if subscription already exists (by endpoint)
      let pushSub = await PushSubscription.findOne({
        where: { endpoint: subscription.endpoint }
      });

      if (pushSub) {
        // Update existing subscription
        await pushSub.update({
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          deviceType: deviceType || pushSub.deviceType,
          userAgent: userAgent || pushSub.userAgent
        });

        console.log(`✓ Updated push subscription for user ${userId}`);
      } else {
        // Create new subscription
        pushSub = await PushSubscription.create({
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          deviceType,
          userAgent
        });

        console.log(`✓ Created new push subscription for user ${userId}`);
      }

      res.json({
        success: true,
        message: 'Push subscription saved successfully',
        subscription: {
          id: pushSub.id,
          deviceType: pushSub.deviceType
        }
      });

    } catch (error) {
      console.error('Error saving push subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save push subscription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/push/unsubscribe
 * Remove a push notification subscription
 * Body: { endpoint } or will remove all subscriptions if no endpoint
 */
router.post('/unsubscribe',
  authMiddleware,
  [
    body('endpoint').optional().isURL().withMessage('Valid endpoint URL is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { endpoint } = req.body;
      const userId = req.user.id;

      let deletedCount;

      if (endpoint) {
        // Remove specific subscription
        deletedCount = await PushSubscription.destroy({
          where: {
            userId,
            endpoint
          }
        });
      } else {
        // Remove all subscriptions for this user
        deletedCount = await PushSubscription.destroy({
          where: { userId }
        });
      }

      console.log(`✓ Removed ${deletedCount} push subscription(s) for user ${userId}`);

      res.json({
        success: true,
        message: endpoint
          ? 'Push subscription removed successfully'
          : 'All push subscriptions removed successfully',
        deletedCount
      });

    } catch (error) {
      console.error('Error removing push subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove push subscription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/push/test
 * Send a test push notification to the authenticated user
 * Body: { title, body, url } (all optional)
 */
router.post('/test',
  authMiddleware,
  [
    body('title').optional().isString().isLength({ max: 100 }),
    body('body').optional().isString().isLength({ max: 200 }),
    body('url').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { title, body, url } = req.body;

      // Prepare notification payload
      const payload = {
        title: title || 'Test Notification',
        body: body || 'This is a test push notification from your CRM app',
        url: url || '/',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
          type: 'test',
          timestamp: Date.now()
        }
      };

      // Send to user
      const result = await pushService.sendToUser(userId, payload);

      if (result.sent === 0 && result.failed === 0) {
        return res.status(404).json({
          success: false,
          message: 'No push subscriptions found for your account'
        });
      }

      res.json({
        success: true,
        message: 'Test notification sent',
        result: {
          sent: result.sent,
          failed: result.failed
        }
      });

    } catch (error) {
      console.error('Error sending test push:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/push/subscriptions
 * Get all push subscriptions for the authenticated user
 */
router.get('/subscriptions',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const subscriptions = await PushSubscription.findAll({
        where: { userId },
        attributes: ['id', 'deviceType', 'userAgent', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          deviceType: sub.deviceType || 'unknown',
          userAgent: sub.userAgent,
          createdAt: sub.createdAt
        }))
      });

    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriptions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
