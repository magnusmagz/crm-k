const { sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function setupDefaultOrganization() {
  try {
    console.log('Setting up default organization...');

    // Check if any organization exists
    const [existingOrgs] = await sequelize.query(
      'SELECT id, name FROM organizations LIMIT 1'
    );

    let orgId;

    if (existingOrgs && existingOrgs.length > 0) {
      orgId = existingOrgs[0].id;
      console.log(`Using existing organization: ${existingOrgs[0].name} (${orgId})`);
    } else {
      // Create a default organization
      orgId = uuidv4();
      await sequelize.query(
        `INSERT INTO organizations (id, name, created_at, updated_at)
         VALUES (:id, :name, NOW(), NOW())`,
        {
          replacements: {
            id: orgId,
            name: 'Default Organization'
          }
        }
      );
      console.log(`Created new organization with ID: ${orgId}`);
    }

    // Get all users without an organization
    const [usersWithoutOrg] = await sequelize.query(
      'SELECT id, email FROM users WHERE organization_id IS NULL'
    );

    if (usersWithoutOrg && usersWithoutOrg.length > 0) {
      console.log(`Found ${usersWithoutOrg.length} users without organization`);

      // Update all users to belong to this organization
      for (const user of usersWithoutOrg) {
        await sequelize.query(
          'UPDATE users SET organization_id = :orgId WHERE id = :userId',
          {
            replacements: {
              orgId: orgId,
              userId: user.id
            }
          }
        );
        console.log(`Assigned user ${user.email} to organization`);
      }

      // Make the first user an admin if no admins exist
      const [admins] = await sequelize.query(
        'SELECT id FROM users WHERE organization_id = :orgId AND is_admin = true',
        {
          replacements: { orgId }
        }
      );

      if (!admins || admins.length === 0) {
        await sequelize.query(
          'UPDATE users SET is_admin = true WHERE id = :userId',
          {
            replacements: {
              userId: usersWithoutOrg[0].id
            }
          }
        );
        console.log(`Made ${usersWithoutOrg[0].email} an admin`);
      }
    } else {
      console.log('All users already have organizations assigned');
    }

    // Show final state
    const [orgUsers] = await sequelize.query(
      `SELECT u.email, u.is_admin, o.name as org_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE o.id = :orgId`,
      {
        replacements: { orgId }
      }
    );

    console.log('\nOrganization setup complete!');
    console.log('Users in organization:');
    orgUsers.forEach(user => {
      console.log(`  - ${user.email}${user.is_admin ? ' (Admin)' : ''}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error setting up organization:', error);
    process.exit(1);
  }
}

setupDefaultOrganization();