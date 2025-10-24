// Setup Manager Test Environment
require('dotenv').config();
const { User, Organization } = require('./backend/models');
const { v4: uuidv4 } = require('uuid');

async function setupManagerTest() {
  try {
    console.log('\n🔧 SETTING UP MANAGER TEST ENVIRONMENT');
    console.log('═══════════════════════════════════════\n');

    // Find the test user
    console.log('Step 1: Finding test user...');
    const testUser = await User.findOne({
      where: { email: 'test@example.com' }
    });

    if (!testUser) {
      console.log('❌ Test user not found');
      process.exit(1);
    }

    console.log('✓ Found test user:', testUser.email);
    console.log('');

    // Create or find organization
    console.log('Step 2: Setting up organization...');
    let orgId = testUser.organizationId;
    let organization;

    if (!orgId) {
      // Check if Organization model exists, if not use raw SQL
      try {
        organization = await Organization.create({
          id: uuidv4(),
          name: 'Test Organization',
          description: 'Organization for testing manager features'
        });
        orgId = organization.id;
        console.log('  Created new organization:', orgId);
      } catch (createError) {
        // Fallback to raw SQL if model doesn't work
        console.log('  Creating organization using raw SQL...');
        orgId = uuidv4();
        await User.sequelize.query(
          `INSERT INTO organizations (id, name, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          { bind: [orgId, 'Test Organization'] }
        );
        console.log('  Created new organization:', orgId);
      }
    } else {
      console.log('  Using existing organization:', orgId);
    }
    console.log('');

    // Update user to be a manager in the organization
    console.log('Step 3: Setting user as manager...');
    await testUser.update({
      isManager: true,
      organizationId: orgId
    });
    console.log('✓ Updated user:');
    console.log('  - Is Manager: true');
    console.log('  - Organization ID:', orgId);
    console.log('');

    // Check if there are other users to add to the organization
    console.log('Step 4: Checking for other users...');
    const allUsers = await User.findAll({
      where: {
        email: { [require('sequelize').Op.ne]: 'test@example.com' }
      },
      limit: 5
    });

    if (allUsers.length > 0) {
      console.log(`Found ${allUsers.length} other users:`);
      for (const user of allUsers) {
        console.log(`\n  Updating ${user.email}...`);
        await user.update({
          organizationId: orgId,
          isManager: false
        });
        console.log('  ✓ Added to organization');
      }
    } else {
      console.log('  No other users found.');
      console.log('\n  💡 TIP: To fully test the manager feature:');
      console.log('  1. Create another user account (register in the app)');
      console.log('  2. Run this script again to add them to the organization');
      console.log('  3. Login as test@example.com (the manager)');
      console.log('  4. You\'ll see a filter dropdown with team member names');
    }

    console.log('\n\n✅ MANAGER TEST ENVIRONMENT READY');
    console.log('═══════════════════════════════════════\n');

    console.log('Test Instructions:');
    console.log('1. Login as test@example.com');
    console.log('2. Go to Pipeline view');
    console.log('3. Look for the "Owner Filter" dropdown next to "Status Filter"');
    console.log('4. Select different options:');
    console.log('   - "All Team Members" - shows all deals from the organization');
    console.log('   - "My Deals Only" - shows only your deals');
    console.log('   - Individual team members - shows that person\'s deals');
    console.log('\n');

    // Show current organization state
    console.log('Current Organization State:');
    const orgUsers = await User.findAll({
      where: { organizationId: orgId },
      attributes: ['email', 'isManager']
    });
    console.log(`Organization ${orgId}:`);
    orgUsers.forEach(user => {
      console.log(`  - ${user.email} ${user.isManager ? '(Manager)' : ''}`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ SETUP FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

setupManagerTest();
