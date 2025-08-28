const { sequelize, Organization, User, Contact } = require('../models');

async function cleanupDuplicateOrganizations() {
  try {
    console.log('🧹 Cleaning up duplicate organizations...');
    
    // Get all organizations
    const orgs = await Organization.findAll({
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id']
        },
        {
          model: Contact,
          as: 'contacts',
          attributes: ['id']
        }
      ]
    });
    
    console.log(`Found ${orgs.length} organizations:`);
    
    let activeOrg = null;
    let emptyOrgs = [];
    
    for (const org of orgs) {
      const userCount = org.users?.length || 0;
      const contactCount = org.contacts?.length || 0;
      
      console.log(`  - ${org.name} (${org.id}): ${userCount} users, ${contactCount} contacts`);
      
      if (userCount > 0 || contactCount > 0) {
        if (!activeOrg) {
          activeOrg = org;
          console.log(`    ✅ This is the active organization`);
        } else {
          console.log(`    ⚠️  Multiple organizations with data found!`);
        }
      } else {
        emptyOrgs.push(org);
        console.log(`    🗑️  Empty organization, will be deleted`);
      }
    }
    
    if (emptyOrgs.length > 0) {
      console.log(`\n🗑️  Deleting ${emptyOrgs.length} empty organizations...`);
      
      for (const org of emptyOrgs) {
        await org.destroy();
        console.log(`  ✅ Deleted empty organization: ${org.name} (${org.id})`);
      }
    }
    
    // Verify final state
    const remainingOrgs = await Organization.findAll({
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id']
        },
        {
          model: Contact,
          as: 'contacts',
          attributes: ['id']
        }
      ]
    });
    
    console.log(`\n✅ Cleanup complete! Remaining organizations: ${remainingOrgs.length}`);
    
    for (const org of remainingOrgs) {
      const userCount = org.users?.length || 0;
      const contactCount = org.contacts?.length || 0;
      console.log(`  - ${org.name}: ${userCount} users, ${contactCount} contacts, CRM: ${org.crmName}, Color: ${org.primaryColor}`);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up organizations:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  cleanupDuplicateOrganizations();
}

module.exports = cleanupDuplicateOrganizations;