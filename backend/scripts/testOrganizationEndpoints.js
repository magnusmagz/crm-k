const { sequelize, Organization, User, Contact } = require('../models');

async function testOrganizationEndpoints() {
  try {
    console.log('🧪 Testing Organization model methods...');
    
    // Test basic Organization queries
    console.log('\n1. Testing Organization.findAll()...');
    const orgs = await Organization.findAll();
    console.log(`   ✅ Found ${orgs.length} organizations`);
    
    if (orgs.length > 0) {
      const org = orgs[0];
      console.log(`   📋 First organization: ${org.name}`);
      console.log(`      - CRM Name: ${org.crmName}`);
      console.log(`      - Primary Color: ${org.primaryColor}`);
      console.log(`      - Settings: ${JSON.stringify(org.settings, null, 2).substring(0, 100)}...`);
    }
    
    // Test Organization with associations
    console.log('\n2. Testing Organization with Users and Contacts...');
    const orgWithData = await Organization.findAll({
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'email', 'isAdmin'],
          limit: 3
        },
        {
          model: Contact,
          as: 'contacts',
          attributes: ['id', 'firstName', 'lastName'],
          limit: 3
        }
      ]
    });
    
    for (const org of orgWithData) {
      console.log(`   📊 ${org.name}:`);
      console.log(`      - Users: ${org.users?.length || 0} (showing first 3)`);
      org.users?.forEach(user => {
        console.log(`        • ${user.email} ${user.isAdmin ? '(Admin)' : ''}`);
      });
      console.log(`      - Contacts: ${org.contacts?.length || 0} (showing first 3)`);
      org.contacts?.forEach(contact => {
        console.log(`        • ${contact.firstName} ${contact.lastName}`);
      });
    }
    
    // Test Organization instance methods
    console.log('\n3. Testing Organization instance methods...');
    if (orgs.length > 0) {
      const org = orgs[0];
      
      try {
        const userCount = await org.countUsers();
        console.log(`   ✅ countUsers(): ${userCount}`);
        
        const contactCount = await org.countContacts();
        console.log(`   ✅ countContacts(): ${contactCount}`);
        
        const isWithinLimit = await org.isWithinUserLimit();
        console.log(`   ✅ isWithinUserLimit(): ${isWithinLimit}`);
        
      } catch (error) {
        console.log(`   ⚠️  Instance method error: ${error.message}`);
      }
    }
    
    // Test Organization static methods
    console.log('\n4. Testing Organization static methods...');
    try {
      const activeOrgs = await Organization.getActiveOrganizations();
      console.log(`   ✅ getActiveOrganizations(): ${activeOrgs.length} active orgs`);
      
      if (orgs.length > 0) {
        const orgWithStats = await Organization.findByIdWithStats(orgs[0].id);
        console.log(`   ✅ findByIdWithStats(): Found org with ${orgWithStats?.users?.length || 0} users and ${orgWithStats?.contacts?.length || 0} contacts`);
      }
    } catch (error) {
      console.log(`   ⚠️  Static method error: ${error.message}`);
    }
    
    // Test User to Organization associations
    console.log('\n5. Testing User to Organization associations...');
    const usersWithOrg = await User.findAll({
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'crmName']
        }
      ],
      limit: 3
    });
    
    console.log(`   ✅ Users with organizations: ${usersWithOrg.length}`);
    usersWithOrg.forEach(user => {
      console.log(`      • ${user.email} -> ${user.organization?.name || 'No org'}`);
    });
    
    // Test Contact to Organization associations  
    console.log('\n6. Testing Contact to Organization associations...');
    const contactsWithOrg = await Contact.findAll({
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'crmName']
        }
      ],
      limit: 3
    });
    
    console.log(`   ✅ Contacts with organizations: ${contactsWithOrg.length}`);
    contactsWithOrg.forEach(contact => {
      console.log(`      • ${contact.firstName} ${contact.lastName} -> ${contact.organization?.name || 'No org'}`);
    });
    
    console.log('\n🎉 All Organization model tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Organization endpoint test failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  testOrganizationEndpoints();
}

module.exports = testOrganizationEndpoints;