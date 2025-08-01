# Postmark Unsubscribe Integration

## Why Postmark Needs to Know

When someone unsubscribes through your custom unsubscribe link, Postmark won't automatically know about it. This is problematic because:

1. **Postmark's Suppression List**: They maintain their own suppression list to protect sender reputation
2. **Compliance**: They need to track unsubscribes for compliance reporting
3. **Bounces and Complaints**: They handle these automatically, but need to know about manual unsubscribes
4. **Account Health**: Unsubscribe rates affect your Postmark account standing

## Three Ways to Integrate with Postmark

### Option 1: Use Postmark's Suppression API (RECOMMENDED)

When someone unsubscribes through your link, notify Postmark immediately:

```javascript
// In your unsubscribe handler (tracking.js)
const postmark = require('postmark');
const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

async function processUnsubscribe(emailSend) {
  try {
    // 1. Add to your local suppression list (existing code)
    await EmailSuppression.findOrCreate({
      where: { email: emailSend.contact.email },
      defaults: {
        email: emailSend.contact.email,
        userId: emailSend.userId,
        reason: 'unsubscribe'
      }
    });

    // 2. Add to Postmark's suppression list
    await client.createSuppression({
      EmailAddress: emailSend.contact.email,
      SuppressionReason: 'Customer',
      Origin: 'Customer'
    });

    // 3. Update your email send record
    await emailSend.update({
      unsubscribedAt: new Date()
    });

    console.log(`Added ${emailSend.contact.email} to both local and Postmark suppression lists`);
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    throw error;
  }
}
```

### Option 2: Use Postmark's Unsubscribe Link

Let Postmark handle the entire unsubscribe flow:

```javascript
// In emailService.js sendEmail method
const emailData = {
  From: `${userName} <${userFirstName}@${this.emailDomain}>`,
  To: contactEmail,
  Subject: processedSubject,
  HtmlBody: htmlBody,
  TextBody: textBody,
  ReplyTo: userEmail,
  Tag: 'crm-email',
  TrackOpens: true,  // Let Postmark track opens
  TrackLinks: 'HtmlAndText',  // Let Postmark track clicks
  MessageStream: 'outbound',
  
  // Add unsubscribe headers
  Headers: [
    {
      Name: "List-Unsubscribe",
      Value: `<https://your-domain.com/unsubscribe/{{{pm:unsubscribe_token}}>` // Postmark token
    },
    {
      Name: "List-Unsubscribe-Post",
      Value: "List-Unsubscribe=One-Click"
    }
  ],
  
  // Let Postmark add the unsubscribe link
  TemplateModel: {
    unsubscribe_url: "{{pm:unsubscribe_url}}"  // Postmark will replace this
  }
};

// In your email template, add:
// <a href="{{{unsubscribe_url}}}">Unsubscribe</a>
```

Then set up a webhook to sync their suppressions back to your database:

```javascript
// webhook endpoint: /api/webhooks/postmark
router.post('/webhooks/postmark', async (req, res) => {
  const { RecordType, Email, SuppressionReason } = req.body;
  
  if (RecordType === 'SubscriptionChange') {
    // Sync to your local suppression list
    await EmailSuppression.findOrCreate({
      where: { email: Email },
      defaults: {
        email: Email,
        reason: SuppressionReason === 'ManualSuppression' ? 'unsubscribe' : 'complaint'
      }
    });
  }
  
  res.json({ received: true });
});
```

### Option 3: Hybrid Approach (BEST OF BOTH WORLDS)

Use your own unsubscribe link but sync with Postmark:

```javascript
// 1. Add both your link AND Postmark headers
async sendEmail({ ...params }) {
  // ... existing code ...
  
  // Add your custom unsubscribe footer
  const footerResult = this.addUnsubscribeFooter(htmlBody, textBody, trackingId, contactEmail);
  htmlBody = footerResult.html;
  textBody = footerResult.text;
  
  // Also add Postmark headers for email clients that support it
  const emailData = {
    // ... existing fields ...
    Headers: [
      {
        Name: "List-Unsubscribe",
        Value: `<${this.appUrl}/api/track/unsubscribe/${trackingId}>`
      },
      {
        Name: "List-Unsubscribe-Post",
        Value: "List-Unsubscribe=One-Click"
      }
    ]
  };
}

// 2. Update your unsubscribe handler to sync with Postmark
router.get('/track/unsubscribe/:trackingId', async (req, res) => {
  // ... existing code ...
  
  // Add to Postmark suppression list
  const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
  await postmarkClient.createSuppression({
    EmailAddress: emailSend.contact.email,
    SuppressionReason: 'Customer',
    Origin: 'Customer'
  });
  
  // ... rest of your code ...
});
```

## Implementation Steps

### Step 1: Install Postmark SDK
```bash
npm install postmark
```

### Step 2: Update Unsubscribe Handler
```javascript
// backend/routes/tracking.js
const postmark = require('postmark');
const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

// Update the unsubscribe endpoint
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
      // 1. Update your database
      await emailSend.update({
        unsubscribedAt: new Date()
      });

      // 2. Add to your suppression list
      await EmailSuppression.findOrCreate({
        where: { email: emailSend.contact.email },
        defaults: {
          email: emailSend.contact.email,
          userId: emailSend.userId,
          reason: 'unsubscribe'
        }
      });

      // 3. ADD TO POSTMARK SUPPRESSION LIST - THIS IS THE KEY PART
      try {
        await postmarkClient.createSuppression({
          EmailAddress: emailSend.contact.email,
          SuppressionReason: 'Customer',
          Origin: 'Customer'
        });
        console.log(`Added ${emailSend.contact.email} to Postmark suppression list`);
      } catch (postmarkError) {
        console.error('Failed to add to Postmark suppression:', postmarkError);
        // Continue even if Postmark fails - don't break the user experience
      }

      // 4. Log the event
      await EmailEvent.create({
        emailSendId: emailSend.id,
        eventType: 'unsubscribe',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        eventData: {
          timestamp: new Date()
        }
      });

      // Redirect to success page
      res.redirect(`${process.env.CLIENT_URL}/unsubscribe-success`);
    } else {
      res.status(404).send('Invalid unsubscribe link');
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send('Error processing unsubscribe request');
  }
});
```

### Step 3: Sync Existing Suppressions (One-time)

If you have existing suppressions, sync them to Postmark:

```javascript
// One-time sync script
async function syncSuppressionsToPostmark() {
  const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
  
  const localSuppressions = await EmailSuppression.findAll({
    where: { reason: 'unsubscribe' }
  });
  
  for (const suppression of localSuppressions) {
    try {
      await postmarkClient.createSuppression({
        EmailAddress: suppression.email,
        SuppressionReason: 'Customer',
        Origin: 'Customer'
      });
      console.log(`Synced ${suppression.email} to Postmark`);
    } catch (error) {
      if (error.code === 406) {
        console.log(`${suppression.email} already in Postmark suppression list`);
      } else {
        console.error(`Failed to sync ${suppression.email}:`, error);
      }
    }
  }
}
```

### Step 4: Handle Postmark Suppressions

Set up a webhook to catch suppressions that happen through Postmark (bounces, complaints):

```javascript
// backend/routes/webhooks.js
router.post('/webhooks/postmark', async (req, res) => {
  const { RecordType, Email, SuppressionReason, Origin } = req.body;
  
  console.log('Postmark webhook received:', { RecordType, Email, SuppressionReason });
  
  if (RecordType === 'SubscriptionChange') {
    let reason = 'manual';
    if (SuppressionReason === 'SpamComplaint') reason = 'spam_complaint';
    if (SuppressionReason === 'HardBounce') reason = 'hard_bounce';
    if (SuppressionReason === 'ManualSuppression') reason = 'unsubscribe';
    
    await EmailSuppression.findOrCreate({
      where: { email: Email },
      defaults: {
        email: Email,
        reason: reason,
        // Note: we don't have userId from Postmark webhook
      }
    });
    
    console.log(`Synced Postmark suppression for ${Email} (${reason})`);
  }
  
  res.json({ received: true });
});
```

## Testing Postmark Integration

1. **Test Suppression Addition**:
```javascript
// Test script
const postmark = require('postmark');
const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

// Add test suppression
await client.createSuppression({
  EmailAddress: 'test@example.com',
  SuppressionReason: 'Customer',
  Origin: 'Customer'
});

// List suppressions to verify
const suppressions = await client.getSuppressions();
console.log(suppressions);
```

2. **Check if Email is Suppressed**:
```javascript
// Before sending email, check both lists
async checkSuppression(email) {
  // Check local list
  const localSuppression = await EmailSuppression.findOne({
    where: { email: email.toLowerCase() }
  });
  
  if (localSuppression) return true;
  
  // Also check Postmark (optional, for redundancy)
  try {
    const suppressions = await postmarkClient.getSuppressions({
      EmailAddress: email
    });
    return suppressions.TotalCount > 0;
  } catch (error) {
    console.error('Error checking Postmark suppressions:', error);
    return false;
  }
}
```

## Important Notes

1. **API Limits**: Postmark has rate limits on their API. Batch operations when possible.

2. **Error Handling**: Always handle Postmark API failures gracefully - don't let it break your unsubscribe flow.

3. **Two-way Sync**: 
   - Your unsubscribes → Postmark (via API)
   - Postmark bounces/complaints → Your database (via webhook)

4. **Testing**: Use Postmark's test API key for development to avoid affecting production suppressions.

5. **Suppression Types**:
   - `Customer`: Manual unsubscribes
   - `HardBounce`: Invalid email addresses
   - `SpamComplaint`: Marked as spam
   - `ManualSuppression`: Added by you via API

## Quick Implementation

The minimal change to make Postmark aware of unsubscribes:

```javascript
// Add this to your existing unsubscribe handler:
const postmark = require('postmark');
const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

// After your existing suppression logic, add:
await client.createSuppression({
  EmailAddress: emailSend.contact.email,
  SuppressionReason: 'Customer',
  Origin: 'Customer'
}).catch(err => console.error('Postmark sync failed:', err));
```

That's it! This ensures Postmark knows about every unsubscribe while keeping your existing system intact.