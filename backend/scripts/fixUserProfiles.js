const bcrypt = require('bcryptjs');
const { User, UserProfile } = require('../models');

async function fixUserProfiles() {
  try {
    console.log('🔧 Fixing user profiles and passwords...\n');
    
    // Get andy user
    const andy = await User.findOne({ 
      where: { email: 'andy@salesco.com' },
      include: [{ model: UserProfile, as: 'profile' }]
    });
    
    if (!andy) {
      console.log('❌ Andy not found!');
      return;
    }
    
    console.log('Found Andy:', {
      id: andy.id,
      email: andy.email,
      hasProfile: !!andy.profile,
      isVerified: andy.isVerified
    });
    
    // Create profile if missing
    if (!andy.profile) {
      console.log('Creating profile for Andy...');
      await UserProfile.create({
        userId: andy.id,
        firstName: 'Andy',
        lastName: 'Anderson',
        companyName: 'Sales Co.'
      });
      console.log('✅ Profile created');
    }
    
    // Reset password to ensure it works
    console.log('\nResetting password to "password123"...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    await andy.update({ 
      password: hashedPassword,
      isVerified: true 
    });
    
    console.log('✅ Password reset successfully');
    
    // Test the password
    const testPassword = await bcrypt.compare('password123', andy.password);
    console.log('Password test:', testPassword ? '✅ PASSES' : '❌ FAILS');
    
    // Also fix Amy and Arnold
    const otherUsers = ['amy@salesco.com', 'arnold@salesco.com'];
    for (const email of otherUsers) {
      const user = await User.findOne({ 
        where: { email },
        include: [{ model: UserProfile, as: 'profile' }]
      });
      
      if (user) {
        if (!user.profile) {
          const names = {
            'amy@salesco.com': { firstName: 'Amy', lastName: 'Arnold' },
            'arnold@salesco.com': { firstName: 'Arnold', lastName: 'Smith' }
          };
          
          await UserProfile.create({
            userId: user.id,
            ...names[email],
            companyName: 'Sales Co.'
          });
          console.log(`✅ Created profile for ${email}`);
        }
        
        await user.update({ 
          password: hashedPassword,
          isVerified: true 
        });
        console.log(`✅ Reset password for ${email}`);
      }
    }
    
    console.log('\n✅ All users fixed! You can now login with:');
    console.log('   andy@salesco.com / password123');
    console.log('   amy@salesco.com / password123');
    console.log('   arnold@salesco.com / password123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixUserProfiles();