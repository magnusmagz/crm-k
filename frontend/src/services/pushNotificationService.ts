import { api } from './api';

/**
 * Push Notification Service
 * Handles push notification subscription, permission requests, and status checking
 * Designed for iOS PWA compatibility (iOS 16.4+)
 */

export interface PushSubscriptionStatus {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  isPWA: boolean;
  subscription?: PushSubscription | null;
}

class PushNotificationService {
  private vapidPublicKey: string | null = null;

  /**
   * Check if push notifications are supported in the current browser/environment
   */
  isPushSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Check if the app is running as a PWA (installed app)
   * Returns true if in standalone mode (iOS) or display-mode is standalone
   */
  isPWA(): boolean {
    // Check if running in standalone mode (iOS)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Check iOS specific standalone mode
    const isIOSStandalone = (window.navigator as any).standalone === true;

    return isStandalone || isIOSStandalone;
  }

  /**
   * Check if the device is iOS
   */
  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }

  /**
   * Get the current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'default';
    }
    return Notification.permission;
  }

  /**
   * Check if user has an active push subscription
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.isPushSupported()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Get comprehensive subscription status
   */
  async getSubscriptionStatus(): Promise<PushSubscriptionStatus> {
    const isSupported = this.isPushSupported();
    const permission = this.getPermissionStatus();
    const isPWA = this.isPWA();

    if (!isSupported) {
      return {
        isSupported: false,
        isSubscribed: false,
        permission: 'default',
        isPWA,
        subscription: null,
      };
    }

    const subscription = await this.getSubscription();
    const isSubscribed = subscription !== null;

    return {
      isSupported,
      isSubscribed,
      permission,
      isPWA,
      subscription,
    };
  }

  /**
   * Fetch VAPID public key from backend
   */
  async getVapidPublicKey(): Promise<string> {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }

    try {
      const response = await api.get('/push/vapid-public-key');
      const publicKey = response.data.publicKey;
      if (!publicKey) {
        throw new Error('VAPID public key not received from server');
      }
      this.vapidPublicKey = publicKey;
      return publicKey;
    } catch (error) {
      console.error('Error fetching VAPID public key:', error);
      throw new Error('Failed to fetch VAPID public key');
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Request notification permission from user
   * MUST be called from a user interaction (button click)
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notification permission denied');
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('Error requesting permission:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   * This will:
   * 1. Request permission if not already granted
   * 2. Create a push subscription
   * 3. Send subscription to backend
   */
  async subscribeToPush(): Promise<PushSubscription> {
    if (!this.isPushSupported()) {
      throw new Error('Push notifications not supported');
    }

    // Request permission first
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Get VAPID public key
        const vapidPublicKey = await this.getVapidPublicKey();
        const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        console.log('Push subscription created:', subscription);
      } else {
        console.log('Using existing subscription:', subscription);
      }

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      throw error;
    }
  }

  /**
   * Send subscription details to backend
   */
  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      const subscriptionData = subscription.toJSON();

      // Add device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isIOS: this.isIOS(),
        isPWA: this.isPWA(),
      };

      await api.post('/push/subscribe', {
        subscription: subscriptionData,
        deviceInfo,
      });

      console.log('Subscription sent to backend');
    } catch (error) {
      console.error('Error sending subscription to backend:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   * This will:
   * 1. Remove subscription from backend
   * 2. Unsubscribe from push manager
   */
  async unsubscribeFromPush(): Promise<void> {
    if (!this.isPushSupported()) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from backend first
        try {
          await api.post('/push/unsubscribe', {
            endpoint: subscription.endpoint,
          });
        } catch (error) {
          console.error('Error removing subscription from backend:', error);
          // Continue to unsubscribe locally even if backend fails
        }

        // Unsubscribe locally
        await subscription.unsubscribe();
        console.log('Unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      throw error;
    }
  }

  /**
   * Send test notification via backend
   */
  async sendTestNotification(): Promise<void> {
    try {
      await api.post('/push/test');
      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  /**
   * Show a local notification (for testing)
   */
  async showLocalNotification(title: string, body: string): Promise<void> {
    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/logo192.png',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        requireInteraction: false,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
