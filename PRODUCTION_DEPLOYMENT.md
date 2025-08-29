# Super Admin Production Deployment Plan

## Status: ❌ NOT READY FOR PRODUCTION

### Critical Issues Found:
- Organizations table missing in production database
- isSuperAdmin column likely missing from users table
- Database performance issues (queries timing out)
- Environment variables need configuration

### Required Steps Before Deployment:

#### 1. Database Schema Migration
```bash
# Check current migration status
heroku run "npx sequelize db:migrate:status" -a maggie-crm

# Run pending migrations
heroku run "npx sequelize-cli db:migrate" -a maggie-crm

# Create organizations table script
heroku run "node backend/scripts/createOrganizationsTable.js" -a maggie-crm
```

#### 2. Update Environment Variables
```bash
# Set production CLIENT_URL (replace with your frontend domain)
heroku config:set CLIENT_URL=https://your-frontend-domain.com -a maggie-crm

# Verify all environment variables
heroku config -a maggie-crm
```

#### 3. Create Super Admin Setup Script
Need to create a script that:
- Creates default organization
- Adds isSuperAdmin column if missing
- Sets up first super admin user

#### 4. Deploy Code Changes
```bash
# Commit all changes
git add .
git commit -m "Add super admin functionality with multi-tenant architecture"

# Deploy to Heroku
git push heroku main

# Verify deployment
heroku logs --tail -a maggie-crm
```

#### 5. Post-Deployment Verification
- Test super admin login
- Verify organization management works
- Check that regular users still function correctly
- Test password reset links point to correct domain

### Timeline Estimate: 2-3 hours
### Risk Level: HIGH (database schema changes in production)

## Recommendation: 
**Wait until database issues are resolved and proper testing is completed in a staging environment.**