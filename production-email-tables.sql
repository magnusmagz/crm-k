-- Production-ready SQL for Neon database
-- Copy this ENTIRE script and run it in Neon SQL Editor

-- 1. Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    design_json JSONB,
    html_output TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create email_sends table 
CREATE TABLE IF NOT EXISTS email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contact_id UUID,
    postmark_message_id VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    tracking_id VARCHAR(255),
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    last_opened_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create email_suppressions table
CREATE TABLE IF NOT EXISTS email_suppressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    user_id UUID,
    reason VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create email_links table
CREATE TABLE IF NOT EXISTS email_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_send_id UUID NOT NULL,
    link_id VARCHAR(50) NOT NULL,
    original_url TEXT NOT NULL,
    click_count INTEGER DEFAULT 0,
    first_clicked_at TIMESTAMP WITH TIME ZONE,
    last_clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create email_events table
CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_send_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_organization_id ON email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_user_id ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_contact_id ON email_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_tracking_id ON email_sends(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_suppressions_email ON email_suppressions(email);
CREATE INDEX IF NOT EXISTS idx_email_links_email_send_id ON email_links(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_events_email_send_id ON email_events(email_send_id);

-- 7. Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sends_postmark_message_id ON email_sends(postmark_message_id) WHERE postmark_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sends_tracking_id ON email_sends(tracking_id) WHERE tracking_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_suppressions_email_unique ON email_suppressions(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_links_link_id ON email_links(link_id);

-- 8. Verify tables were created
SELECT 'Email tables created successfully!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'email_%' 
ORDER BY table_name;