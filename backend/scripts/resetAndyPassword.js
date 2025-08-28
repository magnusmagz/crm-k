const bcrypt = require('bcryptjs');
const { User, UserProfile } = require('../models');
const { sequelize } = require('../models');

async function resetAndyPassword() {
  try {
    console.log('🔧 Resetting Andy\'s password...\n');
    
    // Find andy
    const andy = await User.findOne({ 
      where: { email: 'andy@salesco.com' }
    });
    
    if (!andy) {
      console.log('❌ Andy not found! Creating andy@salesco.com...');
      
      // Create Andy with proper password
      const newUser = await User.create({
        email: 'andy@salesco.com',
        password: 'password123', // Will be hashed by beforeCreate hook
        isVerified: true,
        organizationId: require('crypto').randomUUID(),
        isAdmin: true
      });
      
      // Create profile
      await UserProfile.create({
        userId: newUser.id,
        firstName: 'Andy',
        lastName: 'Anderson',
        companyName: 'Sales Co.'
      });
      
      console.log('✅ Created andy@salesco.com with password: password123');
      
      // Test the password
      const testUser = await User.findOne({ 
        where: { email: 'andy@salesco.com' }
      });
      const isValid = await testUser.comparePassword('password123');
      console.log(`\n🧪 Password test: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
      
    } else {
      console.log('Found Andy. Current info:');
      console.log('  ID:', andy.id);
      console.log('  Email:', andy.email);
      console.log('  Verified:', andy.isVerified);
      
      // Reset password using plain text - the hook will hash it
      andy.password = 'password123';
      await andy.save();
      
      console.log('\n✅ Password has been reset to: password123');
      
      // Test the password
      const testUser = await User.findOne({ 
        where: { email: 'andy@salesco.com' }
      });
      const isValid = await testUser.comparePassword('password123');
      console.log(`\n🧪 Password test: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
      
      // Check if profile exists
      const profile = await UserProfile.findOne({
        where: { userId: andy.id }
      });
      
      if (!profile) {
        await UserProfile.create({
          userId: andy.id,
          firstName: 'Andy',
          lastName: 'Anderson',
          companyName: 'Sales Co.'
        });
        console.log('✅ Created missing profile');
      }
    }
    
    console.log('\n✨ You can now login with:');
    console.log('   Email: andy@salesco.com');
    console.log('   Password: password123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

resetAndyPassword();