# Deployment Guide

This guide will walk you through deploying your CRM to Heroku.

## Prerequisites

- A Heroku account (free at heroku.com)
- A credit card for Heroku verification (no charges for free tier)
- 10 minutes of your time

## One-Click Deployment

### Step 1: Deploy to Heroku

1. Click the "Deploy to Heroku" button in the README
2. You'll be redirected to Heroku's deployment page
3. If not logged in, create a free Heroku account

### Step 2: Configure Your App

1. **App Name**: Choose a unique name for your CRM (e.g., "yourcompany-crm")
   - This will be your URL: `yourcompany-crm.herokuapp.com`
2. **Region**: Select the region closest to you
3. **Config Vars**: These are automatically set:
   - `JWT_SECRET`: Auto-generated secure key
   - `SESSION_SECRET`: Auto-generated secure key
   - `NODE_ENV`: Set to "production"

### Step 3: Deploy

1. Click "Deploy app" button
2. Wait 3-5 minutes for deployment to complete
3. You'll see build logs showing progress
4. When complete, click "View" to open your CRM

### Step 4: Initial Setup

1. Navigate to your CRM URL
2. Click "Create a new account"
3. Fill in your details:
   - First Name
   - Last Name
   - Company Name (optional)
   - Email (this will be your login)
   - Password (minimum 6 characters)
4. After registration, you'll be logged in automatically

## Manual Deployment

If you prefer more control over the deployment process:

### Prerequisites

- Git installed on your computer
- Heroku CLI installed
- PostgreSQL database (local or cloud)

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/crm-killer.git
cd crm-killer
```

2. **Create a Heroku app**
```bash
heroku create your-app-name
```

3. **Add PostgreSQL**
```bash
heroku addons:create heroku-postgresql:mini
```

4. **Set environment variables**
```bash
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
heroku config:set NODE_ENV=production
heroku config:set NPM_CONFIG_PRODUCTION=false
```

5. **Deploy**
```bash
git push heroku main
```

6. **Run database migrations**
```bash
heroku run npx sequelize-cli db:migrate
```

7. **Open your app**
```bash
heroku open
```

## Post-Deployment

### Custom Domain

To use your own domain:

1. In Heroku dashboard, go to Settings
2. Scroll to "Domains" section
3. Click "Add domain"
4. Follow the instructions to configure your DNS

### SSL Certificate

SSL is automatically provided by Heroku for:
- `*.herokuapp.com` domains
- Custom domains (via Automated Certificate Management)

### Scaling

As your business grows:

1. **Upgrade dyno**: Settings → Dyno Type → Choose plan
2. **Upgrade database**: Resources → Heroku Postgres → Upgrade
3. **Add more dynos**: Resources → Change Dyno Quantity

### Monitoring

1. **Application logs**: `heroku logs --tail`
2. **Metrics**: Heroku dashboard → Metrics tab
3. **Database**: Resources → Heroku Postgres → View

## Troubleshooting

### Build Fails

1. Check build logs for errors
2. Ensure all dependencies are in `package.json`
3. Try deploying again

### Database Connection Issues

1. Check if addon is provisioned: `heroku addons`
2. Verify DATABASE_URL: `heroku config:get DATABASE_URL`
3. Restart app: `heroku restart`

### Application Errors

1. Check logs: `heroku logs --tail`
2. Verify environment variables: `heroku config`
3. Run diagnostics: `heroku run node -e "console.log(process.env)"`

### Reset Database

If needed, you can reset your database:
```bash
heroku pg:reset DATABASE_URL --confirm your-app-name
heroku run npx sequelize-cli db:migrate
```

## Backup Strategy

### Automatic Backups

Heroku Postgres includes:
- Daily automatic backups (retained for 7 days)
- On-demand backups via dashboard

### Manual Backup

```bash
heroku pg:backups:capture
heroku pg:backups:download
```

### Export Data

Your CRM includes built-in export functionality:
1. Go to Contacts page
2. Click "Export" button
3. Choose format (CSV, JSON)

## Updates and Maintenance

### Updating Your CRM

1. Pull latest changes from repository
2. Test locally
3. Deploy to Heroku:
```bash
git push heroku main
```

### Database Migrations

After updating models:
```bash
heroku run npx sequelize-cli db:migrate
```

### Maintenance Mode

During updates:
```bash
heroku maintenance:on
# Do your updates
heroku maintenance:off
```

## Cost Management

### Free Tier Limits

- **Dyno**: 550 hours/month (enough for 1 app)
- **Database**: 10,000 rows
- **Storage**: 512 MB

### When to Upgrade

- More than 10,000 contacts → Upgrade database
- High traffic → Upgrade to Hobby dynos
- Need 24/7 uptime → Upgrade to paid plan

### Cost Optimization

1. Use Heroku Scheduler for batch jobs
2. Implement caching for frequently accessed data
3. Optimize database queries
4. Use CDN for static assets

## Security Best Practices

1. **Regular Updates**: Keep dependencies updated
2. **Strong Passwords**: Enforce password complexity
3. **2FA**: Enable two-factor authentication on Heroku
4. **Access Control**: Limit who can deploy
5. **Audit Logs**: Monitor access and changes
6. **Backups**: Regular automated backups
7. **SSL**: Always use HTTPS

## Getting Help

- **Heroku Support**: help.heroku.com
- **CRM Issues**: GitHub Issues page
- **Community**: Join our Slack channel
- **Email**: support@example.com

Remember: You own this CRM. You can modify, enhance, and scale it however you need. No vendor lock-in, no monthly fees per user, just your business and your data.