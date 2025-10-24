// Test Manager Feature
require('dotenv').config();
const { User } = require('./backend/models');

async function testManagerFeature() {
  try {
    console.log('\n🔍 TESTING MANAGER FEATURE');
    console.log('═══════════════════════════════════════\n');

    // Find users in the database
    console.log('Step 1: Finding users...');
    const users = await User.findAll({
      attributes: ['id', 'email', 'isManager', 'organizationId', 'isActive'],
      limit: 10
    });

    console.log(`Found ${users.length} users:\n`);
    users.forEach(user => {
      console.log(`  Email: ${user.email}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Is Manager: ${user.isManager ? 'Yes' : 'No'}`);
      console.log(`  Organization ID: ${user.organizationId || 'None'}`);
      console.log(`  Is Active: ${user.isActive ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Check for users in same organization
    const orgsWithMultipleUsers = {};
    users.forEach(user => {
      if (user.organizationId) {
        if (!orgsWithMultipleUsers[user.organizationId]) {
          orgsWithMultipleUsers[user.organizationId] = [];
        }
        orgsWithMultipleUsers[user.organizationId].push(user);
      }
    });

    console.log('\nOrganizations with multiple users:');
    Object.entries(orgsWithMultipleUsers).forEach(([orgId, orgUsers]) => {
      if (orgUsers.length > 1) {
        console.log(`\n  Organization ID: ${orgId}`);
        console.log(`  Users: ${orgUsers.map(u => u.email).join(', ')}`);
        console.log(`  Managers: ${orgUsers.filter(u => u.isManager).map(u => u.email).join(', ') || 'None'}`);
      }
    });

    // Suggest setting a user as manager if there are organizations with multiple users
    const orgsNeedingManager = Object.entries(orgsWithMultipleUsers).filter(
      ([_, orgUsers]) => orgUsers.length > 1 && !orgUsers.some(u => u.isManager)
    );

    if (orgsNeedingManager.length > 0) {
      console.log('\n\n⚠️  SUGGESTIONS:');
      console.log('The following organizations have multiple users but no manager:');
      orgsNeedingManager.forEach(([orgId, orgUsers]) => {
        console.log(`\n  Organization: ${orgId}`);
        console.log(`  Users: ${orgUsers.map(u => u.email).join(', ')}`);
        console.log(`  \n  To set a user as manager, run:`);
        console.log(`  UPDATE users SET is_manager = true WHERE email = '${orgUsers[0].email}';`);
      });
    }

    console.log('\n\n✅ MANAGER FEATURE TEST COMPLETE');
    console.log('═══════════════════════════════════════\n');

    console.log('To test the manager feature:');
    console.log('1. Make sure at least one user has is_manager = true');
    console.log('2. Ensure that manager and other users are in the same organization');
    console.log('3. Login as the manager');
    console.log('4. Go to Pipeline view');
    console.log('5. You should see a filter dropdown with team member names');
    console.log('6. Select different team members to filter their deals');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testManagerFeature();
