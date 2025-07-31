# Backend AI Instructions - Email Feature Implementation

## 🎯 Your Mission
Implement the backend email functionality for our CRM application. The frontend AI is building the UI components in parallel. You need to create the API endpoints, database schema, and Postmark integration.

## 📁 Codebase Overview

### Project Structure
```
crm-app/
├── backend/
│   ├── routes/          # API route files
│   ├── models/          # Sequelize models
│   ├── middleware/      # Auth middleware is here
│   ├── migrations/      # Database migrations
│   ├── config/
│   │   └── database.js  # Database configuration
│   └── server.js        # Main server file
├── frontend/            # React app (other AI is working here)
└── package.json         # Root package.json
```

### Tech Stack
- **Backend**: Node.js, Express, PostgreSQL, Sequelize ORM
- **Authentication**: JWT tokens (already implemented)
- **Deployment**: Heroku
- **Database**: PostgreSQL on Heroku

### Key Existing Files You'll Need

1. **Authentication Middleware**: `backend/middleware/auth.js`
   - Use `authMiddleware` on protected routes
   - Provides `req.user` with user info

2. **Database Models**: 
   - `backend/models/User.js` - User model
   - `backend/models/Contact.js` - Contact model
   - Look at these for Sequelize patterns

3. **Existing Routes Pattern**: Check `backend/routes/contacts.js` for examples

## 🚀 Implementation Steps

### Step 1: Create Database Migration
```bash
cd backend
npx sequelize-cli migration:generate --name create-email-sends
```

Edit the generated file with the schema from `BACKEND_EMAIL_TASKS.md`.

### Step 2: Run Migration Locally
```bash
# Make sure PostgreSQL is running locally
npx sequelize-cli db:migrate
```

### Step 3: Create EmailSend Model
Follow the pattern in `backend/models/Contact.js` to create `backend/models/EmailSend.js`.

### Step 4: Install Postmark
```bash
cd backend
npm install postmark
```

### Step 5: Add Environment Variables
Add to `backend/.env`:
```
POSTMARK_API_KEY=your-test-key-here
EMAIL_DOMAIN=notifications.crmapp.io
```

### Step 6: Create Email Routes
Create `backend/routes/emails.js` following the API contract in `BACKEND_EMAIL_TASKS.md`.

### Step 7: Register Routes
In `backend/server.js`, add:
```javascript
app.use('/api/emails', require('./routes/emails'));
app.use('/api/webhooks/postmark', require('./routes/emails')); // If webhook is in same file
```

## 🔧 Git Workflow

### Initial Setup
```bash
# Create your branch
git checkout -b feature/email-backend

# Make sure you're up to date
git pull origin main
```

### During Development
```bash
# Commit frequently
git add .
git commit -m "feat: Add email send endpoint"

# Push to your branch
git push origin feature/email-backend
```

### Testing Your Changes
```bash
# Run the backend locally
cd backend
npm run dev

# Test with Postman or curl
curl -X POST http://localhost:5000/api/emails/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactId": 1, "subject": "Test", "message": "Hello"}'
```

## 🚢 Heroku Deployment

### Add Postmark API Key to Heroku
```bash
heroku config:set POSTMARK_API_KEY=your-production-key --app maggie-crm
heroku config:set EMAIL_DOMAIN=notifications.crmapp.io --app maggie-crm
```

### Run Migrations on Heroku
```bash
heroku run npx sequelize-cli db:migrate --app maggie-crm
```

### Deploy Your Branch
```bash
# First merge to main
git checkout main
git merge feature/email-backend
git push origin main

# Deploy to Heroku
git push heroku main
```

### Monitor Logs
```bash
heroku logs --tail --app maggie-crm
```

## ⚠️ Important Notes

1. **Authentication**: All email endpoints except webhooks need `authMiddleware`

2. **Data Validation**: Ensure users can only send emails to their own contacts:
   ```javascript
   const contact = await Contact.findOne({
     where: { id: contactId, userId: req.user.id }
   });
   ```

3. **Error Handling**: Return consistent error responses:
   ```javascript
   res.status(400).json({ error: 'Contact not found' });
   ```

4. **Postmark From Address**: Must use your verified domain:
   ```javascript
   From: `${userName} <noreply@${process.env.EMAIL_DOMAIN}>`
   ```

5. **Testing**: Postmark has a test API key that doesn't send real emails

## 📊 Database Connection

Local PostgreSQL should be running. The app connects using:
```javascript
// backend/config/database.js
development: {
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || 'crm_development',
  host: process.env.DB_HOST || 'localhost',
  dialect: 'postgres'
}
```

## 🧪 Testing Checklist

- [ ] Can create EmailSend record in database
- [ ] Send endpoint requires authentication
- [ ] Send endpoint validates contact ownership
- [ ] Postmark integration sends email
- [ ] Email history returns only user's emails
- [ ] Webhook updates email status
- [ ] Proper error messages for failures

## 🤝 Coordination Points

The frontend AI expects these exact response formats:

**Send Email Success:**
```json
{
  "success": true,
  "emailId": 123,
  "messageId": "postmark-message-id-here"
}
```

**Email History:**
```json
[{
  "id": 123,
  "subject": "Follow up",
  "message": "Hi there...",
  "status": "sent",
  "sentAt": "2024-01-15T10:30:00.000Z",
  "openedAt": null,
  "bouncedAt": null
}]
```

## 🆘 Common Issues

1. **Migration fails**: Check PostgreSQL is running
2. **Postmark error**: Check API key is set correctly
3. **401 Unauthorized**: Check auth token is included
4. **Contact not found**: Verify contact belongs to user

## 📞 Communication

Please provide updates on:
1. When each endpoint is ready for testing
2. Any blockers or questions
3. When you're ready to merge

Good luck! The frontend AI is building the UI components that will consume your APIs.