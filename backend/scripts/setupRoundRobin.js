const { sequelize, User } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function setupRoundRobin() {
  try {
    console.log('Setting up Round Robin system...');
    
    // Get Andy's organization ID
    const orgId = 'b33cf376-7c13-42a7-8343-081c0f4a084a'; // Sales Co. organization
    console.log('Found organization:', orgId);
    
    // Get loan officers
    const officers = await sequelize.query(`
      SELECT id, email, "isLoanOfficer" 
      FROM users 
      WHERE "organizationId" = :orgId 
      AND "isLoanOfficer" = true
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { orgId }
    });
    
    console.log('Found officers:', officers);
    
    // Create a default assignment rule
    const ruleId = uuidv4();
    await sequelize.query(`
      INSERT INTO assignment_rules (
        id, "organizationId", name, conditions, "isActive",
        priority, "assignmentMethod", "requireStateMatch", 
        "createdAt", "updatedAt"
      )
      VALUES (
        :id, :orgId, :name, :conditions, true,
        100, 'round_robin', false,
        NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `, {
      replacements: {
        id: ruleId,
        orgId: orgId,
        name: 'Default Round Robin Rule',
        conditions: JSON.stringify({
          contactType: 'all',
          source: 'all',
          state: 'all'
        })
      }
    });
    
    console.log('Created assignment rule:', ruleId);
    
    // Add officers to round robin queue
    for (const officer of officers) {
      const queueId = uuidv4();
      // Check if already exists
      const [existing] = await sequelize.query(`
        SELECT id FROM round_robin_queues 
        WHERE "ruleId" = :ruleId AND "userId" = :userId
      `, {
        type: sequelize.QueryTypes.SELECT,
        replacements: { ruleId, userId: officer.id }
      });
      
      if (!existing) {
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
            id: queueId,
            ruleId,
            userId: officer.id
          }
        });
      }
      console.log(`Added ${officer.email} to round robin queue`);
    }
    
    // Update loan officers to have licensed states
    const states = ['CA', 'TX', 'FL', 'NY', 'AZ'];
    for (const officer of officers) {
      // Give each officer 2-3 random states
      const numStates = Math.floor(Math.random() * 2) + 2;
      const officerStates = [];
      for (let i = 0; i < numStates; i++) {
        const state = states[Math.floor(Math.random() * states.length)];
        if (!officerStates.includes(state)) {
          officerStates.push(state);
        }
      }
      
      await sequelize.query(`
        UPDATE users 
        SET "licensedStates" = ARRAY[:states]::text[]
        WHERE id = :userId
      `, {
        replacements: {
          states: officerStates,
          userId: officer.id
        }
      });
      console.log(`Updated ${officer.email} with states:`, officerStates);
    }
    
    // Create some sample assignments for history
    const contacts = await sequelize.query(`
      SELECT id, first_name, last_name, email, phone
      FROM contacts
      WHERE "organizationId" = :orgId
      LIMIT 5
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { orgId }
    });
    
    for (const contact of contacts) {
      const assignmentId = uuidv4();
      const randomOfficer = officers[Math.floor(Math.random() * officers.length)];
      const status = ['pending', 'contacted', 'pending'][Math.floor(Math.random() * 3)];
      
      await sequelize.query(`
        INSERT INTO assignments (
          id, "contactId", "assignedTo", "assignedBy",
          "assignedAt", status, notes, "createdAt", "updatedAt"
        )
        VALUES (
          :id, :contactId, :assignedTo, NULL,
          NOW() - INTERVAL '${Math.floor(Math.random() * 7)} days', 
          :status, :notes, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `, {
        replacements: {
          id: assignmentId,
          contactId: contact.id,
          assignedTo: randomOfficer.id,
          status: status,
          notes: 'Auto-assigned via round-robin rule'
        }
      });
      
      // Update contact with assignment
      await sequelize.query(`
        UPDATE contacts
        SET 
          "assignedTo" = :officerId,
          "assignedAt" = NOW() - INTERVAL '${Math.floor(Math.random() * 7)} days',
          state = :state,
          source = :source
        WHERE id = :contactId
      `, {
        replacements: {
          officerId: randomOfficer.id,
          contactId: contact.id,
          state: states[Math.floor(Math.random() * states.length)],
          source: ['website', 'zillow', 'redfin'][Math.floor(Math.random() * 3)]
        }
      });
      
      console.log(`Assigned ${contact.first_name} ${contact.last_name} to ${randomOfficer.email}`);
    }
    
    console.log('\n✅ Round Robin setup complete!');
    console.log('- Created default assignment rule');
    console.log('- Added officers to round robin queue');
    console.log('- Updated officer licensed states');
    console.log('- Created sample assignments');
    
  } catch (error) {
    console.error('Error setting up Round Robin:', error);
  } finally {
    await sequelize.close();
  }
}

setupRoundRobin();