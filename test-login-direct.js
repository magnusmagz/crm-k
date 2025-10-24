// Test login directly
require('dotenv').config();
const bcrypt = require('bcrypt');
const { User } = require('./backend/models');

async function testLogin() {
  try {
    const user = await User.findOne({ where: { email: 'test@example.com' } });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Is Verified:', user.isVerified);
    console.log('  Is Active:', user.isActive);
    console.log('  Password hash exists:', !!user.password);
    console.log('  Password hash length:', user.password?.length);

    // Test password
    const testPassword = 'password123';
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log('\nPassword test (password123):', isValid ? '✓ VALID' : '❌ INVALID');

    if (!isValid) {
      console.log('\nResetting password...');
      const newHash = await bcrypt.hash(testPassword, 10);
      await user.update({ password: newHash });
      console.log('✓ Password reset successfully');

      // Test again
      const isValid2 = await bcrypt.compare(testPassword, newHash);
      console.log('Password test after reset:', isValid2 ? '✓ VALID' : '❌ INVALID');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
