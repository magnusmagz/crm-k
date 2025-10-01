/* eslint-disable no-restricted-globals */

// Cache name - update version to force cache refresh
const CACHE_NAME = 'crm-app-v1';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Cache what we can, but don't fail if some assets aren't available yet
        return cache.addAll(ASSETS_TO_CACHE.map(url => {
          return new Request(url, { cache: 'reload' });
        })).catch((err) => {
          console.warn('[Service Worker] Some assets failed to cache:', err);
        });
      })
      .then(() => {
        console.log('[Service Worker] Installed successfully');
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activated successfully');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests to backend API (let them go through to network)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache the response for future use
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            // Could return a custom offline page here
            throw error;
          });
      })
  );
});

// Push event listener - receives and displays push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);

  try {
    // Parse notification data from push event
    let notificationData;

    if (event.data) {
      try {
        notificationData = event.data.json();
        console.log('[Service Worker] Parsed notification data:', notificationData);
      } catch (jsonError) {
        console.warn('[Service Worker] Failed to parse JSON, trying text:', jsonError);
        notificationData = {
          title: 'CRM Reminder',
          body: event.data.text() || 'You have a new reminder',
        };
      }
    } else {
      console.warn('[Service Worker] No data in push event');
      notificationData = {
        title: 'CRM Reminder',
        body: 'You have a new notification',
      };
    }

    // Extract notification properties with fallbacks
    const title = notificationData.title || 'CRM Reminder';
    const options = {
      body: notificationData.body || 'You have a new reminder',
      icon: notificationData.icon || '/logo192.png',
      badge: notificationData.badge || '/logo192.png',
      tag: notificationData.tag || `notification-${Date.now()}`,
      data: {
        url: notificationData.url || '/reminders',
        reminderId: notificationData.data?.reminderId || notificationData.reminderId,
        entityType: notificationData.data?.entityType || notificationData.entityType,
        entityId: notificationData.data?.entityId || notificationData.entityId,
        timestamp: Date.now()
      },
      // iOS-specific optimizations
      requireInteraction: false, // Don't require user interaction (better for iOS)
      silent: false, // Allow sound/vibration
      vibrate: [200, 100, 200], // Vibration pattern
      // Additional options for rich notifications
      actions: notificationData.actions || [],
      image: notificationData.image,
      dir: 'auto',
      lang: 'en-US',
      renotify: false, // Don't renotify for same tag
    };

    console.log('[Service Worker] Showing notification with options:', { title, options });

    // Display the notification
    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('[Service Worker] Notification displayed successfully');
        })
        .catch((error) => {
          console.error('[Service Worker] Failed to show notification:', error);
          // Try to show a fallback notification
          return self.registration.showNotification('CRM Reminder', {
            body: 'You have a new reminder',
            icon: '/logo192.png',
            badge: '/logo192.png',
            tag: 'fallback-notification'
          });
        })
    );
  } catch (error) {
    console.error('[Service Worker] Error in push event handler:', error);
    // Show fallback notification even if there's an error
    event.waitUntil(
      self.registration.showNotification('CRM Reminder', {
        body: 'You have a new notification',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'error-notification'
      })
    );
  }
});

// Notification click handler - opens app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification);
  console.log('[Service Worker] Notification data:', event.notification.data);
  console.log('[Service Worker] Action clicked:', event.action);

  // Close the notification
  event.notification.close();

  // Determine the URL to open
  const urlToOpen = event.notification.data?.url || '/reminders';
  const reminderId = event.notification.data?.reminderId;
  const entityType = event.notification.data?.entityType;
  const entityId = event.notification.data?.entityId;

  // Build the target URL with query params if we have a reminder ID
  let targetUrl = urlToOpen;
  if (reminderId) {
    targetUrl = `${urlToOpen}?reminderId=${reminderId}`;
  } else if (entityType && entityId) {
    // If we have entity info but no reminder ID, navigate to the entity
    if (entityType === 'contact') {
      targetUrl = `/contacts/${entityId}`;
    } else if (entityType === 'deal') {
      targetUrl = `/deals/${entityId}`;
    }
  }

  console.log('[Service Worker] Opening URL:', targetUrl);

  // Handle notification click - focus existing window or open new one
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      console.log('[Service Worker] Found clients:', clientList.length);

      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        console.log('[Service Worker] Checking client:', client.url);

        // If a window is already open, focus it and navigate
        if (client.url.includes(self.registration.scope.replace(/\/$/, '')) && 'focus' in client) {
          console.log('[Service Worker] Focusing existing window');
          return client.focus().then((focusedClient) => {
            // Navigate to the target URL
            if ('navigate' in focusedClient) {
              console.log('[Service Worker] Navigating to:', targetUrl);
              return focusedClient.navigate(targetUrl);
            }
            return focusedClient;
          });
        }
      }

      // No window found, open a new one
      console.log('[Service Worker] Opening new window');
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
          .then((windowClient) => {
            console.log('[Service Worker] New window opened:', windowClient);
            return windowClient;
          })
          .catch((error) => {
            console.error('[Service Worker] Failed to open window:', error);
          });
      }
    })
    .catch((error) => {
      console.error('[Service Worker] Error in notification click handler:', error);
    })
  );
});

// Notification close handler - logs when notification is dismissed
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification);
  console.log('[Service Worker] Notification tag:', event.notification.tag);
  console.log('[Service Worker] Notification data:', event.notification.data);

  // Optional: Send analytics or log the dismissal
  // This could be useful for tracking notification engagement
  const notificationData = event.notification.data || {};

  // You could send this to your analytics endpoint
  // event.waitUntil(
  //   fetch('/api/analytics/notification-dismissed', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       tag: event.notification.tag,
  //       reminderId: notificationData.reminderId,
  //       timestamp: Date.now()
  //     })
  //   })
  // );
});

// Background Sync - handle offline push notifications
// This queues notifications that arrive while the app is offline
const NOTIFICATION_QUEUE_NAME = 'notification-queue';
const notificationQueue = [];

// Background sync event - process queued notifications when back online
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync event:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      syncQueuedNotifications()
        .then(() => {
          console.log('[Service Worker] Notification sync completed');
        })
        .catch((error) => {
          console.error('[Service Worker] Notification sync failed:', error);
        })
    );
  }
});

// Helper function to sync queued notifications
async function syncQueuedNotifications() {
  try {
    // Open IndexedDB or cache to retrieve queued notifications
    const cache = await caches.open(NOTIFICATION_QUEUE_NAME);
    const cachedRequests = await cache.keys();

    console.log('[Service Worker] Found queued notifications:', cachedRequests.length);

    // Process each queued notification
    for (const request of cachedRequests) {
      try {
        const response = await cache.match(request);
        if (response) {
          const notificationData = await response.json();

          // Display the notification
          await self.registration.showNotification(
            notificationData.title || 'CRM Reminder',
            {
              body: notificationData.body,
              icon: notificationData.icon || '/logo192.png',
              badge: notificationData.badge || '/logo192.png',
              tag: notificationData.tag,
              data: notificationData.data,
            }
          );

          // Remove from queue after successful display
          await cache.delete(request);
          console.log('[Service Worker] Queued notification displayed:', notificationData.title);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to process queued notification:', error);
      }
    }

    return true;
  } catch (error) {
    console.error('[Service Worker] Failed to sync notifications:', error);
    throw error;
  }
}

// Helper function to queue notification when offline
async function queueNotification(notificationData) {
  try {
    const cache = await caches.open(NOTIFICATION_QUEUE_NAME);
    const request = new Request(`/notification-queue/${Date.now()}`);
    const response = new Response(JSON.stringify(notificationData), {
      headers: { 'Content-Type': 'application/json' }
    });

    await cache.put(request, response);
    console.log('[Service Worker] Notification queued for later:', notificationData.title);

    // Register background sync if available
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-notifications');
      console.log('[Service Worker] Background sync registered');
    }

    return true;
  } catch (error) {
    console.error('[Service Worker] Failed to queue notification:', error);
    return false;
  }
}

// Message event - handle messages from the app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Handle manual notification trigger from app (for testing)
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const notificationData = event.data.notification;
    self.registration.showNotification(
      notificationData.title || 'CRM Reminder',
      {
        body: notificationData.body || 'Test notification',
        icon: notificationData.icon || '/logo192.png',
        badge: notificationData.badge || '/logo192.png',
        tag: notificationData.tag || `manual-${Date.now()}`,
        data: notificationData.data || {},
      }
    ).then(() => {
      console.log('[Service Worker] Manual notification shown');
    }).catch((error) => {
      console.error('[Service Worker] Failed to show manual notification:', error);
    });
  }

  // Handle subscription update from app
  if (event.data && event.data.type === 'UPDATE_SUBSCRIPTION') {
    console.log('[Service Worker] Subscription update requested');
    // This is handled by the app's notification permission handler
  }
});
