const { sequelize, User } = require('../models');

async function setupSuperAdmin() {
  try {
    console.log('👑 Setting up super admin user...');
    
    // First, let's see what users exist
    const allUsers = await User.findAll({
      attributes: ['id', 'email', 'isAdmin', 'isSuperAdmin'],
      limit: 10
    });
    
    console.log(`\n📋 Found ${allUsers.length} users in system:`);
    allUsers.forEach(user => {
      console.log(`   • ${user.email} (Admin: ${user.isAdmin || false}, Super Admin: ${user.isSuperAdmin || false})`);
    });
    
    // Find an admin user to make super admin
    let adminUser = allUsers.find(user => user.isAdmin);
    
    if (!adminUser) {
      // If no admin, make the first user an admin and super admin
      adminUser = allUsers[0];
      if (adminUser) {
        await adminUser.update({ isAdmin: true, isSuperAdmin: true });
        console.log(`\n✅ Made ${adminUser.email} an admin and super admin`);
      } else {
        console.log('\n⚠️  No users found in system!');
        return;
      }
    } else {
      // Make the admin user a super admin
      await adminUser.update({ isSuperAdmin: true });
      console.log(`\n✅ Made ${adminUser.email} a super admin`);
    }
    
    // Verify the setup
    const superAdmins = await User.findAll({
      where: { isSuperAdmin: true },
      attributes: ['id', 'email', 'isAdmin', 'isSuperAdmin']
    });
    
    console.log('\n👑 Super Admins in system:');
    if (superAdmins.length === 0) {
      console.log('   No super admins found');
    } else {
      superAdmins.forEach(admin => {
        console.log(`   • ${admin.email} (Admin: ${admin.isAdmin}, Super Admin: ${admin.isSuperAdmin})`);
      });
    }
    
    console.log('\n🎉 Super admin setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up super admin:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  setupSuperAdmin();
}

module.exports = setupSuperAdmin;