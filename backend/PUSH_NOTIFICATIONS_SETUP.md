# Web Push Notifications - Backend Setup Guide

## Overview

This backend infrastructure implements Web Push notifications using the standard Web Push API (not Firebase). It supports iOS PWA push notifications and all modern browsers.

## Files Created

### 1. Dependencies
- **Package**: `web-push` (v3.6.7)
- **Location**: `/Users/maggiemae/crmkiller/crm-app/package.json`

### 2. VAPID Key Generation Script
- **File**: `/Users/maggiemae/crmkiller/crm-app/backend/scripts/generate-vapid-keys.js`
- **Purpose**: Generates VAPID key pair for Web Push authentication
- **Usage**: `node backend/scripts/generate-vapid-keys.js`

### 3. Database Migration
- **File**: `/Users/maggiemae/crmkiller/crm-app/backend/migrations/20251001000000-create-push-subscriptions.js`
- **Table**: `push_subscriptions`
- **Columns**:
  - `id` (UUID, primary key)
  - `user_id` (UUID, foreign key to users table)
  - `endpoint` (TEXT, unique) - Push service endpoint URL
  - `p256dh` (TEXT) - Public key for encryption
  - `auth` (TEXT) - Authentication secret
  - `device_type` (VARCHAR) - Device identifier (ios, android, desktop)
  - `user_agent` (TEXT) - Browser/device user agent
  - `created_at`, `updated_at` (TIMESTAMP)
- **Indexes**:
  - Index on `user_id` for efficient queries
  - Unique index on `endpoint` to prevent duplicates

### 4. Sequelize Model
- **File**: `/Users/maggiemae/crmkiller/crm-app/backend/models/PushSubscription.js`
- **Associations**: `belongsTo(User)` with alias 'user'
- **Methods**: `toWebPushFormat()` - Converts to web-push library format

### 5. User Model Association
- **File**: `/Users/maggiemae/crmkiller/crm-app/backend/models/User.js`
- **Association**: `hasMany(PushSubscription)` with alias 'pushSubscriptions'

### 6. Push Notification Service
- **File**: `/Users/maggiemae/crmkiller/crm-app/backend/services/pushNotificationService.js`
- **Functions**:
  - `sendPushNotification(subscription, payload)` - Send to single device
  - `sendToUser(userId, payload)` - Send to all user's devices
  - `sendToUsers(userIds, payload)` - Send to multiple users
  - `getVapidPublicKey()` - Get public key for frontend
  - `isPushConfigured()` - Check configuration status
- **Features**:
  - Automatic cleanup of expired subscriptions (410/404 errors)
  - Error handling and logging
  - Batch sending with success/failure tracking

### 7. API Routes
- **File**: `/Users/maggiemae/crmkiller/crm-app/backend/routes/push.js`
- **Endpoints**:

#### `GET /api/push/vapid-public-key`
- **Auth**: None (public)
- **Purpose**: Returns VAPID public key for service worker
- **Response**: `{ success: true, publicKey: "..." }`

#### `POST /api/push/subscribe`
- **Auth**: Required (authMiddleware)
- **Body**:
  ```json
  {
    "subscription": {
      "endpoint": "https://...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      }
    },
    "deviceType": "ios|android|desktop",
    "userAgent": "Mozilla/5.0 ..."
  }
  ```
- **Purpose**: Save push subscription for authenticated user
- **Features**: Upsert logic (updates existing or creates new)

#### `POST /api/push/unsubscribe`
- **Auth**: Required
- **Body**: `{ "endpoint": "https://..." }` (optional - removes all if omitted)
- **Purpose**: Remove push subscription(s)

#### `POST /api/push/test`
- **Auth**: Required
- **Body**: `{ "title": "...", "body": "...", "url": "/" }` (all optional)
- **Purpose**: Send test notification to authenticated user

#### `GET /api/push/subscriptions`
- **Auth**: Required
- **Purpose**: List all subscriptions for authenticated user
- **Response**: Array of subscription metadata (not keys)

### 8. Server Integration
- **File**: `/Users/maggiemae/crmkiller/crm-app/backend/server.js`
- **Changes**: Added push routes at `/api/push`

---

## Environment Variables (Heroku Config)

### Generated VAPID Keys

**These keys were generated for this installation:**

```bash
VAPID_PUBLIC_KEY=BOzr7uALQKnv0sXPqfBsuAUTyJnqBBdFW-ihKUakQQytkFnvOWkWLUC04OEKTUnez5CbI4229QggQn0h6BLDm8M

VAPID_PRIVATE_KEY=ap9BR1N78KYwj-Jzg4b_xG84QkmVjKbM8X-wePo7Sts

VAPID_SUBJECT=mailto:your-email@example.com
```

### Setting Heroku Config Vars

```bash
# Set VAPID keys in Heroku
heroku config:set VAPID_PUBLIC_KEY="BOzr7uALQKnv0sXPqfBsuAUTyJnqBBdFW-ihKUakQQytkFnvOWkWLUC04OEKTUnez5CbI4229QggQn0h6BLDm8M"

heroku config:set VAPID_PRIVATE_KEY="ap9BR1N78KYwj-Jzg4b_xG84QkmVjKbM8X-wePo7Sts"

heroku config:set VAPID_SUBJECT="mailto:support@yourdomain.com"
```

**IMPORTANT**: Update `VAPID_SUBJECT` with your actual email address or domain URL.

### Local Development (.env)

For local development, add to `/Users/maggiemae/crmkiller/crm-app/backend/.env`:

```
VAPID_PUBLIC_KEY=BOzr7uALQKnv0sXPqfBsuAUTyJnqBBdFW-ihKUakQQytkFnvOWkWLUC04OEKTUnez5CbI4229QggQn0h6BLDm8M
VAPID_PRIVATE_KEY=ap9BR1N78KYwj-Jzg4b_xG84QkmVjKbM8X-wePo7Sts
VAPID_SUBJECT=mailto:dev@localhost.com
```

---

## Database Migration

### Run Migration Locally

```bash
cd /Users/maggiemae/crmkiller/crm-app
npm run migrate
```

### Run Migration on Heroku

```bash
heroku run npm run migrate
```

### Migration SQL (for reference)

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_type VARCHAR(20),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);
CREATE UNIQUE INDEX push_subscriptions_endpoint_unique ON push_subscriptions(endpoint);
```

---

## API Documentation

### Notification Payload Format

When calling `pushNotificationService.sendToUser()` or `sendToUsers()`, use this payload structure:

```javascript
const payload = {
  title: 'New Contact Added',           // Notification title
  body: 'John Doe was added to your CRM', // Notification body
  icon: '/icon-192x192.png',            // Icon URL (optional)
  badge: '/badge-72x72.png',            // Badge URL (optional)
  url: '/contacts/123',                 // URL to open (optional)
  data: {                               // Custom data (optional)
    type: 'contact_created',
    contactId: '123',
    timestamp: Date.now()
  }
};

// Send to single user
await pushNotificationService.sendToUser(userId, payload);

// Send to multiple users
await pushNotificationService.sendToUsers([userId1, userId2], payload);
```

### Response Format

All endpoints return:
```json
{
  "success": true|false,
  "message": "...",
  "data": { ... }
}
```

---

## Integration Examples

### Example 1: Send notification when contact is created

```javascript
// In backend/routes/contacts.js (after creating contact)
const pushService = require('../services/pushNotificationService');

// After successful contact creation
const payload = {
  title: 'New Contact Added',
  body: `${contact.firstName} ${contact.lastName} was added to your CRM`,
  url: `/contacts/${contact.id}`,
  icon: '/icon-192x192.png',
  data: {
    type: 'contact_created',
    contactId: contact.id
  }
};

await pushService.sendToUser(req.user.id, payload);
```

### Example 2: Send notification to all organization members

```javascript
const { User } = require('../models');
const pushService = require('../services/pushNotificationService');

// Get all users in organization
const users = await User.findAll({
  where: { organizationId: organizationId },
  attributes: ['id']
});

const userIds = users.map(u => u.id);

const payload = {
  title: 'Team Update',
  body: 'A new deal was closed!',
  url: '/deals'
};

await pushService.sendToUsers(userIds, payload);
```

### Example 3: Scheduled reminder notifications

```javascript
// In a cron job or scheduled task
const pushService = require('../services/pushNotificationService');

// Send reminder
const payload = {
  title: 'Reminder',
  body: 'You have a meeting in 15 minutes',
  url: '/calendar',
  data: {
    type: 'reminder',
    reminderId: reminder.id
  }
};

await pushService.sendToUser(reminder.userId, payload);
```

---

## Testing

### Test Locally

1. **Start server**:
   ```bash
   cd /Users/maggiemae/crmkiller/crm-app
   npm run server
   ```

2. **Test VAPID key endpoint**:
   ```bash
   curl http://localhost:5000/api/push/vapid-public-key
   ```

3. **Test subscription (requires auth token)**:
   ```bash
   curl -X POST http://localhost:5000/api/push/subscribe \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{
       "subscription": {
         "endpoint": "https://fcm.googleapis.com/fcm/send/...",
         "keys": {
           "p256dh": "...",
           "auth": "..."
         }
       },
       "deviceType": "desktop"
     }'
   ```

4. **Test notification**:
   ```bash
   curl -X POST http://localhost:5000/api/push/test \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{
       "title": "Test Notification",
       "body": "This is a test"
     }'
   ```

### Verify Configuration

Check if push is configured:
```javascript
const pushService = require('./services/pushNotificationService');
console.log('Push configured:', pushService.isPushConfigured());
console.log('VAPID public key:', pushService.getVapidPublicKey());
```

---

## Security Notes

1. **VAPID Private Key**: Never commit to git. Store only in Heroku config vars and local .env
2. **Endpoint Uniqueness**: Enforced by database unique constraint
3. **User Authentication**: All write endpoints require authentication
4. **Automatic Cleanup**: Expired subscriptions (410/404) are automatically removed
5. **Rate Limiting**: Push API endpoints respect server-wide rate limits

---

## Troubleshooting

### "Push notifications are not configured"
- Ensure VAPID keys are set in environment variables
- Check server logs for "Web Push configured with VAPID keys" message
- Run: `node backend/scripts/generate-vapid-keys.js` to generate new keys

### Notifications not arriving
- Check browser console for service worker errors
- Verify subscription was saved (check `/api/push/subscriptions`)
- Try test endpoint: `POST /api/push/test`
- Check server logs for push errors

### 410 Gone errors
- Normal behavior - subscription expired
- Service automatically removes expired subscriptions
- User needs to re-subscribe (browser will prompt if needed)

### Database migration fails
- Ensure PostgreSQL is running
- Check database connection string in .env
- Verify user has CREATE TABLE permissions

---

## Next Steps

### For Agent 3 (Frontend Integration):
1. Create subscription UI in settings
2. Request notification permission
3. Subscribe to push on login/registration
4. Handle notification clicks
5. Display notification settings

### For Agent 4 (Service Worker):
1. Register service worker
2. Subscribe to push manager with VAPID key
3. Handle push events
4. Handle notification clicks
5. Sync with backend on activation

### For Integration Phase:
1. Add push notifications to contact/deal creation
2. Send reminders via push
3. Notify about automation triggers
4. Add notification preferences to user settings
5. Analytics for notification delivery/clicks

---

## Support

For issues or questions:
- Check server logs: `heroku logs --tail`
- Verify environment variables: `heroku config`
- Test endpoints with curl or Postman
- Review web-push documentation: https://github.com/web-push-libs/web-push

---

**Generated**: 2025-10-01
**Version**: 1.0.0
**Web Push Library**: v3.6.7
