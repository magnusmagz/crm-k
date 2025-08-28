const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');

async function updatePasswords() {
  try {
    console.log('🔐 Updating user passwords to stronger password...');
    
    // New secure password
    const newPassword = 'CRMis@we3some!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update all Sales Co users
    const result = await sequelize.query(`
      UPDATE users 
      SET password = :password, updated_at = NOW()
      WHERE "organizationId" IS NOT NULL
      AND email IN ('andy@salesco.com', 'amy@salesco.com', 'arnold@salesco.com')
    `, {
      replacements: {
        password: hashedPassword
      }
    });
    
    console.log('\n========================================');
    console.log('✅ Passwords updated successfully!');
    console.log('========================================');
    console.log('\nNew login credentials:');
    console.log('  📧 andy@salesco.com - password: CRMis@we3some!');
    console.log('  📧 amy@salesco.com - password: CRMis@we3some!');
    console.log('  📧 arnold@salesco.com - password: CRMis@we3some!');
    console.log('\n⚠️  Make sure to save these credentials securely!');
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
    process.exit(1);
  }
}

updatePasswords();