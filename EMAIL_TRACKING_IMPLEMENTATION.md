# Email Tracking Implementation Guide

## Custom Tracking Pixel Implementation

### 1. **Tracking Pixel Server Setup**

```javascript
// utils/emailTracking.js
const crypto = require('crypto');

// Generate unique tracking ID for each email
const generateTrackingId = (emailSendId) => {
  return crypto.createHash('sha256')
    .update(`${emailSendId}-${Date.now()}`)
    .digest('hex')
    .substring(0, 16);
};

// Middleware for tracking pixel
const trackingPixelMiddleware = async (req, res) => {
  const { trackingId } = req.params;
  
  try {
    // Log the open event
    await db.query(`
      UPDATE email_sends 
      SET opened_at = COALESCE(opened_at, NOW()),
          open_count = COALESCE(open_count, 0) + 1
      WHERE tracking_id = $1
    `, [trackingId]);

    // Record detailed event
    await db.query(`
      INSERT INTO email_events (email_send_id, event_type, event_data)
      SELECT id, 'open', $2::jsonb
      FROM email_sends
      WHERE tracking_id = $1
    `, [trackingId, JSON.stringify({
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    })]);
  } catch (error) {
    console.error('Tracking error:', error);
  }

  // Return 1x1 transparent pixel
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Expires': '0',
    'Pragma': 'no-cache'
  });
  
  res.end(pixel);
};
```

### 2. **Click Tracking Implementation**

```javascript
// utils/clickTracking.js
const trackClick = async (req, res) => {
  const { trackingId, linkId } = req.params;
  const { url } = req.query;
  
  try {
    // Log click event
    await db.query(`
      UPDATE email_sends 
      SET clicked_at = COALESCE(clicked_at, NOW()),
          click_count = COALESCE(click_count, 0) + 1
      WHERE tracking_id = $1
    `, [trackingId]);

    // Record detailed click event
    await db.query(`
      INSERT INTO email_events (email_send_id, event_type, event_data)
      SELECT id, 'click', $2::jsonb
      FROM email_sends
      WHERE tracking_id = $1
    `, [trackingId, JSON.stringify({
      linkId,
      url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    })]);
  } catch (error) {
    console.error('Click tracking error:', error);
  }

  // Redirect to actual URL
  res.redirect(url || '/');
};

// Function to wrap links in tracking URLs
const wrapLinksForTracking = (html, trackingId) => {
  return html.replace(
    /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi,
    (match, attributes, url) => {
      // Skip mailto and tel links
      if (url.startsWith('mailto:') || url.startsWith('tel:')) {
        return match;
      }
      
      const linkId = crypto.randomBytes(4).toString('hex');
      const trackedUrl = `${process.env.APP_URL}/track/click/${trackingId}/${linkId}?url=${encodeURIComponent(url)}`;
      
      return `<a ${attributes.replace(url, trackedUrl)}>`;
    }
  );
};
```

### 3. **Email Template Integration**

```javascript
// services/emailService.js
const sendCampaignEmail = async (campaign, contact) => {
  // Generate tracking ID
  const trackingId = generateTrackingId(`${campaign.id}-${contact.id}`);
  
  // Create email send record
  const emailSend = await db.query(`
    INSERT INTO email_sends (campaign_id, contact_id, tracking_id, status)
    VALUES ($1, $2, $3, 'pending')
    RETURNING id
  `, [campaign.id, contact.id, trackingId]);

  // Prepare email HTML
  let htmlBody = campaign.html_content;
  
  // Add tracking pixel
  const pixelUrl = `${process.env.APP_URL}/track/pixel/${trackingId}.gif`;
  htmlBody += `<img src="${pixelUrl}" width="1" height="1" border="0" alt="" style="display:block;visibility:hidden;width:0;height:0;max-width:0;max-height:0;overflow:hidden;">`;
  
  // Wrap links for click tracking
  htmlBody = wrapLinksForTracking(htmlBody, trackingId);
  
  // Send via Postmark
  const result = await postmarkClient.sendEmail({
    From: 'noreply@yourcrm.com',
    To: contact.email,
    Subject: campaign.subject,
    HtmlBody: htmlBody,
    TextBody: campaign.text_content,
    MessageStream: 'outbound',
    Metadata: {
      campaignId: campaign.id,
      contactId: contact.id,
      trackingId: trackingId
    }
  });
  
  // Update send record
  await db.query(`
    UPDATE email_sends 
    SET postmark_message_id = $1, status = 'sent', sent_at = NOW()
    WHERE id = $2
  `, [result.MessageID, emailSend.rows[0].id]);
  
  return result;
};
```

### 4. **Postmark Webhook Handler**

```javascript
// routes/webhooks.js
router.post('/webhooks/postmark', async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  
  for (const event of events) {
    try {
      const { RecordType, MessageID, Metadata } = event;
      
      // Find the email send record
      const emailSend = await db.query(`
        SELECT id FROM email_sends 
        WHERE postmark_message_id = $1
      `, [MessageID]);
      
      if (!emailSend.rows.length) continue;
      
      const emailSendId = emailSend.rows[0].id;
      
      switch (RecordType) {
        case 'Bounce':
          await db.query(`
            UPDATE email_sends 
            SET bounced_at = NOW(), status = 'bounced'
            WHERE id = $1
          `, [emailSendId]);
          
          await db.query(`
            INSERT INTO email_events (email_send_id, event_type, event_data)
            VALUES ($1, 'bounce', $2)
          `, [emailSendId, JSON.stringify({
            type: event.Type,
            description: event.Description,
            details: event.Details
          })]);
          break;
          
        case 'SpamComplaint':
          await db.query(`
            INSERT INTO email_events (email_send_id, event_type, event_data)
            VALUES ($1, 'spam_complaint', $2)
          `, [emailSendId, JSON.stringify(event)]);
          
          // Add to suppression list
          await db.query(`
            INSERT INTO email_suppressions (email, reason, created_at)
            VALUES ($1, 'spam_complaint', NOW())
            ON CONFLICT (email) DO NOTHING
          `, [event.Email]);
          break;
          
        case 'Open':
          // Postmark also tracks opens
          await db.query(`
            UPDATE email_sends 
            SET opened_at = COALESCE(opened_at, NOW())
            WHERE id = $1
          `, [emailSendId]);
          break;
          
        case 'Click':
          await db.query(`
            UPDATE email_sends 
            SET clicked_at = COALESCE(clicked_at, NOW())
            WHERE id = $1
          `, [emailSendId]);
          break;
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
    }
  }
  
  res.json({ success: true });
});
```

### 5. **Analytics Aggregation**

```javascript
// services/emailAnalytics.js
const getCampaignAnalytics = async (campaignId) => {
  const stats = await db.query(`
    SELECT 
      COUNT(*) as total_sent,
      COUNT(DISTINCT CASE WHEN opened_at IS NOT NULL THEN id END) as unique_opens,
      COUNT(DISTINCT CASE WHEN clicked_at IS NOT NULL THEN id END) as unique_clicks,
      COUNT(CASE WHEN bounced_at IS NOT NULL THEN id END) as bounces,
      SUM(open_count) as total_opens,
      SUM(click_count) as total_clicks
    FROM email_sends
    WHERE campaign_id = $1
  `, [campaignId]);
  
  const clickDetails = await db.query(`
    SELECT 
      event_data->>'url' as url,
      COUNT(*) as click_count
    FROM email_events
    WHERE event_type = 'click' 
      AND email_send_id IN (
        SELECT id FROM email_sends WHERE campaign_id = $1
      )
    GROUP BY event_data->>'url'
    ORDER BY click_count DESC
  `, [campaignId]);
  
  const hourlyStats = await db.query(`
    SELECT 
      DATE_TRUNC('hour', occurred_at) as hour,
      event_type,
      COUNT(*) as count
    FROM email_events
    WHERE email_send_id IN (
      SELECT id FROM email_sends WHERE campaign_id = $1
    )
    GROUP BY hour, event_type
    ORDER BY hour
  `, [campaignId]);
  
  return {
    summary: stats.rows[0],
    clickDetails: clickDetails.rows,
    hourlyStats: hourlyStats.rows
  };
};
```

### 6. **Privacy-Conscious Tracking**

```javascript
// middleware/privacyCompliance.js
const checkTrackingConsent = async (contact) => {
  // Check if contact has opted into tracking
  const consent = await db.query(`
    SELECT tracking_consent FROM contacts WHERE id = $1
  `, [contact.id]);
  
  return consent.rows[0]?.tracking_consent !== false;
};

// Only add tracking if consent given
const prepareEmailWithPrivacy = async (campaign, contact) => {
  const hasConsent = await checkTrackingConsent(contact);
  
  let htmlBody = campaign.html_content;
  
  if (hasConsent) {
    // Add tracking pixel and wrap links
    htmlBody = addTracking(htmlBody, contact);
  }
  
  // Always add unsubscribe link
  const unsubscribeUrl = `${process.env.APP_URL}/unsubscribe/${contact.unsubscribe_token}`;
  htmlBody += `<p style="text-align:center;font-size:12px;color:#666;">
    <a href="${unsubscribeUrl}">Unsubscribe</a> | 
    <a href="${process.env.APP_URL}/privacy">Privacy Policy</a>
  </p>`;
  
  return htmlBody;
};
```

### 7. **Real-time Analytics Dashboard**

```javascript
// components/EmailAnalyticsDashboard.jsx
import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';

const EmailAnalyticsDashboard = ({ campaignId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [realTimeOpens, setRealTimeOpens] = useState(0);
  
  useEffect(() => {
    // Initial load
    fetchAnalytics();
    
    // Set up WebSocket for real-time updates
    const ws = new WebSocket(`wss://${window.location.host}/ws/campaign/${campaignId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'open') {
        setRealTimeOpens(prev => prev + 1);
      }
      // Refresh analytics
      fetchAnalytics();
    };
    
    return () => ws.close();
  }, [campaignId]);
  
  const fetchAnalytics = async () => {
    const response = await fetch(`/api/campaigns/${campaignId}/analytics`);
    const data = await response.json();
    setAnalytics(data);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Delivery Rate"
        value={`${((analytics?.delivered / analytics?.sent) * 100).toFixed(1)}%`}
        subtitle={`${analytics?.delivered} of ${analytics?.sent} delivered`}
      />
      <MetricCard
        title="Open Rate"
        value={`${((analytics?.uniqueOpens / analytics?.delivered) * 100).toFixed(1)}%`}
        subtitle={`${analytics?.uniqueOpens} unique opens`}
        realTime={realTimeOpens > 0 ? `+${realTimeOpens} live` : null}
      />
      <MetricCard
        title="Click Rate"
        value={`${((analytics?.uniqueClicks / analytics?.delivered) * 100).toFixed(1)}%`}
        subtitle={`${analytics?.uniqueClicks} unique clicks`}
      />
      <MetricCard
        title="Bounce Rate"
        value={`${((analytics?.bounces / analytics?.sent) * 100).toFixed(1)}%`}
        subtitle={`${analytics?.bounces} bounced`}
        status={analytics?.bounces > analytics?.sent * 0.05 ? 'warning' : 'good'}
      />
    </div>
  );
};
```

This implementation provides:
- Custom tracking pixel generation and serving
- Click tracking with link wrapping
- Integration with Postmark webhooks
- Privacy-conscious tracking with consent
- Real-time analytics updates
- Detailed event logging for analysis