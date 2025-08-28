const { sequelize } = require('../models');

async function createEmailTemplatesTables() {
  try {
    console.log('📧 Creating email template tables...\n');
    
    // Create email_templates table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" UUID NOT NULL REFERENCES organizations(id),
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        design_json JSONB,
        html_output TEXT,
        category VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Created email_templates table');
    
    // Create email_campaigns table for broadcast emails
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organizationId" UUID NOT NULL REFERENCES organizations(id),
        name VARCHAR(255) NOT NULL,
        template_id UUID REFERENCES email_templates(id),
        subject VARCHAR(255),
        from_email VARCHAR(255),
        from_name VARCHAR(255),
        reply_to VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        scheduled_at TIMESTAMP WITH TIME ZONE,
        sent_at TIMESTAMP WITH TIME ZONE,
        recipients_count INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        opened_count INTEGER DEFAULT 0,
        clicked_count INTEGER DEFAULT 0,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Created email_campaigns table');
    
    // Create campaign_recipients table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        contact_id UUID NOT NULL REFERENCES contacts(id),
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP WITH TIME ZONE,
        opened_at TIMESTAMP WITH TIME ZONE,
        clicked_at TIMESTAMP WITH TIME ZONE,
        unsubscribed_at TIMESTAMP WITH TIME ZONE,
        bounced_at TIMESTAMP WITH TIME ZONE,
        postmark_message_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Created campaign_recipients table');
    
    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_email_templates_org 
      ON email_templates("organizationId");
      
      CREATE INDEX IF NOT EXISTS idx_email_campaigns_org 
      ON email_campaigns("organizationId");
      
      CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign 
      ON campaign_recipients(campaign_id);
      
      CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact 
      ON campaign_recipients(contact_id);
    `);
    console.log('✅ Created indexes');
    
    // Add unsubscribe column to contacts if it doesn't exist
    await sequelize.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS email_unsubscribed_at TIMESTAMP WITH TIME ZONE
    `).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('Column email_unsubscribed already exists');
      } else throw err;
    });
    console.log('✅ Added unsubscribe columns to contacts');
    
    console.log('\n✨ Successfully created all email template tables!');
    console.log('\nTables created:');
    console.log('  - email_templates');
    console.log('  - email_campaigns');
    console.log('  - campaign_recipients');
    console.log('  - Added unsubscribe tracking to contacts');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createEmailTemplatesTables();