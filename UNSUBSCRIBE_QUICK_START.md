# Quick Start: Postmark Unsubscribe Implementation

## What We've Implemented

We've set up Postmark's built-in unsubscribe handling (#2 approach) which is perfect for early-stage startups:

### 1. Email Changes
- Added Postmark unsubscribe headers to all emails
- Added a simple unsubscribe footer with Postmark's magic link `{{{pm:unsubscribe_url}}}`
- Postmark will automatically replace this with a working unsubscribe link

### 2. Webhook Handler
- Updated `/api/webhooks/postmark` to handle SubscriptionChange events
- Automatically syncs Postmark suppressions to your local database
- Handles reactivations too (if someone re-subscribes)

## Setup Steps

### Step 1: Configure Postmark Webhook

1. Log into your Postmark account
2. Go to your Server → Settings → Webhooks
3. Add a new webhook with URL: `https://your-domain.com/api/webhooks/postmark`
4. Enable these events:
   - ✅ Bounce
   - ✅ Spam Complaint  
   - ✅ Subscription Change
   - ✅ Open (optional - if you want Postmark tracking)
   - ✅ Click (optional - if you want Postmark tracking)

### Step 2: Test the Integration

1. Send a test email:
```javascript
// Quick test script
const api = require('./frontend/src/services/api');

// Send test email
const response = await api.post('/emails/send', {
  contactId: 'your-test-contact-id',
  subject: 'Test Unsubscribe Link',
  message: '<p>This is a test email with unsubscribe functionality.</p>'
});
```

2. Check the email - you should see:
   - An unsubscribe link at the bottom
   - The link goes to Postmark's unsubscribe page

3. Click unsubscribe and verify:
   - Postmark shows their unsubscribe confirmation
   - Check your database: `SELECT * FROM email_suppressions`
   - The email should be added with reason='unsubscribe'

## How It Works

1. **Email is sent** → Postmark adds unsubscribe link
2. **User clicks unsubscribe** → Goes to Postmark's page
3. **User confirms** → Postmark adds to their suppression list
4. **Webhook fires** → Your app syncs the suppression
5. **Next email attempt** → Blocked by your checkSuppression()

## What Users See

When they click unsubscribe, they see Postmark's default page:
- Clean, professional design
- Clear confirmation message
- Option to resubscribe if it was a mistake

## Future Migration Path

When you're ready for custom UI (approach #3):

1. **Keep Postmark headers** - For email client unsubscribe buttons
2. **Add your custom link** - In the email footer
3. **Create custom pages** - For better branding
4. **Sync both ways** - Your unsubscribes → Postmark API

## Monitoring

Check these regularly:
- Postmark Dashboard → Suppressions tab
- Your database: `SELECT COUNT(*), reason FROM email_suppressions GROUP BY reason`
- Webhook logs in Postmark → Activity

## Common Issues

**Webhook not firing?**
- Check webhook URL is publicly accessible
- Verify no auth middleware blocking `/api/webhooks/postmark`
- Check Postmark webhook logs for errors

**Suppressions not syncing?**
- Check server logs for webhook errors
- Verify EmailSuppression table exists
- Make sure email addresses are lowercased

## Testing Checklist

- [ ] Send test email with unsubscribe link
- [ ] Click unsubscribe and complete flow
- [ ] Verify suppression in database
- [ ] Try sending to suppressed email (should fail)
- [ ] Check Postmark suppression list matches local

## That's It!

You now have compliant unsubscribe functionality with zero custom UI needed. When you're ready to customize the experience, we can build on top of this foundation.