# 🚀 Heroku Deployment Instructions

Since Heroku changed their free tier, here's how to deploy:

## Option 1: Deploy Button + Manual Database

1. **Click "Deploy to Heroku"** on GitHub
2. **Enter app name** and click "Deploy app" 
3. **After deployment completes**, you'll need to add a database:
   ```bash
   heroku addons:create heroku-postgresql:mini -a YOUR-APP-NAME
   ```
   Or in Heroku Dashboard: 
   - Go to your app
   - Click "Resources" tab
   - Search for "Heroku Postgres"
   - Select a plan and provision

## Option 2: Command Line Deploy (Easier)

1. **Install Heroku CLI**:
   ```bash
   brew tap heroku/brew && brew install heroku
   ```

2. **Login**:
   ```bash
   heroku login
   ```

3. **Create and deploy**:
   ```bash
   cd /Users/maggiemae/crmkiller/crm-app
   heroku create YOUR-APP-NAME
   heroku addons:create heroku-postgresql:mini
   heroku config:set JWT_SECRET=$(openssl rand -base64 32)
   heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
   git push heroku main
   heroku open
   ```

## Option 3: Use Alternative Free Database

If Heroku's database plans require payment, use these free alternatives:

### Supabase (Recommended - 500MB free)
1. Create account at https://supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy the connection string
5. In Heroku: Settings → Config Vars → Add `DATABASE_URL` with the connection string

### Neon (1GB free)
1. Sign up at https://neon.tech
2. Create database
3. Copy connection string
4. Add to Heroku config vars

### ElephantSQL (20MB free)
1. Sign up at https://www.elephantsql.com
2. Create Tiny Turtle (free) instance
3. Copy URL
4. Add to Heroku config vars

## After Database is Connected

Your app will automatically run migrations on deploy. Just visit your app URL and create an account!

## Troubleshooting

If you see database connection errors:
1. Make sure DATABASE_URL is set in Config Vars
2. Restart your app: `heroku restart -a YOUR-APP-NAME`
3. Check logs: `heroku logs --tail -a YOUR-APP-NAME`