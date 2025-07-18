#!/bin/bash

echo "🚀 CRM Killer Deployment Helper"
echo "==============================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Git not initialized. Run 'git init' first."
    exit 1
fi

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Installing..."
    echo ""
    echo "On macOS: brew tap heroku/brew && brew install heroku"
    echo "On Windows: Download from https://devcenter.heroku.com/articles/heroku-cli"
    echo "On Linux: curl https://cli-assets.heroku.com/install.sh | sh"
    echo ""
    exit 1
fi

echo "✅ Prerequisites checked!"
echo ""

# Get app name
read -p "Enter your app name (e.g., my-company-crm): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "❌ App name is required!"
    exit 1
fi

echo ""
echo "Creating Heroku app: $APP_NAME"
heroku create $APP_NAME

echo ""
echo "Adding PostgreSQL database..."
heroku addons:create heroku-postgresql:mini

echo ""
echo "Setting environment variables..."
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
heroku config:set NODE_ENV=production
heroku config:set NPM_CONFIG_PRODUCTION=false

echo ""
echo "Deploying to Heroku..."
git push heroku main

echo ""
echo "Running database migrations..."
heroku run npx sequelize-cli db:migrate

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Your CRM is live at: https://$APP_NAME.herokuapp.com"
echo ""
echo "Opening your app..."
heroku open

echo ""
echo "Next steps:"
echo "1. Click 'Create a new account' to register"
echo "2. Start adding contacts"
echo "3. Create custom fields for your business"
echo "4. Never pay per-user fees again! 🎯"