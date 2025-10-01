# Push Notifications - Documentation

## Overview

The CRM app implements Web Push notifications for real-time reminder delivery on both iOS and Android devices. Push notifications work even when the browser or app is closed, providing a native app-like experience.

## Features

### ✅ Supported Platforms

- **iOS 16.4+**: Requires PWA installation to home screen
- **Android 4.4+**: Works in Chrome browser and as installed PWA
- **Desktop**: Chrome, Edge, Firefox (bonus support)

### ✅ Key Features

1. **Automatic Reminder Notifications**: Server-side scheduler checks every minute for due reminders
2. **Multi-Device Support**: Users can subscribe multiple devices (phone, tablet, desktop)
3. **Offline-First**: Service worker caches notifications for offline delivery
4. **Smart De-duplication**: Prevents duplicate notifications using timestamps
5. **Click-to-Action**: Clicking notification opens app to relevant page
6. **Permission Management**: Graceful permission prompts at appropriate times
7. **PWA Installation Prompts**: Guides users through installation process

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     USER'S DEVICE                           │
│                                                             │
│  ┌──────────────┐         ┌──────────────────────┐        │
│  │   Browser    │────────▶│  Service Worker      │        │
│  │   (PWA)      │         │  (Background)        │        │
│  └──────────────┘         └──────────────────────┘        │
│         │                           │                      │
│         │                           │ Receives Push        │
│         │                           │ Shows Notification   │
└─────────┼───────────────────────────┼──────────────────────┘
          │                           │
          │ Subscribe                 │
          │                           │
          ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                           │
│                                                             │
│  ┌──────────────┐    ┌────────────────┐   ┌─────────────┐ │
│  │ Push API     │───▶│ Push Subs DB   │   │ Reminders   │ │
│  │ Endpoints    │    └────────────────┘   │ Scheduler   │ │
│  └──────────────┘                         └─────────────┘ │
│                                                   │         │
│                                                   │ Every   │
│                                                   │ Minute  │
│                            ┌──────────────────────▼───────┐ │
│                            │ Push Notification Service   │ │
│                            │ (web-push library)          │ │
│                            └──────────────┬──────────────┘ │
└───────────────────────────────────────────┼────────────────┘
                                            │
                                            │ VAPID Auth
                                            │
                                            ▼
                              ┌──────────────────────────┐
                              │   Push Service (FCM)     │
                              │   Google/Apple/Mozilla   │
                              └──────────────────────────┘
```

### Key Files

**Frontend:**
- `frontend/public/service-worker.js` - Handles push events and displays notifications
- `frontend/src/services/pushNotificationService.ts` - Subscription management
- `frontend/src/components/NotificationPermissionPrompt.tsx` - Permission UI
- `frontend/src/components/InstallPWAPrompt.tsx` - PWA installation guidance
- `frontend/src/pages/Reminders.tsx` - Reminder UI with test notification button

**Backend:**
- `backend/services/reminderScheduler.js` - Cron job that checks for due reminders
- `backend/services/pushNotificationService.js` - Web Push notification sending
- `backend/routes/push.js` - Push subscription API endpoints
- `backend/models/PushSubscription.js` - Push subscription database model
- `backend/models/Reminder.js` - Reminder model with notification tracking

**Database:**
- `push_subscriptions` table - Stores user push subscriptions
- `reminders` table - Stores reminders with `last_notification_sent_at` tracking

---

## Setup Instructions

### Prerequisites

1. **VAPID Keys**: Required for Web Push authentication
2. **HTTPS**: Push notifications require secure origin (localhost or HTTPS)
3. **PostgreSQL Database**: For storing subscriptions and reminders

### Step 1: Generate VAPID Keys

```bash
cd backend
node scripts/generate-vapid-keys.js
```

This outputs:
```
VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=XY...
VAPID_SUBJECT=mailto:support@yourapp.com
```

### Step 2: Configure Environment Variables

**Heroku:**
```bash
heroku config:set VAPID_PUBLIC_KEY="BN..."
heroku config:set VAPID_PRIVATE_KEY="XY..."
heroku config:set VAPID_SUBJECT="mailto:support@yourapp.com"
```

**Local (.env):**
```env
VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=XY...
VAPID_SUBJECT=mailto:support@yourapp.com
```

### Step 3: Database Setup

Run the migrations:

```sql
-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_type VARCHAR(20),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);
CREATE UNIQUE INDEX push_subscriptions_endpoint_unique ON push_subscriptions(endpoint);

-- Add notification tracking to reminders
ALTER TABLE reminders
ADD COLUMN last_notification_sent_at TIMESTAMP WITH TIME ZONE;
```

### Step 4: Install Dependencies

```bash
npm install web-push node-cron
```

### Step 5: Deploy

```bash
git add -A
git commit -m "Add push notification support"
git push heroku main
```

---

## User Experience Flow

### First-Time User (iOS)

1. User visits app in Safari
2. Sees **"Install App"** prompt with iOS-specific instructions
3. Taps Share → "Add to Home Screen"
4. Opens PWA from home screen
5. Creates first reminder
6. Sees **notification permission prompt**
7. Grants permission → automatically subscribed to push notifications
8. Reminders now trigger push notifications at scheduled times

### First-Time User (Android)

1. User visits app in Chrome browser
2. Creates first reminder
3. Sees **notification permission prompt**
4. Grants permission → automatically subscribed to push notifications
5. Reminders now trigger push notifications at scheduled times
6. *Optional*: Can install PWA via Chrome menu → "Install app"

### Returning User

1. Opens app
2. Reminders automatically sync
3. Push notifications work immediately (already subscribed)
4. Can manage reminders and test notifications

---

## Testing Push Notifications

### Quick Test (In-App)

1. Navigate to **Reminders** page
2. Click **"Test Notification"** button
3. If permission granted, see notification immediately
4. If permission not granted, prompted to grant permission

### Real-World Test (Scheduled Reminder)

**On Android:**
1. Open app in Chrome
2. Create reminder for 2 minutes from now
3. Close Chrome completely (swipe from recent apps)
4. Wait for scheduled time
5. ✅ Notification appears even with Chrome closed!

**On iOS (16.4+):**
1. Install PWA to home screen (required!)
2. Open PWA from home screen icon
3. Create reminder for 2 minutes from now
4. Close app (swipe up)
5. Wait for scheduled time
6. ✅ Notification appears even with app closed!

### Backend Monitoring

**Check scheduler logs:**
```bash
heroku logs --tail --app your-app-name
```

Look for:
```
[Reminder Scheduler] Starting reminder scheduler (runs every minute)
[Reminder Scheduler] Checking for due reminders at 2025-10-01T12:00:00.000Z
[Reminder Scheduler] Found 1 due reminder(s)
[Reminder Scheduler] Sent notification for: "Follow up with John"
✓ Push notification sent: Follow up with John
[Reminder Scheduler] Completed: 1 sent, 0 failed
```

### Troubleshooting

**Notifications not appearing:**
```bash
# Check if scheduler is running
heroku logs --tail | grep "Reminder Scheduler"

# Check push subscriptions exist
heroku pg:psql
SELECT user_id, endpoint, created_at FROM push_subscriptions;

# Check for due reminders
SELECT id, title, remind_at, is_completed FROM reminders
WHERE is_completed = false AND remind_at <= NOW();

# Test notification send manually
curl -X POST https://your-app.herokuapp.com/api/push/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Permission not granted:**
- Check browser settings → Site Settings → Notifications
- On iOS: Must be installed PWA, not Safari browser
- On Android: Works in browser or PWA

**Service worker not registered:**
```javascript
// Check in browser console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
});
```

---

## API Reference

### Push Subscription Endpoints

#### GET `/api/push/vapid-public-key`
Get the public VAPID key for client-side subscription.

**Response:**
```json
{
  "publicKey": "BN..."
}
```

#### POST `/api/push/subscribe`
Subscribe a device to push notifications.

**Request:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BN...",
      "auth": "XY..."
    }
  },
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "platform": "Android",
    "isIOS": false,
    "isPWA": true
  }
}
```

**Response:**
```json
{
  "message": "Successfully subscribed to push notifications",
  "subscription": {
    "id": "uuid",
    "userId": "uuid",
    "endpoint": "...",
    "deviceType": "android"
  }
}
```

#### POST `/api/push/unsubscribe`
Unsubscribe a device from push notifications.

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

#### POST `/api/push/test`
Send a test notification to all user's devices.

**Response:**
```json
{
  "message": "Test notification sent",
  "results": {
    "sent": 2,
    "failed": 0
  }
}
```

#### GET `/api/push/subscriptions`
Get all push subscriptions for the current user.

**Response:**
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "deviceType": "android",
      "userAgent": "...",
      "createdAt": "2025-10-01T..."
    }
  ]
}
```

### Reminder Endpoints

#### GET `/api/reminders`
Get user's reminders.

**Query Params:**
- `completed` - Filter by completion status (true/false)
- `entityType` - Filter by entity type (contact/deal)
- `limit` - Max results (default: 50)
- `offset` - Pagination offset

#### POST `/api/reminders`
Create a new reminder.

**Request:**
```json
{
  "title": "Follow up with John",
  "description": "Discuss pricing",
  "remindAt": "2025-10-01T14:00:00Z",
  "entityType": "contact",
  "entityId": "uuid",
  "entityName": "John Doe"
}
```

#### GET `/api/reminders/check/due`
Check for due reminders (used by frontend polling as backup).

**Response:**
```json
{
  "reminders": [
    {
      "id": "uuid",
      "title": "Follow up with John",
      "remindAt": "2025-10-01T14:00:00Z",
      "entityType": "contact",
      "entityId": "uuid",
      "entityName": "John Doe"
    }
  ]
}
```

---

## Service Worker Events

### Push Event
Triggered when push notification arrives.

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: data.tag,
      data: data.data,
      vibrate: [200, 100, 200]
    })
  );
});
```

### Notification Click
Triggered when user clicks notification.

```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/reminders';

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Focus existing window or open new one
        if (clientList.length > 0) {
          return clientList[0].focus().then(client => client.navigate(urlToOpen));
        }
        return clients.openWindow(urlToOpen);
      })
  );
});
```

### Notification Close
Triggered when notification is dismissed.

```javascript
self.addEventListener('notificationclose', (event) => {
  // Optional: Log analytics
  console.log('Notification dismissed:', event.notification.tag);
});
```

---

## Platform-Specific Considerations

### iOS Limitations

**Requirements:**
- iOS 16.4 or later
- PWA must be installed to home screen
- Must be opened from home screen icon (not Safari)

**Limitations:**
- ❌ Custom notification sounds (system sound only)
- ❌ Notification actions/buttons
- ❌ Rich media (images) in notifications
- ✅ Basic notifications with title, body, icon
- ✅ Click-to-open functionality

**User Instructions:**
1. Tap Share button in Safari
2. Scroll and tap "Add to Home Screen"
3. Tap "Add"
4. Open app from home screen icon
5. Grant notification permission when prompted

### Android Capabilities

**Full Support:**
- ✅ Works in browser (doesn't require PWA install)
- ✅ Works as installed PWA (better reliability)
- ✅ Custom vibration patterns
- ✅ Notification badges
- ✅ Background sync
- ✅ Silent notifications

**Battery Optimization:**
- Some manufacturers (Xiaomi, Huawei, OnePlus) aggressively kill background processes
- Users may need to disable battery optimization for Chrome/app
- Notifications may be delayed in Doze mode when device is idle

**Data Saver:**
- If enabled, may restrict background sync
- High-priority notifications can bypass restrictions

---

## Security & Privacy

### VAPID Authentication
- Uses public/private key pair for authentication
- Private key never leaves server
- Public key shared with clients for subscription
- Prevents unauthorized push sending

### Subscription Endpoint Security
- Each subscription has unique endpoint URL
- Endpoint can only receive pushes from verified sender (VAPID)
- Subscription automatically expires if unused

### Data Storage
- Push subscriptions stored server-side in PostgreSQL
- Encrypted in transit (HTTPS required)
- Deleted when user unsubscribes or subscription expires
- Cascade delete when user account deleted

### Permission Model
- Explicit user permission required
- Can be revoked anytime in browser settings
- Per-origin permission (other sites can't access)

---

## Performance & Scaling

### Scheduler Performance
- Runs every 60 seconds (cron: `* * * * *`)
- Processes max 50 reminders per run
- Database query optimized with indexes:
  - `idx_reminders_pending` on `(is_completed, remind_at)`
  - `push_subscriptions_user_id_idx` on `user_id`

### Push Delivery
- Batch processing for multiple devices per user
- Automatic cleanup of expired subscriptions (410/404 responses)
- Retry logic handled by push service providers
- 5-minute cooldown between notifications (prevents spam)

### Database Optimization
```sql
-- Indexes for fast queries
CREATE INDEX idx_reminders_pending ON reminders(is_completed, remind_at);
CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- Cleanup old completed reminders (optional cron job)
DELETE FROM reminders
WHERE is_completed = true
AND completed_at < NOW() - INTERVAL '90 days';
```

### Scaling Considerations
- **Current**: Single dyno runs cron job (free tier)
- **Medium scale** (1000s users): Same setup works fine
- **Large scale** (10,000+ users):
  - Move to dedicated worker dyno
  - Use Redis for job queue
  - Implement rate limiting per user

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Subscription Rate**: % of users who grant permission
2. **Active Subscriptions**: Total subscribed devices
3. **Delivery Success Rate**: sent / (sent + failed)
4. **Click-Through Rate**: notifications clicked / sent
5. **Unsubscribe Rate**: opt-outs over time

### Logging

**Scheduler Logs:**
```
[Reminder Scheduler] Checking for due reminders at 2025-10-01T12:00:00.000Z
[Reminder Scheduler] Found 3 due reminder(s)
[Reminder Scheduler] Sent notification for: "Follow up with John"
✓ Push notification sent: Follow up with John
[Reminder Scheduler] Completed: 3 sent, 0 failed
```

**Push Service Logs:**
```
✓ Web Push configured with VAPID keys
✓ Push notification sent: Test Notification
Sending push to 2 device(s) for user abc-123
✓ Push results: 2 sent, 0 failed
```

### Heroku Monitoring
```bash
# Real-time logs
heroku logs --tail --source app

# Filter for push notifications
heroku logs --tail | grep -i "push\|reminder scheduler"

# Check dyno status
heroku ps

# Database query performance
heroku pg:diagnose
```

---

## Maintenance & Operations

### Regular Tasks

**Weekly:**
- Check scheduler logs for errors
- Review failed notification count
- Monitor subscription growth

**Monthly:**
- Clean up expired subscriptions (auto-handled on 410/404)
- Review reminder completion rates
- Update VAPID keys if compromised (requires re-subscription)

**Quarterly:**
- Review and optimize database indexes
- Test on new iOS/Android versions
- Update dependencies (web-push, node-cron)

### Disaster Recovery

**Lost VAPID Keys:**
1. Generate new keys: `node scripts/generate-vapid-keys.js`
2. Update environment variables
3. Deploy
4. All users must re-subscribe (old subscriptions invalid)

**Database Corruption:**
1. Restore from backup
2. Users will re-subscribe automatically on next app open

**Service Worker Issues:**
1. Update service worker version (cache name)
2. Deploy
3. Old service workers auto-update within 24h

---

## Future Enhancements

### Planned Features
- [ ] Rich notifications with images (Android only)
- [ ] Notification action buttons ("Complete", "Snooze")
- [ ] Configurable notification preferences (sound, vibration)
- [ ] Notification scheduling preferences (quiet hours)
- [ ] Desktop app notifications (Electron wrapper)

### Advanced Features
- [ ] Push notification analytics dashboard
- [ ] A/B testing notification copy
- [ ] Smart delivery (ML-based optimal timing)
- [ ] Multi-language notification support
- [ ] Custom notification templates

---

## Support & Resources

### Documentation
- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push Library](https://github.com/web-push-libs/web-push)
- [iOS Web Push - Apple](https://webkit.org/blog/12945/meet-web-push/)

### Testing Tools
- [Vapid Key Generator](https://vapidkeys.com/)
- [Push Notification Tester](https://tests.peter.sh/notification-generator/)
- Chrome DevTools → Application → Service Workers
- Chrome DevTools → Application → Push Messaging

### Common Issues
- [iOS PWA Issues](https://firt.dev/notes/pwa-ios/)
- [Android Battery Optimization](https://dontkillmyapp.com/)
- [Service Worker Debugging](https://developers.google.com/web/fundamentals/primers/service-workers)

---

## Changelog

### v1.0.0 - 2025-10-01
- ✅ Initial push notification implementation
- ✅ iOS 16.4+ support
- ✅ Android Chrome support
- ✅ Automated reminder scheduler (every minute)
- ✅ Multi-device subscription support
- ✅ Service worker notification handling
- ✅ PWA installation prompts
- ✅ Permission management UI
- ✅ Database schema for subscriptions and reminders
- ✅ VAPID authentication
- ✅ Automatic subscription cleanup

---

**Last Updated:** October 1, 2025
**Maintained By:** Development Team
**Version:** 1.0.0
