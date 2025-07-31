# Backend Email Implementation Tasks

## Overview
Build email sending functionality using Postmark for the CRM application.

## Environment Setup
- Postmark API Key needed: `POSTMARK_API_KEY`
- Email domain needed: `EMAIL_DOMAIN` (e.g., "mail.yourcrmapp.io")

## Task 1: Database Migration
Create migration file: `backend/migrations/[timestamp]-create-email-tables.js`

```sql
CREATE TABLE email_sends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "Users"(id),
  contact_id INTEGER REFERENCES "Contacts"(id),
  postmark_message_id VARCHAR(255) UNIQUE,
  subject VARCHAR(255),
  message TEXT,
  status VARCHAR(50) DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  bounced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_sends_postmark_id ON email_sends(postmark_message_id);
CREATE INDEX idx_email_sends_contact_id ON email_sends(contact_id);
```

## Task 2: Sequelize Model
Create file: `backend/models/EmailSend.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const EmailSend = sequelize.define('EmailSend', {
    userId: {
      type: DataTypes.INTEGER,
      references: { model: 'Users', key: 'id' }
    },
    contactId: {
      type: DataTypes.INTEGER,
      references: { model: 'Contacts', key: 'id' }
    },
    postmarkMessageId: DataTypes.STRING,
    subject: DataTypes.STRING,
    message: DataTypes.TEXT,
    status: {
      type: DataTypes.STRING,
      defaultValue: 'sent'
    },
    sentAt: DataTypes.DATE,
    openedAt: DataTypes.DATE,
    bouncedAt: DataTypes.DATE
  });

  EmailSend.associate = (models) => {
    EmailSend.belongsTo(models.User);
    EmailSend.belongsTo(models.Contact);
  };

  return EmailSend;
};
```

## Task 3: Email Routes
Create file: `backend/routes/emails.js`

### Required Endpoints:

#### 1. Send Email
```
POST /api/emails/send
Headers: Authorization: Bearer [token]
Body: {
  contactId: 123,
  subject: "Follow up",
  message: "Hi there..."
}
Response: {
  success: true,
  emailId: 456,
  messageId: "postmark-message-id"
}
```

#### 2. Get Email History
```
GET /api/emails/contact/:contactId
Headers: Authorization: Bearer [token]
Response: [{
  id: 456,
  subject: "Follow up",
  message: "Hi there...",
  status: "sent",
  sentAt: "2024-01-15T10:30:00Z",
  openedAt: null,
  bouncedAt: null
}]
```

#### 3. Webhook Handler
```
POST /api/webhooks/postmark
Body: Postmark webhook payload
Response: { received: true }
```

## Task 4: Email Service
Create file: `backend/services/emailService.js`

Required functionality:
1. Send email using Postmark
2. Use "from" address: `${userName} <noreply@${EMAIL_DOMAIN}>`
3. Set "replyTo" as user's actual email
4. Store email record with postmarkMessageId
5. Handle errors gracefully

## Task 5: Webhook Processing
In webhook handler:
1. Process "Open" events - update openedAt timestamp
2. Process "Bounce" events - update bouncedAt timestamp and status
3. Verify webhook authenticity if possible

## Dependencies to Install
```bash
npm install postmark
```

## Testing Checklist
- [ ] Can send email via API endpoint
- [ ] Email history returns correct data
- [ ] Webhook updates email status
- [ ] Authentication is required for send/history endpoints
- [ ] Errors return appropriate status codes

## Important Notes
1. All emails should be sent "via" the app domain, not from user's email
2. ReplyTo should be set to the user's actual email
3. Track the postmarkMessageId for webhook correlation
4. Ensure contactId belongs to the authenticated user

## API Contract (Frontend will expect):
```typescript
// Send Email
interface SendEmailRequest {
  contactId: number;
  subject: string;
  message: string;
}

interface SendEmailResponse {
  success: boolean;
  emailId: number;
  messageId: string;
}

// Email History
interface EmailRecord {
  id: number;
  subject: string;
  message: string;
  status: 'sent' | 'bounced' | 'delivered';
  sentAt: string;
  openedAt: string | null;
  bouncedAt: string | null;
}
```