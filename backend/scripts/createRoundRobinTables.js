const { sequelize } = require('../models');

async function createRoundRobinTables() {
  try {
    console.log('Creating Round Robin tables...');
    
    // Create assignment_rules table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS assignment_rules (
        id UUID PRIMARY KEY,
        "organization_id" UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        conditions JSONB DEFAULT '{}',
        "is_active" BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 100,
        "assignmentMethod" VARCHAR(255) DEFAULT 'round_robin',
        "requireStateMatch" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    console.log('✅ Created assignment_rules table');

    // Create round_robin_queues table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS round_robin_queues (
        id UUID PRIMARY KEY,
        "ruleId" UUID NOT NULL REFERENCES assignment_rules(id) ON DELETE CASCADE,
        "userId" UUID NOT NULL,
        "assignmentCount" INTEGER DEFAULT 0,
        "lastAssignedAt" TIMESTAMP WITH TIME ZONE,
        "is_active" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    console.log('✅ Created round_robin_queues table');

    // Create assignments table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY,
        "contactId" UUID NOT NULL,
        "assignedTo" UUID NOT NULL,
        "assignedBy" UUID,
        "assignedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(255) DEFAULT 'pending',
        notes TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    console.log('✅ Created assignments table');

    // Create indexes
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assignment_rules_org ON assignment_rules("organization_id")`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_round_robin_queues_rule ON round_robin_queues("ruleId")`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assignments_contact ON assignments("contactId")`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_assignments_assigned ON assignments("assignedTo")`);
    
    console.log('✅ All Round Robin tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createRoundRobinTables();