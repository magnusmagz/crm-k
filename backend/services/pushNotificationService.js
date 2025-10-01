/**
 * Push Notification Service
 *
 * Handles sending Web Push notifications using the web-push library.
 * Supports sending to individual subscriptions, single users, or multiple users.
 *
 * Features:
 * - Automatic cleanup of expired/invalid subscriptions
 * - Batch sending to multiple devices
 * - Error handling and logging
 * - VAPID authentication
 */

const webPush = require('web-push');
const { PushSubscription } = require('../models');

// Configure web-push with VAPID details
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('✓ Web Push configured with VAPID keys');
} else {
  console.warn('⚠ VAPID keys not configured. Push notifications will not work.');
  console.warn('  Run: node backend/scripts/generate-vapid-keys.js');
}

/**
 * Send a push notification to a single subscription
 *
 * @param {Object} subscription - PushSubscription instance or web-push format object
 * @param {Object} payload - Notification data
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {string} [payload.icon] - Notification icon URL
 * @param {string} [payload.badge] - Notification badge URL
 * @param {string} [payload.url] - URL to open when clicked
 * @param {Object} [payload.data] - Additional data
 * @returns {Promise<boolean>} - True if sent successfully
 */
async function sendPushNotification(subscription, payload) {
  try {
    // Convert to web-push format if it's a Sequelize model
    const pushSubscription = subscription.toWebPushFormat
      ? subscription.toWebPushFormat()
      : subscription;

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title || 'Notification',
      body: payload.body || '',
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      url: payload.url || '/',
      data: payload.data || {},
      timestamp: Date.now()
    });

    // Send the notification
    await webPush.sendNotification(pushSubscription, notificationPayload);

    console.log(`✓ Push notification sent: ${payload.title}`);
    return true;

  } catch (error) {
    console.error('✗ Error sending push notification:', error.message);

    // Handle subscription expiration/invalidation
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('  → Subscription expired, removing from database');

      // Remove expired subscription if we have the endpoint
      if (subscription.endpoint) {
        await PushSubscription.destroy({
          where: { endpoint: subscription.endpoint }
        });
      }
    }

    return false;
  }
}

/**
 * Send a push notification to all devices registered to a user
 *
 * @param {string} userId - User UUID
 * @param {Object} payload - Notification payload (see sendPushNotification)
 * @returns {Promise<Object>} - { sent: number, failed: number }
 */
async function sendToUser(userId, payload) {
  try {
    // Get all subscriptions for this user
    const subscriptions = await PushSubscription.findAll({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`Sending push to ${subscriptions.length} device(s) for user ${userId}`);

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(sub => sendPushNotification(sub, payload))
    );

    // Count successes and failures
    const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - sent;

    console.log(`✓ Push results: ${sent} sent, ${failed} failed`);

    return { sent, failed };

  } catch (error) {
    console.error('Error sending push to user:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send a push notification to multiple users
 *
 * @param {string[]} userIds - Array of user UUIDs
 * @param {Object} payload - Notification payload (see sendPushNotification)
 * @returns {Promise<Object>} - { sent: number, failed: number }
 */
async function sendToUsers(userIds, payload) {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      console.log('No user IDs provided');
      return { sent: 0, failed: 0 };
    }

    console.log(`Sending push to ${userIds.length} user(s)`);

    // Send to each user
    const results = await Promise.allSettled(
      userIds.map(userId => sendToUser(userId, payload))
    );

    // Aggregate results
    const totals = results.reduce((acc, result) => {
      if (result.status === 'fulfilled') {
        acc.sent += result.value.sent;
        acc.failed += result.value.failed;
      } else {
        acc.failed += 1;
      }
      return acc;
    }, { sent: 0, failed: 0 });

    console.log(`✓ Batch push results: ${totals.sent} sent, ${totals.failed} failed`);

    return totals;

  } catch (error) {
    console.error('Error sending push to users:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Get the public VAPID key
 * This is safe to share with the frontend
 *
 * @returns {string|null} - VAPID public key
 */
function getVapidPublicKey() {
  return vapidPublicKey || null;
}

/**
 * Check if push notifications are properly configured
 *
 * @returns {boolean}
 */
function isPushConfigured() {
  return !!(vapidPublicKey && vapidPrivateKey);
}

module.exports = {
  sendPushNotification,
  sendToUser,
  sendToUsers,
  getVapidPublicKey,
  isPushConfigured
};
