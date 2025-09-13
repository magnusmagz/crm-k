#!/usr/bin/env node

/**
 * Script to activate all users that have null or false is_active status
 * This ensures users are active by default as intended
 */

require('dotenv').config();
const { User } = require('../models');

async function activateUsers() {
  try {
    console.log('🔄 Starting user activation update...\n');

    // First, let's see the current state
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const inactiveUsers = await User.count({ where: { is_active: false } });
    const nullUsers = await User.count({ where: { is_active: null } });

    console.log('📊 Current user status:');
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Active users: ${activeUsers}`);
    console.log(`   Inactive users: ${inactiveUsers}`);
    console.log(`   Users with null status: ${nullUsers}\n`);

    if (inactiveUsers > 0 || nullUsers > 0) {
      // Update all users that are not explicitly active to be active
      // This excludes any users that might have been intentionally deactivated
      const [updatedCount] = await User.update(
        { is_active: true },
        {
          where: {
            is_active: null
          }
        }
      );

      console.log(`✅ Updated ${updatedCount} users with null status to active\n`);

      // Show users that are still inactive (intentionally deactivated)
      const stillInactive = await User.findAll({
        where: { is_active: false },
        attributes: ['id', 'email', 'is_active']
      });

      if (stillInactive.length > 0) {
        console.log('⚠️  The following users remain inactive (likely intentionally):');
        stillInactive.forEach(user => {
          console.log(`   - ${user.email}`);
        });
        console.log('\nTo activate these users, use the super admin panel or run this script with --force flag');
      }

      // Final status
      const newActiveUsers = await User.count({ where: { is_active: true } });
      console.log(`\n📈 Final status: ${newActiveUsers} active users out of ${totalUsers} total`);
    } else {
      console.log('✨ All users are already properly configured!');
    }

    // Check for super admin
    const superAdmins = await User.count({ where: { is_super_admin: true } });
    if (superAdmins === 0) {
      console.log('\n⚠️  Warning: No super admin users found!');
      console.log('   Run setupSuperAdmin.js to create a super admin user');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user status:', error);
    process.exit(1);
  }
}

// Check for --force flag to activate ALL users including intentionally deactivated ones
if (process.argv.includes('--force')) {
  async function forceActivateAll() {
    try {
      const [updatedCount] = await User.update(
        { is_active: true },
        { where: {} }
      );
      console.log(`✅ Force activated ALL ${updatedCount} users`);
      process.exit(0);
    } catch (error) {
      console.error('❌ Error force activating users:', error);
      process.exit(1);
    }
  }
  forceActivateAll();
} else {
  activateUsers();
}