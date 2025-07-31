# Email Tracking Analytics Implementation Plan

## 🎯 Overview
Build comprehensive email analytics on top of the existing email infrastructure to track opens, clicks, and engagement metrics.

## 📊 Phase 1: Enhanced Database Schema (Week 1)

### 1.1 Update email_sends table
```sql
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(255) UNIQUE;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMP;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP;

CREATE INDEX idx_email_sends_tracking_id ON email_sends(tracking_id);
```

### 1.2 Create email_events table
```sql
CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id UUID REFERENCES email_sends(id),
  event_type VARCHAR(50) NOT NULL, -- open, click, bounce, spam_complaint, unsubscribe
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_events_email_send_id ON email_events(email_send_id);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_occurred_at ON email_events(occurred_at);
```

### 1.3 Create email_links table
```sql
CREATE TABLE email_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id UUID REFERENCES email_sends(id),
  link_id VARCHAR(50) UNIQUE,
  original_url TEXT NOT NULL,
  click_count INTEGER DEFAULT 0,
  first_clicked_at TIMESTAMP,
  last_clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_links_link_id ON email_links(link_id);
```

## 🔧 Phase 2: Tracking Implementation (Week 1-2)

### 2.1 Update Email Service
```javascript
// services/emailService.js - Add tracking capabilities
class EmailService {
  async sendEmailWithTracking({ userId, contactId, subject, message, enableTracking = true }) {
    // Generate tracking ID
    const trackingId = crypto.randomBytes(16).toString('hex');
    
    // Create email record with tracking ID
    const emailRecord = await EmailSend.create({
      userId,
      contactId,
      subject,
      message,
      status: 'sent',
      trackingId
    });

    // Process message for tracking
    let processedMessage = message;
    if (enableTracking) {
      // Add tracking pixel
      const pixelUrl = `${process.env.APP_URL}/api/track/pixel/${trackingId}`;
      processedMessage += `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;">`;
      
      // Wrap links for click tracking
      processedMessage = await this.wrapLinksForTracking(processedMessage, emailRecord.id, trackingId);
    }

    // Send via Postmark with processed message
    // ... existing sending logic
  }

  async wrapLinksForTracking(html, emailSendId, trackingId) {
    const $ = cheerio.load(html);
    const links = [];

    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        const linkId = crypto.randomBytes(8).toString('hex');
        const trackingUrl = `${process.env.APP_URL}/api/track/click/${trackingId}/${linkId}`;
        
        // Store original URL
        links.push({
          emailSendId,
          linkId,
          originalUrl: href
        });
        
        $(element).attr('href', trackingUrl);
      }
    });

    // Bulk insert links
    if (links.length > 0) {
      await EmailLink.bulkCreate(links);
    }

    return $.html();
  }
}
```

### 2.2 Create Tracking Routes
```javascript
// routes/tracking.js
const router = express.Router();

// Pixel tracking endpoint
router.get('/track/pixel/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  
  try {
    // Update email record
    await EmailSend.update(
      { 
        openedAt: sequelize.literal('CASE WHEN opened_at IS NULL THEN NOW() ELSE opened_at END'),
        lastOpenedAt: sequelize.literal('NOW()'),
        openCount: sequelize.literal('open_count + 1')
      },
      { where: { trackingId } }
    );

    // Log event
    const emailSend = await EmailSend.findOne({ where: { trackingId } });
    if (emailSend) {
      await EmailEvent.create({
        emailSendId: emailSend.id,
        eventType: 'open',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        eventData: {
          timestamp: new Date(),
          headers: req.headers
        }
      });
    }
  } catch (error) {
    console.error('Tracking error:', error);
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private'
  });
  res.send(pixel);
});

// Click tracking endpoint
router.get('/track/click/:trackingId/:linkId', async (req, res) => {
  const { trackingId, linkId } = req.params;
  
  try {
    // Get original URL
    const link = await EmailLink.findOne({ where: { linkId } });
    if (!link) {
      return res.redirect(process.env.CLIENT_URL);
    }

    // Update click stats
    await Promise.all([
      EmailSend.update(
        {
          clickedAt: sequelize.literal('CASE WHEN clicked_at IS NULL THEN NOW() ELSE clicked_at END'),
          clickCount: sequelize.literal('click_count + 1')
        },
        { where: { trackingId } }
      ),
      EmailLink.update(
        {
          clickCount: sequelize.literal('click_count + 1'),
          firstClickedAt: sequelize.literal('CASE WHEN first_clicked_at IS NULL THEN NOW() ELSE first_clicked_at END'),
          lastClickedAt: sequelize.literal('NOW()')
        },
        { where: { linkId } }
      )
    ]);

    // Log event
    await EmailEvent.create({
      emailSendId: link.emailSendId,
      eventType: 'click',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      eventData: {
        linkId,
        originalUrl: link.originalUrl,
        timestamp: new Date()
      }
    });

    // Redirect to original URL
    res.redirect(link.originalUrl);
  } catch (error) {
    console.error('Click tracking error:', error);
    res.redirect(process.env.CLIENT_URL);
  }
});

module.exports = router;
```

## 📈 Phase 3: Analytics API (Week 2)

### 3.1 Analytics Endpoints
```javascript
// routes/emailAnalytics.js
router.get('/analytics/overview', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  const stats = await sequelize.query(`
    SELECT 
      COUNT(*) as total_sent,
      COUNT(DISTINCT CASE WHEN opened_at IS NOT NULL THEN id END) as unique_opens,
      COUNT(DISTINCT CASE WHEN clicked_at IS NOT NULL THEN id END) as unique_clicks,
      COUNT(CASE WHEN bounced_at IS NOT NULL THEN id END) as bounces,
      SUM(open_count) as total_opens,
      SUM(click_count) as total_clicks,
      AVG(EXTRACT(EPOCH FROM (opened_at - sent_at))/3600) as avg_hours_to_open
    FROM email_sends
    WHERE user_id = :userId
      AND sent_at BETWEEN :startDate AND :endDate
  `, {
    replacements: { userId, startDate, endDate },
    type: sequelize.QueryTypes.SELECT
  });

  res.json(stats[0]);
});

router.get('/analytics/contact/:contactId', authMiddleware, async (req, res) => {
  const { contactId } = req.params;
  const userId = req.user.id;

  // Verify contact belongs to user
  const contact = await Contact.findOne({ where: { id: contactId, userId } });
  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const engagement = await sequelize.query(`
    SELECT 
      es.*,
      COUNT(DISTINCT ee.id) FILTER (WHERE ee.event_type = 'open') as open_events,
      COUNT(DISTINCT ee.id) FILTER (WHERE ee.event_type = 'click') as click_events,
      json_agg(DISTINCT el.original_url) FILTER (WHERE el.click_count > 0) as clicked_links
    FROM email_sends es
    LEFT JOIN email_events ee ON es.id = ee.email_send_id
    LEFT JOIN email_links el ON es.id = el.email_send_id
    WHERE es.contact_id = :contactId
    GROUP BY es.id
    ORDER BY es.sent_at DESC
  `, {
    replacements: { contactId },
    type: sequelize.QueryTypes.SELECT
  });

  res.json(engagement);
});

router.get('/analytics/campaign-performance', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { period = '7d' } = req.query;

  const timeframe = {
    '24h': "interval '24 hours'",
    '7d': "interval '7 days'",
    '30d': "interval '30 days'",
    '90d': "interval '90 days'"
  }[period] || "interval '7 days'";

  const performance = await sequelize.query(`
    WITH time_series AS (
      SELECT generate_series(
        date_trunc('hour', NOW() - ${timeframe}),
        date_trunc('hour', NOW()),
        '1 hour'::interval
      ) AS hour
    )
    SELECT 
      ts.hour,
      COUNT(DISTINCT es.id) FILTER (WHERE es.sent_at >= ts.hour AND es.sent_at < ts.hour + interval '1 hour') as sent,
      COUNT(DISTINCT ee.email_send_id) FILTER (WHERE ee.event_type = 'open' AND ee.occurred_at >= ts.hour AND ee.occurred_at < ts.hour + interval '1 hour') as opens,
      COUNT(DISTINCT ee.email_send_id) FILTER (WHERE ee.event_type = 'click' AND ee.occurred_at >= ts.hour AND ee.occurred_at < ts.hour + interval '1 hour') as clicks
    FROM time_series ts
    LEFT JOIN email_sends es ON es.user_id = :userId
    LEFT JOIN email_events ee ON ee.email_send_id = es.id
    GROUP BY ts.hour
    ORDER BY ts.hour
  `, {
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT
  });

  res.json(performance);
});
```

## 🎨 Phase 4: Analytics Dashboard UI (Week 3)

### 4.1 Dashboard Components
```jsx
// components/EmailAnalyticsDashboard.jsx
const EmailAnalyticsDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [period, setPeriod] = useState('7d');

  // Key metrics cards
  // Time series chart for opens/clicks
  // Top performing emails table
  // Contact engagement heatmap
  // Link click analysis
};

// components/ContactEmailEngagement.jsx
const ContactEmailEngagement = ({ contactId }) => {
  // Email history with engagement metrics
  // Open/click timeline
  // Engagement score visualization
};
```

## 🔐 Phase 5: Privacy & Compliance (Week 3-4)

### 5.1 Privacy Features
- Tracking consent management
- Option to disable tracking per contact
- GDPR compliance tools
- Unsubscribe handling

### 5.2 Data Retention
- Automatic cleanup of old tracking data
- Aggregated statistics preservation
- PII anonymization options

## 📊 Phase 6: Advanced Analytics (Week 4)

### 6.1 Engagement Scoring
```javascript
// services/engagementScoring.js
const calculateEngagementScore = async (contactId) => {
  // Factors: open rate, click rate, recency, frequency
  // Returns score 0-100
};
```

### 6.2 Predictive Analytics
- Best time to send predictions
- Subject line performance analysis
- Contact engagement predictions

## 🚀 Deployment Strategy

1. **Migration Rollout**
   - Test migrations locally
   - Deploy to staging
   - Run on production with backup

2. **Feature Flags**
   - Gradual rollout of tracking features
   - A/B testing capabilities
   - Easy rollback options

3. **Performance Monitoring**
   - Track pixel serving latency
   - Database query optimization
   - Cache implementation for analytics

## 📈 Success Metrics

- Track adoption rate of analytics features
- Monitor performance impact
- Measure user engagement with dashboards
- Track email campaign improvements

## 🔄 Maintenance Plan

- Weekly analytics data aggregation
- Monthly performance optimization
- Quarterly feature enhancements
- Regular security audits

This comprehensive plan builds on your existing email infrastructure to add powerful analytics capabilities while maintaining performance and privacy.