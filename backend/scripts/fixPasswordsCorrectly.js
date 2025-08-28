const { User, UserProfile } = require('../models');
const { sequelize } = require('../models');

async function fixPasswordsCorrectly() {
  try {
    console.log('🔧 Fixing passwords correctly...\n');
    
    const users = [
      { email: 'andy@salesco.com', firstName: 'Andy', lastName: 'Anderson' },
      { email: 'amy@salesco.com', firstName: 'Amy', lastName: 'Arnold' },
      { email: 'arnold@salesco.com', firstName: 'Arnold', lastName: 'Smith' }
    ];
    
    for (const userData of users) {
      console.log(`Processing ${userData.email}...`);
      
      const user = await User.findOne({ 
        where: { email: userData.email }
      });
      
      if (!user) {
        console.log(`  Creating new user...`);
        const newUser = await User.create({
          email: userData.email,
          password: 'password123', // Will be hashed by beforeCreate hook
          isVerified: true
        });
        
        await UserProfile.create({
          userId: newUser.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          companyName: 'Sales Co.'
        });
        
        console.log(`  ✅ Created new user and profile`);
      } else {
        // Set password using plain text - the hook will hash it
        user.password = 'password123';
        await user.save();
        
        console.log(`  ✅ Password reset`);
        
        // Check for profile
        const profile = await UserProfile.findOne({
          where: { userId: user.id }
        });
        
        if (!profile) {
          await UserProfile.create({
            userId: user.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            companyName: 'Sales Co.'
          });
          console.log(`  ✅ Profile created`);
        }
      }
    }
    
    console.log('\n✅ All passwords fixed! You can now login with:');
    console.log('   andy@salesco.com / password123');
    console.log('   amy@salesco.com / password123');
    console.log('   arnold@salesco.com / password123');
    
    // Test login for andy
    console.log('\n🧪 Testing login for andy@salesco.com...');
    const testUser = await User.findOne({ 
      where: { email: 'andy@salesco.com' }
    });
    
    if (testUser) {
      const isValid = await testUser.comparePassword('password123');
      console.log(`   Password validation: ${isValid ? '✅ SUCCESS' : '❌ FAILED'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fixPasswordsCorrectly();