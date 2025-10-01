/**
 * Push Notification Service Tests
 *
 * Basic tests for push notification infrastructure
 * Run with: npm test -- push-notification.test.js
 */

const pushService = require('../services/pushNotificationService');

describe('Push Notification Service', () => {

  test('should export all required functions', () => {
    expect(pushService.sendPushNotification).toBeDefined();
    expect(pushService.sendToUser).toBeDefined();
    expect(pushService.sendToUsers).toBeDefined();
    expect(pushService.getVapidPublicKey).toBeDefined();
    expect(pushService.isPushConfigured).toBeDefined();
  });

  test('should indicate if push is not configured without VAPID keys', () => {
    // When VAPID keys are not set, isPushConfigured should return false
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      expect(pushService.isPushConfigured()).toBe(false);
      expect(pushService.getVapidPublicKey()).toBeNull();
    }
  });

  test('should return VAPID public key when configured', () => {
    // If keys are configured, should return the public key
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      expect(pushService.isPushConfigured()).toBe(true);
      expect(pushService.getVapidPublicKey()).toBeTruthy();
      expect(typeof pushService.getVapidPublicKey()).toBe('string');
    }
  });

  test('sendToUser should handle empty user ID gracefully', async () => {
    const result = await pushService.sendToUser(null, {
      title: 'Test',
      body: 'Test message'
    });

    expect(result).toBeDefined();
    expect(result.sent).toBe(0);
  });

  test('sendToUsers should handle empty array', async () => {
    const result = await pushService.sendToUsers([], {
      title: 'Test',
      body: 'Test message'
    });

    expect(result).toBeDefined();
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

});
