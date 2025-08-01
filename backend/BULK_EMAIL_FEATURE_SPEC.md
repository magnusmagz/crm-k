# Bulk Email Tool Specification

## Overview
A comprehensive bulk email system that allows users to send personalized email campaigns to multiple contacts using templates, with full tracking and analytics.

## 1. Email Template System

### Template Library
- Pre-built templates for common use cases:
  - Newsletters
  - Product announcements
  - Promotional offers
  - Event invitations
  - Follow-up sequences
  - Holiday greetings

### Custom Templates
- Users can create and save their own templates
- Template categories for organization
- Version history for templates
- Clone existing templates

### Variables/Merge Tags
- Standard variables:
  - `{{firstName}}` - Contact's first name
  - `{{lastName}}` - Contact's last name
  - `{{companyName}}` - Contact's company
  - `{{email}}` - Contact's email
  - `{{title}}` - Contact's job title
  - `{{phone}}` - Contact's phone
- Custom field variables:
  - `{{customField.fieldName}}` - Any custom field value
- System variables:
  - `{{unsubscribeLink}}` - Automatic unsubscribe URL
  - `{{currentYear}}` - Current year
  - `{{campaignName}}` - Name of the campaign

### Editor Features
- Rich text editor (TinyMCE or similar)
- HTML code editor for advanced users
- Drag-and-drop template builder
- Mobile preview
- Dark mode preview

## 2. Contact Selection

### Selection Methods
1. **Select All**: Email all contacts in database
2. **Tag Filtering**: 
   - Include contacts with specific tags
   - Exclude contacts with specific tags
   - AND/OR logic for multiple tags
3. **Custom Field Filtering**:
   - Filter by any custom field
   - Operators: equals, contains, greater than, less than
   - Date range filters
4. **Activity Filtering**:
   - Last contacted date
   - Email engagement (opened/clicked in last X days)
   - Never contacted
5. **Import CSV**: Upload a list of contacts for one-time campaign
6. **Saved Segments**: Save and reuse filter combinations

### Safety Features
- Automatic exclusion of:
  - Bounced emails
  - Unsubscribed contacts
  - Suppressed emails
  - Invalid email formats
- Duplicate detection and removal
- Preview of recipient list before sending

## 3. Personalization Features

### Dynamic Content
- Conditional blocks based on contact data
- Different content for different segments
- Fallback values for missing data
- Preview with real contact data

### Smart Defaults
- "Hi {{firstName|there}}" - Uses "there" if no first name
- Company-specific content blocks
- Role-based content (for title-based targeting)

## 4. Sending Options

### Immediate Send
- Send as soon as user clicks send
- Progress indicator
- Ability to pause/cancel mid-send

### Scheduled Send
- Date and time picker
- Timezone selection:
  - Send in account timezone
  - Send in recipient's timezone
  - Optimal send time AI
- Recurring campaigns (weekly/monthly)

### Batch Sending
- Send in waves to improve deliverability
- Configurable batch size (e.g., 100 per minute)
- Automatic throttling based on provider limits

### Test Capabilities
- Send test to specific emails
- Send test with different contact data
- Spam score checking
- Rendering tests across email clients

## 5. Compliance & Safety

### Required Elements
- Unsubscribe link in every email
- Physical mailing address (CAN-SPAM)
- Clear identification of sender

### Suppression Management
- Global suppression list
- Campaign-specific exclusions
- Import suppression lists
- Bounce management

### Confirmation Flow
1. Review recipient count
2. Preview email content
3. Confirm sending cost (if applicable)
4. Final "Are you sure?" with summary

## 6. Tracking & Analytics

### Campaign Level Metrics
- **Delivery Metrics**:
  - Total sent
  - Delivered
  - Bounced (soft/hard)
  - Delivery rate
- **Engagement Metrics**:
  - Unique opens
  - Total opens
  - Open rate
  - Click-through rate
  - Click-to-open rate
- **Response Metrics**:
  - Unsubscribes
  - Complaints/spam reports
  - Replies

### Individual Contact Tracking
- Who opened and when
- Which links clicked
- Device and email client used
- Geographic location (based on IP)
- Time spent reading

### Link Analytics
- Click count per link
- Unique clicks per link
- Click heatmap
- A/B test results

## 7. Database Schema

```sql
-- Email Templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subject VARCHAR(500) NOT NULL,
    preview_text VARCHAR(255),
    html_body TEXT NOT NULL,
    text_body TEXT,
    variables_used JSONB, -- ["firstName", "companyName", etc]
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Campaigns
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    template_id UUID REFERENCES email_templates(id),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL, -- Can be different from template
    status VARCHAR(50) NOT NULL, -- draft, scheduled, sending, sent, paused, cancelled
    recipient_filters JSONB, -- Stored filter criteria
    scheduled_for TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    recipient_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    settings JSONB, -- Batch size, timezone handling, etc
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Recipients
CREATE TABLE campaign_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- pending, sent, delivered, opened, clicked, bounced, unsubscribed
    personalized_data JSONB, -- Snapshot of merge variables at send time
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    first_clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    bounce_type VARCHAR(50), -- hard, soft
    unsubscribed_at TIMESTAMP,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link Tracking
CREATE TABLE campaign_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id),
    original_url TEXT NOT NULL,
    tracking_code VARCHAR(100) UNIQUE NOT NULL,
    click_count INTEGER DEFAULT 0,
    unique_click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link Clicks
CREATE TABLE campaign_link_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_link_id UUID NOT NULL REFERENCES campaign_links(id),
    recipient_id UUID NOT NULL REFERENCES campaign_recipients(id),
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    country VARCHAR(2),
    city VARCHAR(255)
);

-- Email Suppressions (Global)
CREATE TABLE email_suppressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    reason VARCHAR(50) NOT NULL, -- bounced, unsubscribed, complained, manual
    campaign_id UUID REFERENCES email_campaigns(id), -- Which campaign caused it
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved Segments
CREATE TABLE saved_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    filters JSONB NOT NULL,
    contact_count INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 8. UI/UX Flow

### Campaign Creation Wizard

#### Step 1: Campaign Setup
- Campaign name (internal reference)
- Campaign type (one-time, recurring)
- Description/notes

#### Step 2: Choose Template
- Template gallery with preview
- Search/filter templates
- "Start from scratch" option
- "Use previous campaign" option

#### Step 3: Customize Content
- Edit subject line
- Edit preview text
- Modify template content
- Add/remove sections
- Preview with sample data

#### Step 4: Select Recipients
- Choose selection method
- Apply filters
- See live count update
- Preview recipient list
- Save as segment option

#### Step 5: Personalization Check
- Review merge variables
- Set fallback values
- Preview with different contacts
- Test personalization

#### Step 6: Configure Sending
- Send now or schedule
- Batch settings
- Timezone handling
- Test send option

#### Step 7: Review & Confirm
- Summary of all settings
- Recipient count
- Preview of email
- Cost estimate (if applicable)
- Compliance checklist
- Send button

### Campaign Management Dashboard
- List of all campaigns
- Status indicators
- Quick stats
- Pause/resume/cancel controls
- Duplicate campaign option

### Analytics Dashboard
- Campaign performance cards
- Engagement timeline graph
- Geographic heat map
- Device/client breakdown
- Link performance table
- Export capabilities

## 9. Advanced Features

### A/B Testing
- Subject line testing
- Content variation testing
- Send time optimization
- Automatic winner selection
- Statistical significance calculation

### Drip Campaigns
- Multi-step email sequences
- Trigger based on:
  - Time delays
  - Contact actions
  - Email engagement
- Stop conditions
- Branch logic

### Reply Management
- Reply-to address configuration
- Auto-responder setup
- Reply tracking
- Conversation threading

### Integration Features
- Webhook notifications
- Zapier integration
- API access
- Bulk import/export

## 10. Technical Implementation

### Backend Architecture
```javascript
// Queue System (using Bull or similar)
- EmailCampaignQueue: Main campaign processing
- EmailSendQueue: Individual email sending
- EmailTrackingQueue: Process opens/clicks
- AnalyticsQueue: Update statistics

// Services
- TemplateService: Template CRUD and rendering
- CampaignService: Campaign management
- PersonalizationService: Merge variable replacement
- RecipientService: Contact selection and filtering
- EmailService: Actual sending via Postmark
- TrackingService: Click/open tracking
- AnalyticsService: Statistics and reporting

// Controllers
- POST /api/campaigns - Create campaign
- GET /api/campaigns - List campaigns
- GET /api/campaigns/:id - Get campaign details
- PUT /api/campaigns/:id - Update campaign
- POST /api/campaigns/:id/send - Send campaign
- POST /api/campaigns/:id/pause - Pause sending
- POST /api/campaigns/:id/test - Send test
- GET /api/campaigns/:id/analytics - Get analytics

- GET /api/templates - List templates
- POST /api/templates - Create template
- PUT /api/templates/:id - Update template
- POST /api/templates/:id/preview - Preview with data

- POST /api/segments - Save segment
- GET /api/segments - List saved segments
- POST /api/contacts/preview - Preview filtered contacts
```

### Frontend Components
```typescript
// Main Components
- CampaignWizard: Multi-step campaign creation
- TemplateGallery: Browse and select templates
- TemplateEditor: Rich text/HTML editor
- RecipientSelector: Filter and select contacts
- CampaignDashboard: List and manage campaigns
- AnalyticsDashboard: View campaign performance

// Shared Components
- EmailPreview: Responsive email preview
- FilterBuilder: Visual query builder
- PersonalizationTester: Test merge variables
- ProgressIndicator: Show sending progress
```

### Performance Considerations
- Batch database queries for large recipient lists
- Use database views for complex filtering
- Redis caching for real-time analytics
- CDN for email assets
- Horizontal scaling for queue workers

### Security Considerations
- Rate limiting per user
- Input sanitization for templates
- XSS prevention in email content
- CSRF protection
- Audit logging for campaigns
- Encryption for sensitive data

## 11. Cost Management

### Usage Tracking
- Emails sent per month
- Storage used for templates/assets
- API calls for tracking

### Billing Integration
- Usage-based pricing tiers
- Overage handling
- Usage alerts
- Detailed billing reports

## 12. Future Enhancements

### Phase 2 Features
- SMS campaigns
- Push notification campaigns
- In-app messaging
- Marketing automation workflows
- Advanced segmentation with ML
- Predictive send time optimization
- Email template marketplace
- Team collaboration features

### Integration Roadmap
- CRM integrations
- E-commerce platform connections
- Analytics tool integration
- Customer data platform (CDP) sync

## Implementation Priority

### MVP (Phase 1)
1. Basic template system
2. Simple contact selection
3. Basic personalization
4. Immediate sending only
5. Basic tracking (opens/clicks)
6. Essential compliance features

### Phase 2
1. Advanced filtering
2. Scheduled sending
3. A/B testing
4. Detailed analytics
5. Saved segments

### Phase 3
1. Drip campaigns
2. Advanced personalization
3. Reply management
4. API/integrations
5. Team features