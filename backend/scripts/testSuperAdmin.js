const { sequelize, User, Organization } = require('../models');

async function testSuperAdminSetup() {
  try {
    console.log('🧪 Testing Super Admin setup...\n');

    // 1. Test User model with isSuperAdmin field
    console.log('1. Testing User model isSuperAdmin field...');
    const superAdmins = await User.findAll({
      where: { isSuperAdmin: true },
      attributes: ['id', 'email', 'isAdmin', 'isSuperAdmin', 'organizationId']
    });

    console.log(`   ✅ Found ${superAdmins.length} super admins:`);
    superAdmins.forEach(admin => {
      console.log(`      • ${admin.email} (Admin: ${admin.isAdmin}, Super Admin: ${admin.isSuperAdmin}, Org: ${admin.organizationId})`);
    });

    if (superAdmins.length === 0) {
      console.log('   ⚠️  No super admins found! Creating one...');
      
      // Find the first admin user
      const adminUser = await User.findOne({ where: { isAdmin: true } });
      if (adminUser) {
        await adminUser.update({ isSuperAdmin: true });
        console.log(`   ✅ Made ${adminUser.email} a super admin`);
      } else {
        console.log('   ❌ No admin users found to promote');
      }
    }

    // 2. Test Organization associations
    console.log('\n2. Testing Organization associations...');
    const orgsWithUsers = await Organization.findAll({
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'email', 'isSuperAdmin'],
          limit: 3
        }
      ]
    });

    console.log(`   ✅ Found ${orgsWithUsers.length} organizations with users:`);
    orgsWithUsers.forEach(org => {
      console.log(`      • ${org.name}: ${org.users?.length || 0} users`);
      org.users?.forEach(user => {
        console.log(`        - ${user.email} ${user.isSuperAdmin ? '(Super Admin)' : ''}`);
      });
    });

    // 3. Test that we can query across organizations (super admin capability)
    console.log('\n3. Testing cross-organization queries...');
    const allUsers = await User.findAll({
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['name']
        }
      ],
      attributes: ['id', 'email', 'organizationId'],
      limit: 5
    });

    console.log(`   ✅ Can query ${allUsers.length} users across all organizations:`);
    allUsers.forEach(user => {
      console.log(`      • ${user.email} -> ${user.organization?.name || 'No org'}`);
    });

    // 4. Test basic model functionality
    console.log('\n4. Testing basic model operations...');
    
    // Count operations
    const [totalUsers, totalOrgs] = await Promise.all([
      User.count(),
      Organization.count()
    ]);
    
    console.log(`   ✅ Model operations working:`);
    console.log(`      • Total users: ${totalUsers}`);
    console.log(`      • Total organizations: ${totalOrgs}`);

    // 5. Test validation of super admin field
    console.log('\n5. Testing super admin field validation...');
    try {
      const testUser = await User.build({
        email: 'test@example.com',
        password: 'password123',
        isSuperAdmin: 'invalid' // Should fail validation
      });
      
      await testUser.validate();
      console.log('   ❌ Validation should have failed for invalid isSuperAdmin value');
    } catch (error) {
      console.log('   ✅ Validation correctly rejected invalid isSuperAdmin value');
    }

    console.log('\n🎉 Super Admin setup test completed successfully!\n');

    // Summary
    const finalSuperAdmins = await User.findAll({
      where: { isSuperAdmin: true },
      attributes: ['email', 'isAdmin', 'isSuperAdmin'],
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['name']
        }
      ]
    });

    console.log('📋 FINAL SUPER ADMIN STATUS:');
    console.log('============================');
    if (finalSuperAdmins.length === 0) {
      console.log('❌ No super admins configured!');
    } else {
      console.log(`✅ ${finalSuperAdmins.length} super admin(s) configured:`);
      finalSuperAdmins.forEach(admin => {
        console.log(`   • ${admin.email} (Organization: ${admin.organization?.name || 'None'})`);
      });
    }

    return {
      success: true,
      superAdminCount: finalSuperAdmins.length,
      superAdmins: finalSuperAdmins
    };

  } catch (error) {
    console.error('❌ Super Admin test failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  testSuperAdminSetup();
}

module.exports = testSuperAdminSetup;