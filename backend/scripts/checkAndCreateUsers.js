const bcrypt = require('bcryptjs');
const { User, UserProfile } = require('../models');

async function checkAndCreateUsers() {
  try {
    console.log('🔍 Checking for existing users...\n');
    
    // Check for any existing users
    const existingUsers = await User.findAll({
      include: [{ model: UserProfile, as: 'profile' }]
    });
    
    console.log(`Found ${existingUsers.length} existing users:`);
    existingUsers.forEach(user => {
      console.log(`- ${user.email} (ID: ${user.id})`);
      if (user.profile) {
        console.log(`  Name: ${user.profile.firstName} ${user.profile.lastName}`);
      }
    });
    
    // Check specifically for Sales Co. users
    const salesCoEmails = ['andy@salesco.com', 'amy@salesco.com', 'arnold@salesco.com'];
    const missingEmails = [];
    
    for (const email of salesCoEmails) {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        missingEmails.push(email);
      }
    }
    
    if (missingEmails.length > 0) {
      console.log('\n⚠️  Missing Sales Co. users:', missingEmails);
      console.log('\n🔧 Creating missing users...\n');
      
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const usersToCreate = [
        { email: 'andy@salesco.com', firstName: 'Andy', lastName: 'Anderson' },
        { email: 'amy@salesco.com', firstName: 'Amy', lastName: 'Arnold' },
        { email: 'arnold@salesco.com', firstName: 'Arnold', lastName: 'Smith' }
      ];
      
      for (const userData of usersToCreate) {
        if (missingEmails.includes(userData.email)) {
          try {
            const user = await User.create({
              email: userData.email,
              password: hashedPassword,
              isVerified: true
            });
            
            await UserProfile.create({
              userId: user.id,
              firstName: userData.firstName,
              lastName: userData.lastName,
              companyName: 'Sales Co.'
            });
            
            console.log(`✅ Created user: ${userData.email}`);
          } catch (err) {
            console.error(`❌ Error creating ${userData.email}:`, err.message);
          }
        }
      }
    } else {
      console.log('\n✅ All Sales Co. users exist!');
    }
    
    // Create a simple test user if no users exist at all
    if (existingUsers.length === 0) {
      console.log('\n📝 Creating a test user for you...');
      const hashedPassword = await bcrypt.hash('test123', 10);
      
      const testUser = await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        isVerified: true
      });
      
      await UserProfile.create({
        userId: testUser.id,
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company'
      });
      
      console.log('\n✅ Created test user:');
      console.log('   Email: test@example.com');
      console.log('   Password: test123');
    }
    
    console.log('\n📋 Summary of available logins:');
    console.log('   andy@salesco.com / password123');
    console.log('   amy@salesco.com / password123');
    console.log('   arnold@salesco.com / password123');
    if (existingUsers.length === 0) {
      console.log('   test@example.com / test123');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAndCreateUsers();