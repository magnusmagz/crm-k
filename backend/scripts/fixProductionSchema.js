const { sequelize, User } = require('../models');

async function fixProductionSchema() {
  try {
    console.log('🚀 Starting production schema fixes...');
    
    // 1. Add isSuperAdmin column to users table
    console.log('📝 Adding isSuperAdmin column to users table...');
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
    `);
    console.log('✅ isSuperAdmin column added');
    
    // 2. Create organizations table
    console.log('📝 Creating organizations table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        crm_name VARCHAR(255) DEFAULT 'CRM Killer',
        primary_color VARCHAR(7) DEFAULT '#6366f1',
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        settings JSONB DEFAULT '{
          "allowUserRegistration": false,
          "requireEmailVerification": true,
          "defaultUserRole": "user",
          "maxUsers": null,
          "features": {
            "roundRobin": true,
            "emailTemplates": true,
            "customFields": true,
            "recruiting": true
          }
        }'::jsonb,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(255),
        website VARCHAR(255),
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(2),
        zip_code VARCHAR(10),
        user_count INTEGER DEFAULT 0,
        contact_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Organizations table created');
    
    // 3. Add organizationId column to users table if it doesn't exist
    console.log('📝 Adding organizationId column to users table...');
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "organizationId" UUID;
    `);
    console.log('✅ organizationId column added');
    
    // 4. Add organizationId column to contacts table if it doesn't exist
    console.log('📝 Adding organizationId column to contacts table...');
    await sequelize.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS "organizationId" UUID;
    `);
    console.log('✅ organizationId column added to contacts');
    
    // 5. Create a default organization for existing users
    console.log('📝 Creating default organization...');
    const [orgResult] = await sequelize.query(`
      INSERT INTO organizations (name, crm_name, is_active, settings)
      VALUES ('Default Organization', 'CRM Killer', true, '{
        "allowUserRegistration": false,
        "requireEmailVerification": true,
        "defaultUserRole": "user",
        "maxUsers": null,
        "features": {
          "roundRobin": true,
          "emailTemplates": true,
          "customFields": true,
          "recruiting": true
        }
      }'::jsonb)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    
    let defaultOrgId;
    if (orgResult.length > 0) {
      defaultOrgId = orgResult[0].id;
      console.log('✅ Default organization created with ID:', defaultOrgId);
    } else {
      // Get existing default organization
      const [existing] = await sequelize.query(`
        SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1;
      `);
      defaultOrgId = existing[0]?.id;
      console.log('✅ Using existing default organization with ID:', defaultOrgId);
    }
    
    // 6. Assign all existing users to default organization
    if (defaultOrgId) {
      console.log('📝 Assigning existing users to default organization...');
      await sequelize.query(`
        UPDATE users 
        SET "organizationId" = $1 
        WHERE "organizationId" IS NULL;
      `, {
        bind: [defaultOrgId]
      });
      console.log('✅ Users assigned to default organization');
      
      // 7. Assign all existing contacts to default organization
      console.log('📝 Assigning existing contacts to default organization...');
      await sequelize.query(`
        UPDATE contacts 
        SET "organizationId" = $1 
        WHERE "organizationId" IS NULL;
      `, {
        bind: [defaultOrgId]
      });
      console.log('✅ Contacts assigned to default organization');
    }
    
    // 8. Create foreign key constraints
    console.log('📝 Adding foreign key constraints...');
    await sequelize.query(`
      ALTER TABLE users 
      ADD CONSTRAINT IF NOT EXISTS users_organization_fk 
      FOREIGN KEY ("organizationId") REFERENCES organizations(id);
    `);
    
    await sequelize.query(`
      ALTER TABLE contacts 
      ADD CONSTRAINT IF NOT EXISTS contacts_organization_fk 
      FOREIGN KEY ("organizationId") REFERENCES organizations(id);
    `);
    console.log('✅ Foreign key constraints added');
    
    console.log('🎉 Production schema fixes completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing production schema:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixProductionSchema()
    .then(() => {
      console.log('✅ Schema fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Schema fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixProductionSchema };