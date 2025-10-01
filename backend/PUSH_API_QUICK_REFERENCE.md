# Push Notifications API - Quick Reference

## 🚀 Quick Start

### 1. Setup Environment Variables
```bash
VAPID_PUBLIC_KEY=BOzr7uALQKnv0sXPqfBsuAUTyJnqBBdFW-ihKUakQQytkFnvOWkWLUC04OEKTUnez5CbI4229QggQn0h6BLDm8M
VAPID_PRIVATE_KEY=ap9BR1N78KYwj-Jzg4b_xG84QkmVjKbM8X-wePo7Sts
VAPID_SUBJECT=mailto:your-email@example.com
```

### 2. Run Migration
```bash
npm run migrate
```

### 3. Test Configuration
```bash
curl http://localhost:5000/api/push/vapid-public-key
```

---

## 📡 API Endpoints

### Get VAPID Public Key
```
GET /api/push/vapid-public-key
Auth: None
```

### Subscribe to Push
```
POST /api/push/subscribe
Auth: Required
Body: {
  subscription: { endpoint, keys: { p256dh, auth } },
  deviceType: "ios|android|desktop",
  userAgent: "..."
}
```

### Unsubscribe
```
POST /api/push/unsubscribe
Auth: Required
Body: { endpoint } // or {} to remove all
```

### Send Test Notification
```
POST /api/push/test
Auth: Required
Body: { title, body, url }
```

### List Subscriptions
```
GET /api/push/subscriptions
Auth: Required
```

---

## 💻 Code Examples

### Send to Single User
```javascript
const pushService = require('./services/pushNotificationService');

await pushService.sendToUser(userId, {
  title: 'New Contact',
  body: 'John Doe was added',
  url: '/contacts/123',
  data: { contactId: '123' }
});
```

### Send to Multiple Users
```javascript
await pushService.sendToUsers([user1Id, user2Id], {
  title: 'Team Update',
  body: 'New deal closed!',
  url: '/deals'
});
```

### Check Configuration
```javascript
if (pushService.isPushConfigured()) {
  console.log('✓ Push ready');
}
```

---

## 🗄️ Database

### Query Subscriptions
```javascript
const { PushSubscription } = require('./models');

// Get all for user
const subs = await PushSubscription.findAll({
  where: { userId: 'uuid' }
});

// Get user's subscriptions with user data
const subs = await PushSubscription.findAll({
  where: { userId: 'uuid' },
  include: [{ model: User, as: 'user' }]
});
```

---

## 🔧 Troubleshooting

### Push not working?
1. Check logs: `heroku logs --tail | grep push`
2. Verify config: `heroku config | grep VAPID`
3. Test endpoint: `curl /api/push/vapid-public-key`
4. Check service worker console in browser

### 410 Gone errors?
- Normal! Subscription expired
- Service auto-removes it
- User will be prompted to re-subscribe

---

## 📁 File Locations

- Service: `/backend/services/pushNotificationService.js`
- Routes: `/backend/routes/push.js`
- Model: `/backend/models/PushSubscription.js`
- Migration: `/backend/migrations/20251001000000-create-push-subscriptions.js`
- Tests: `/backend/tests/push-notification.test.js`

---

## 🔑 VAPID Keys (Generated)

**Public Key** (share with frontend):
```
BOzr7uALQKnv0sXPqfBsuAUTyJnqBBdFW-ihKUakQQytkFnvOWkWLUC04OEKTUnez5CbI4229QggQn0h6BLDm8M
```

**Private Key** (SECRET - server only):
```
ap9BR1N78KYwj-Jzg4b_xG84QkmVjKbM8X-wePo7Sts
```

---

## ✅ Integration Checklist

Backend:
- [x] web-push installed
- [x] VAPID keys generated
- [x] Migration created
- [x] Model created
- [x] Service module created
- [x] API routes created
- [x] Server integrated
- [x] Tests created

Frontend (TODO):
- [ ] Fetch VAPID key
- [ ] Request permission
- [ ] Subscribe to PushManager
- [ ] Save subscription to backend
- [ ] Handle notifications
- [ ] Settings UI

Service Worker (TODO):
- [ ] Register service worker
- [ ] Handle push events
- [ ] Handle notification clicks
- [ ] Sync subscriptions

---

## 📞 Quick Help

```bash
# Generate new keys
node backend/scripts/generate-vapid-keys.js

# Run migration
npm run migrate

# Test service
node -e "console.log(require('./backend/services/pushNotificationService').isPushConfigured())"

# Start server
npm run server
```

---

**Last Updated**: October 1, 2025
