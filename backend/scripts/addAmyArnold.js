const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../models');

async function addAmyArnold() {
  try {
    console.log('🚀 Adding Amy and Arnold...');
    
    // Get Sales Co organization ID
    const [org] = await sequelize.query(
      `SELECT id FROM organizations WHERE name = 'Sales Co.' LIMIT 1`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (!org) {
      throw new Error('Sales Co. organization not found!');
    }
    
    const salesCoId = org.id;
    console.log('Found Sales Co. with ID:', salesCoId);
    
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create Amy
    const amyId = uuidv4();
    const amyExists = await sequelize.query(
      `SELECT id FROM users WHERE email = 'amy@salesco.com'`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (amyExists.length === 0) {
      await sequelize.query(`
        INSERT INTO users (
          id, email, password, "organization_id", "is_admin", 
          "is_loan_officer", "licensed_states", created_at, updated_at
        )
        VALUES (
          :id, :email, :password, :organizationId, :isAdmin,
          :isLoanOfficer, :licensedStates, NOW(), NOW()
        )
      `, {
        replacements: {
          id: amyId,
          email: 'amy@salesco.com',
          password: hashedPassword,
          organizationId: salesCoId,
          isAdmin: null,
          isLoanOfficer: true,
          licensedStates: '{TX,OK,NM,LA}'
        }
      });
      
      // Create Amy's profile (check column names)
      try {
        await sequelize.query(`
          INSERT INTO user_profiles (
            id, user_id, "firstName", "lastName", created_at, updated_at
          )
          VALUES (
            :id, :userId, :firstName, :lastName, NOW(), NOW()
          )
          ON CONFLICT (user_id) DO NOTHING
        `, {
          replacements: {
            id: uuidv4(),
            userId: amyId,
            firstName: 'Amy',
            lastName: 'Officer'
          }
        });
      } catch (profileErr) {
        console.log('Profile creation failed (may already exist or different column names)');
      }
      
      console.log('✅ Amy created: amy@salesco.com');
    } else {
      console.log('⚠️  Amy already exists');
    }
    
    // Create Arnold
    const arnoldId = uuidv4();
    const arnoldExists = await sequelize.query(
      `SELECT id FROM users WHERE email = 'arnold@salesco.com'`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (arnoldExists.length === 0) {
      await sequelize.query(`
        INSERT INTO users (
          id, email, password, "organization_id", "is_admin", 
          "is_loan_officer", "licensed_states", created_at, updated_at
        )
        VALUES (
          :id, :email, :password, :organizationId, :isAdmin,
          :isLoanOfficer, :licensedStates, NOW(), NOW()
        )
      `, {
        replacements: {
          id: arnoldId,
          email: 'arnold@salesco.com',
          password: hashedPassword,
          organizationId: salesCoId,
          isAdmin: null,
          isLoanOfficer: true,
          licensedStates: '{CA,OR,WA,NV}'
        }
      });
      
      // Create Arnold's profile
      try {
        await sequelize.query(`
          INSERT INTO user_profiles (
            id, user_id, "firstName", "lastName", created_at, updated_at
          )
          VALUES (
            :id, :userId, :firstName, :lastName, NOW(), NOW()
          )
          ON CONFLICT (user_id) DO NOTHING
        `, {
          replacements: {
            id: uuidv4(),
            userId: arnoldId,
            firstName: 'Arnold',
            lastName: 'Officer'
          }
        });
      } catch (profileErr) {
        console.log('Profile creation failed (may already exist or different column names)');
      }
      
      console.log('✅ Arnold created: arnold@salesco.com');
    } else {
      console.log('⚠️  Arnold already exists');
    }
    
    // Add them to round-robin queue if rule exists
    const [rule] = await sequelize.query(
      `SELECT id FROM assignment_rules WHERE name = 'Default Round Robin' AND "organization_id" = :orgId LIMIT 1`,
      { 
        type: sequelize.QueryTypes.SELECT,
        replacements: { orgId: salesCoId }
      }
    );
    
    if (rule) {
      // Add Amy to queue
      if (amyExists.length === 0) {
        await sequelize.query(`
          INSERT INTO round_robin_queues (
            id, "ruleId", "userId", "assignmentCount", "is_active", "createdAt", "updatedAt"
          )
          VALUES (
            :id, :ruleId, :userId, 0, true, NOW(), NOW()
          )
          ON CONFLICT DO NOTHING
        `, {
          replacements: {
            id: uuidv4(),
            ruleId: rule.id,
            userId: amyId
          }
        });
      }
      
      // Add Arnold to queue
      if (arnoldExists.length === 0) {
        await sequelize.query(`
          INSERT INTO round_robin_queues (
            id, "ruleId", "userId", "assignmentCount", "is_active", "createdAt", "updatedAt"
          )
          VALUES (
            :id, :ruleId, :userId, 0, true, NOW(), NOW()
          )
          ON CONFLICT DO NOTHING
        `, {
          replacements: {
            id: uuidv4(),
            ruleId: rule.id,
            userId: arnoldId
          }
        });
      }
      
      console.log('✅ Added to round-robin queue');
    }
    
    console.log('\n========================================');
    console.log('✅ Users successfully created!');
    console.log('========================================');
    console.log('  📧 amy@salesco.com - password: password123');
    console.log('  📧 arnold@salesco.com - password: password123');
    console.log('========================================\n');
    
    // Show all users in Sales Co
    const allUsers = await sequelize.query(
      `SELECT email, "is_admin", "licensed_states" FROM users WHERE "organization_id" = :orgId`,
      { 
        type: sequelize.QueryTypes.SELECT,
        replacements: { orgId: salesCoId }
      }
    );
    
    console.log('All Sales Co. users:');
    allUsers.forEach(user => {
      console.log(`  - ${user.email} ${user.isAdmin ? '(Admin)' : ''} - States: ${user.licensedStates.join(', ')}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

addAmyArnold();