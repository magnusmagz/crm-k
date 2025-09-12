const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../models');

async function setupSalesCo() {
  try {
    console.log('🚀 Setting up Sales Co. and users...');
    
    // Create Sales Co organization
    const salesCoId = uuidv4();
    
    await sequelize.query(`
      INSERT INTO organizations (id, name, "createdAt", "updatedAt")
      VALUES (:id, :name, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, {
      replacements: { 
        id: salesCoId, 
        name: 'Sales Co.' 
      }
    });
    
    console.log('✅ Sales Co. organization created with ID:', salesCoId);
    
    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create users
    const users = [
      {
        id: uuidv4(),
        email: 'andy@salesco.com',
        password: hashedPassword,
        organizationId: salesCoId,
        isAdmin: true,
        isLoanOfficer: true,
        licensedStates: ['TX', 'CA', 'FL', 'NY']
      },
      {
        id: uuidv4(),
        email: 'amy@salesco.com',
        password: hashedPassword,
        organizationId: salesCoId,
        isAdmin: false,
        isLoanOfficer: true,
        licensedStates: ['TX', 'OK', 'NM', 'LA']
      },
      {
        id: uuidv4(),
        email: 'arnold@salesco.com',
        password: hashedPassword,
        organizationId: salesCoId,
        isAdmin: false,
        isLoanOfficer: true,
        licensedStates: ['CA', 'OR', 'WA', 'NV']
      }
    ];
    
    for (const user of users) {
      // Check if user already exists
      const [existing] = await sequelize.query(
        'SELECT id FROM users WHERE email = :email',
        { 
          replacements: { email: user.email },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!existing) {
        // Insert user with snake_case columns for existing table
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
            ...user,
            licensedStates: `{${user.licensedStates.join(',')}}`
          }
        });
        
        // Create user profile
        await sequelize.query(`
          INSERT INTO user_profiles (
            id, user_id, "firstName", "lastName", "primaryColor",
            "crmName", "emailSignature", "signatureEnabled"
          )
          VALUES (
            :id, :userId, :firstName, :lastName, :primaryColor,
            :crmName, :emailSignature, :signatureEnabled
          )
          ON CONFLICT (user_id) DO NOTHING
        `, {
          replacements: {
            id: uuidv4(),
            userId: user.id,
            firstName: user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1),
            lastName: user.isAdmin ? 'Admin' : 'Officer',
            primaryColor: '#1f2937',
            crmName: 'Sales Co. CRM',
            emailSignature: `Best regards,\n${user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)}`,
            signatureEnabled: true
          }
        });
        
        console.log(`✅ User created: ${user.email} (Admin: ${user.isAdmin})`);
      } else {
        console.log(`⚠️  User already exists: ${user.email}`);
      }
    }
    
    // Create default round-robin rule
    const defaultRuleId = uuidv4();
    
    await sequelize.query(`
      INSERT INTO assignment_rules (
        id, "organization_id", name, conditions, "is_active",
        priority, "assignmentMethod", "requireStateMatch", "createdAt", "updatedAt"
      )
      VALUES (
        :id, :organizationId, :name, :conditions, :isActive,
        :priority, :assignmentMethod, :requireStateMatch, NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `, {
      replacements: {
        id: defaultRuleId,
        organizationId: salesCoId,
        name: 'Default Round Robin',
        conditions: JSON.stringify({ contactType: 'lead', source: 'all' }),
        isActive: true,
        priority: 100,
        assignmentMethod: 'round_robin',
        requireStateMatch: false
      }
    });
    
    console.log('✅ Default round-robin rule created');
    
    // Set up round-robin queue for all users
    for (const user of users) {
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
          ruleId: defaultRuleId,
          userId: user.id
        }
      });
    }
    
    console.log('✅ Round-robin queues set up for all users');
    
    console.log('\n========================================');
    console.log('✅ Sales Co. setup complete!');
    console.log('========================================');
    console.log('\nUsers created:');
    console.log('  📧 andy@salesco.com (Admin) - password: password123');
    console.log('  📧 amy@salesco.com - password: password123');
    console.log('  📧 arnold@salesco.com - password: password123');
    console.log('\nOrganization ID:', salesCoId);
    console.log('Default Round-Robin Rule ID:', defaultRuleId);
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up Sales Co.:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

setupSalesCo();