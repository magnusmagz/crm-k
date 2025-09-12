require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');

async function fixAndy() {
  try {
    console.log('\n🔧 Fixing Andy\'s account...\n');
    
    // Get org ID
    const [org] = await sequelize.query(
      `SELECT id FROM organizations WHERE name = 'Sales Co.' LIMIT 1`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (!org) {
      console.error('❌ Sales Co. organization not found');
      return;
    }
    
    // Update Andy with new password
    const hash = await bcrypt.hash('test123', 10);
    await sequelize.query(
      `UPDATE users SET 
        password = :password, 
        "is_admin" = true, 
        "organization_id" = :orgId,
        "is_loan_officer" = false
      WHERE email = :email`,
      {
        replacements: {
          password: hash,
          orgId: org.id,
          email: 'andy@salesco.com'
        }
      }
    );
    
    console.log('✅ Andy\'s account has been fixed!\n');
    console.log('📧 Login credentials:');
    console.log('   Email: andy@salesco.com');
    console.log('   Password: test123');
    console.log('   Role: Admin');
    console.log('   URL: http://localhost:3000\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixAndy();