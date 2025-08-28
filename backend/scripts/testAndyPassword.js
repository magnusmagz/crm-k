require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');

async function testPassword() {
  try {
    console.log('\nTesting Andy\'s password...\n');
    
    const [users] = await sequelize.query(
      "SELECT id, email, password FROM users WHERE email = 'andy@salesco.com'"
    );
    
    if (users.length === 0) {
      console.log('❌ Andy account not found!');
      return;
    }
    
    const user = users[0];
    console.log('✅ Found user:', user.email);
    console.log('User ID:', user.id);
    
    // Test the new password
    const isNewValid = await bcrypt.compare('CRMis@we3some!', user.password);
    console.log('\nPassword "CRMis@we3some!" is valid:', isNewValid ? '✅ YES' : '❌ NO');
    
    // Test the old password
    const isOldValid = await bcrypt.compare('password123', user.password);
    console.log('Password "password123" is valid:', isOldValid ? '✅ YES' : '❌ NO');
    
    if (!isNewValid && !isOldValid) {
      console.log('\n⚠️  Neither password works! Let me reset it...\n');
      
      // Reset the password
      const newHash = await bcrypt.hash('CRMis@we3some!', 10);
      await sequelize.query(
        'UPDATE users SET password = :password WHERE email = :email',
        {
          replacements: {
            password: newHash,
            email: 'andy@salesco.com'
          }
        }
      );
      console.log('✅ Password has been reset to: CRMis@we3some!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

testPassword();