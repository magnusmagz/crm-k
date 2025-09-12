require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');

async function createTestUser() {
  try {
    console.log('\nCreating test admin user...\n');
    
    // Hash the password
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Get Sales Co. org ID
    const [orgResult] = await sequelize.query(
      `SELECT id FROM organizations WHERE name = 'Sales Co.' LIMIT 1`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (!orgResult) {
      console.error('❌ Sales Co. organization not found');
      return;
    }
    
    // Check if test user exists
    const [existing] = await sequelize.query(
      `SELECT id FROM users WHERE email = 'test@salesco.com'`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (existing) {
      // Update password
      await sequelize.query(
        `UPDATE users SET password = :password WHERE email = 'test@salesco.com'`,
        {
          replacements: { password: hashedPassword }
        }
      );
      console.log('✅ Updated existing test user password');
    } else {
      // Create new user
      const userId = require('uuid').v4();
      await sequelize.query(
        `INSERT INTO users (
          id, email, password, "is_verified", 
          "organization_id", "is_admin", "is_loan_officer",
          "created_at", "updated_at"
        ) VALUES (
          :id, :email, :password, true,
          :orgId, true, false,
          NOW(), NOW()
        )`,
        {
          replacements: {
            id: userId,
            email: 'test@salesco.com',
            password: hashedPassword,
            orgId: orgResult.id
          }
        }
      );
      
      // Create profile
      await sequelize.query(
        `INSERT INTO user_profiles (
          id, user_id, first_name, last_name,
          created_at, updated_at
        ) VALUES (
          :id, :userId, 'Test', 'Admin',
          NOW(), NOW()
        )`,
        {
          replacements: {
            id: require('uuid').v4(),
            userId: userId
          }
        }
      );
      
      console.log('✅ Created new test user');
    }
    
    console.log('\n📧 Login credentials:');
    console.log('   Email: test@salesco.com');
    console.log('   Password: test123');
    console.log('   Role: Admin\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

createTestUser();