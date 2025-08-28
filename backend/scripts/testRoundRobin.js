require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, Contact, User } = require('../models');
const assignmentEngine = require('../services/assignmentEngine');
const { v4: uuidv4 } = require('uuid');

async function testRoundRobin() {
  try {
    console.log('\n🔄 Testing Round-Robin Auto-Assignment System\n');
    console.log('='.repeat(50));

    // Get the Sales Co. organization
    const [orgResult] = await sequelize.query(
      `SELECT id FROM organizations WHERE name = 'Sales Co.' LIMIT 1`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (!orgResult) {
      console.error('❌ Sales Co. organization not found');
      return;
    }

    const organizationId = orgResult.id;
    console.log(`✅ Found Sales Co. organization: ${organizationId}\n`);

    // Get loan officers
    const officers = await User.findAll({
      where: {
        organizationId,
        isLoanOfficer: true
      }
    });

    console.log(`Found ${officers.length} loan officers:`);
    officers.forEach(officer => {
      console.log(`  - ${officer.email} (States: ${officer.licensedStates?.join(', ') || 'None'})`);
    });
    console.log('');

    // Create a round-robin rule if it doesn't exist
    const [existingRule] = await sequelize.query(
      `SELECT id FROM assignment_rules WHERE "organizationId" = :orgId LIMIT 1`,
      { 
        type: sequelize.QueryTypes.SELECT,
        replacements: { orgId: organizationId }
      }
    );

    let ruleId;
    if (!existingRule) {
      console.log('📝 Creating round-robin rule...');
      ruleId = uuidv4();
      
      await sequelize.query(`
        INSERT INTO assignment_rules (
          id, "organizationId", name, conditions, "isActive",
          priority, "assignmentMethod", "requireStateMatch", 
          "createdAt", "updatedAt"
        )
        VALUES (
          :id, :orgId, 'Default Lead Assignment', '{}', true,
          100, 'round_robin', false, NOW(), NOW()
        )
      `, {
        replacements: {
          id: ruleId,
          orgId: organizationId
        }
      });

      // Add officers to the queue
      for (const officer of officers) {
        await sequelize.query(`
          INSERT INTO round_robin_queues (
            id, "ruleId", "userId", "assignmentCount", 
            "isActive", "createdAt", "updatedAt"
          )
          VALUES (
            :id, :ruleId, :userId, 0, true, NOW(), NOW()
          )
        `, {
          replacements: {
            id: uuidv4(),
            ruleId,
            userId: officer.id
          }
        });
      }
      console.log('✅ Created round-robin rule and added officers to queue\n');
    } else {
      ruleId = existingRule.id;
      console.log(`✅ Using existing rule: ${ruleId}\n`);
    }

    // Test creating leads that will trigger auto-assignment
    console.log('🧪 Testing auto-assignment with new leads...\n');

    const testLeads = [
      { firstName: 'Test', lastName: 'Lead1', email: 'lead1@test.com', state: 'CA', source: 'Website' },
      { firstName: 'Test', lastName: 'Lead2', email: 'lead2@test.com', state: 'TX', source: 'Referral' },
      { firstName: 'Test', lastName: 'Lead3', email: 'lead3@test.com', state: 'NY', source: 'Website' },
      { firstName: 'Test', lastName: 'Lead4', email: 'lead4@test.com', state: 'FL', source: 'Phone' },
      { firstName: 'Test', lastName: 'Lead5', email: 'lead5@test.com', state: 'CA', source: 'Email' }
    ];

    for (const leadData of testLeads) {
      // Create the contact
      const contact = await Contact.create({
        ...leadData,
        contactType: 'lead',
        organizationId,
        userId: officers[0].id // Initial creator
      });

      // Process through round-robin
      const assignment = await assignmentEngine.processIncomingLead(contact, organizationId);
      
      if (assignment) {
        console.log(`✅ ${leadData.firstName} ${leadData.lastName} (${leadData.state}) → Assigned to ${assignment.officerEmail}`);
      } else {
        console.log(`⚠️ ${leadData.firstName} ${leadData.lastName} (${leadData.state}) → No assignment made`);
      }
    }

    console.log('\n📊 Assignment Statistics:\n');
    const stats = await assignmentEngine.getAssignmentStats(organizationId);
    
    console.log('Summary:');
    console.log(`  Total Assignments: ${stats.summary.total_assignments}`);
    console.log(`  Today's Assignments: ${stats.summary.today_assignments}`);
    console.log(`  Pending: ${stats.summary.pending_assignments}`);
    console.log(`  Active Officers: ${stats.summary.active_officers}`);
    
    console.log('\nOfficer Distribution:');
    stats.officers.forEach(officer => {
      console.log(`  ${officer.email}: ${officer.total_assigned} total, ${officer.assigned_today} today`);
    });

    // Clean up test data
    console.log('\n🧹 Cleaning up test leads...');
    await Contact.destroy({
      where: {
        email: testLeads.map(l => l.email)
      }
    });

    console.log('✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sequelize.close();
  }
}

testRoundRobin();