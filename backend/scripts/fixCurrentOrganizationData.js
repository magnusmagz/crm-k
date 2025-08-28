const { sequelize, Organization, User, UserProfile, Contact } = require('../models');
const { Op } = require('sequelize');

async function fixCurrentOrganizationData() {
  try {
    console.log('🔧 Fixing current organization data...');
    
    // Check current organizations
    const organizations = await Organization.findAll();
    console.log(`📊 Found ${organizations.length} organizations:`);
    
    for (const org of organizations) {
      console.log(`  - ${org.name} (ID: ${org.id})`);
      console.log(`    CRM Name: ${org.crmName || 'Not set'}`);
      console.log(`    Primary Color: ${org.primaryColor || 'Not set'}`);
      console.log(`    Active: ${org.isActive}`);
    }
    
    // Check users and their organization associations
    const users = await User.findAll({
      include: [
        {
          model: UserProfile,
          as: 'profile',
          required: false
        },
        {
          model: Organization,
          as: 'organization',
          required: false
        }
      ]
    });
    
    console.log(`\n👥 Found ${users.length} users:`);
    
    let usersWithoutOrg = [];
    let userBrandingData = [];
    
    for (const user of users) {
      console.log(`  - ${user.email}`);
      console.log(`    Organization ID: ${user.organizationId || 'Not set'}`);
      console.log(`    Organization: ${user.organization?.name || 'None'}`);
      console.log(`    Is Admin: ${user.isAdmin || false}`);
      
      if (!user.organizationId) {
        usersWithoutOrg.push(user);
      }
      
      // Check for user-level branding that should move to organization
      if (user.profile) {
        const profile = user.profile;
        if (profile.crmName || profile.primaryColor || profile.companyName) {
          userBrandingData.push({
            userId: user.id,
            email: user.email,
            organizationId: user.organizationId,
            crmName: profile.crmName,
            primaryColor: profile.primaryColor,
            companyName: profile.companyName
          });
        }
      }
    }
    
    console.log(`\n⚠️  Users without organization: ${usersWithoutOrg.length}`);
    console.log(`🎨 Users with branding data: ${userBrandingData.length}`);
    
    // Check contacts
    const contacts = await Contact.findAll({
      include: [
        {
          model: Organization,
          as: 'organization',
          required: false
        }
      ]
    });
    
    console.log(`\n📞 Found ${contacts.length} contacts`);
    const contactsWithoutOrg = contacts.filter(c => !c.organizationId);
    console.log(`⚠️  Contacts without organization: ${contactsWithoutOrg.length}`);
    
    // Summary report
    console.log('\n📋 SUMMARY REPORT:');
    console.log('==================');
    console.log(`Organizations: ${organizations.length}`);
    console.log(`Users: ${users.length}`);
    console.log(`  - Without organization: ${usersWithoutOrg.length}`);
    console.log(`  - With branding data: ${userBrandingData.length}`);
    console.log(`Contacts: ${contacts.length}`);
    console.log(`  - Without organization: ${contactsWithoutOrg.length}`);
    
    return {
      organizations,
      users,
      usersWithoutOrg,
      userBrandingData,
      contacts,
      contactsWithoutOrg
    };
    
  } catch (error) {
    console.error('❌ Error checking organization data:', error);
    throw error;
  }
}

async function updateSalesCoOrganization() {
  try {
    console.log('\n🏢 Updating Sales Co. organization...');
    
    // Find Sales Co. organization
    let salesCo = await Organization.findOne({
      where: { name: 'Sales Co.' }
    });
    
    if (!salesCo) {
      console.log('Sales Co. not found, checking for other organizations...');
      const orgs = await Organization.findAll();
      if (orgs.length > 0) {
        salesCo = orgs[0];
        console.log(`Using first organization: ${salesCo.name}`);
      } else {
        console.log('No organizations found, creating Sales Co...');
        salesCo = await Organization.create({
          name: 'Sales Co.',
          crmName: 'CRM Killer',
          primaryColor: '#6366f1',
          isActive: true,
          settings: {
            allowUserRegistration: false,
            requireEmailVerification: true,
            defaultUserRole: 'user',
            maxUsers: null,
            features: {
              roundRobin: true,
              emailTemplates: true,
              customFields: true,
              recruiting: true
            }
          }
        });
        console.log('✅ Created Sales Co. organization');
      }
    }
    
    // Update organization with proper branding and settings
    const updateData = {
      crmName: salesCo.crmName || 'CRM Killer',
      primaryColor: salesCo.primaryColor || '#6366f1',
      isActive: true,
      settings: salesCo.settings || {
        allowUserRegistration: false,
        requireEmailVerification: true,
        defaultUserRole: 'user',
        maxUsers: null,
        features: {
          roundRobin: true,
          emailTemplates: true,
          customFields: true,
          recruiting: true
        }
      }
    };
    
    await salesCo.update(updateData);
    console.log(`✅ Updated ${salesCo.name} organization`);
    
    return salesCo;
    
  } catch (error) {
    console.error('❌ Error updating Sales Co. organization:', error);
    throw error;
  }
}

async function linkUsersToOrganization(organizationId) {
  try {
    console.log('\n🔗 Linking users to organization...');
    
    // Get users without organization
    const usersWithoutOrg = await User.findAll({
      where: { organizationId: null }
    });
    
    if (usersWithoutOrg.length === 0) {
      console.log('✅ All users already have organizations');
      return;
    }
    
    console.log(`Linking ${usersWithoutOrg.length} users to organization ${organizationId}`);
    
    for (const user of usersWithoutOrg) {
      await user.update({ organizationId });
      console.log(`✅ Linked ${user.email} to organization`);
    }
    
  } catch (error) {
    console.error('❌ Error linking users to organization:', error);
    throw error;
  }
}

async function linkContactsToOrganization(organizationId) {
  try {
    console.log('\n📞 Linking contacts to organization...');
    
    // Get contacts without organization
    const contactsWithoutOrg = await Contact.findAll({
      where: { organizationId: null }
    });
    
    if (contactsWithoutOrg.length === 0) {
      console.log('✅ All contacts already have organizations');
      return;
    }
    
    console.log(`Linking ${contactsWithoutOrg.length} contacts to organization ${organizationId}`);
    
    for (const contact of contactsWithoutOrg) {
      await contact.update({ organizationId });
      console.log(`✅ Linked ${contact.firstName} ${contact.lastName} to organization`);
    }
    
  } catch (error) {
    console.error('❌ Error linking contacts to organization:', error);
    throw error;
  }
}

async function migrateBrandingToOrganization(organizationId) {
  try {
    console.log('\n🎨 Migrating branding from user profiles to organization...');
    
    // Find users with branding data
    const usersWithBranding = await User.findAll({
      where: { organizationId },
      include: [
        {
          model: UserProfile,
          as: 'profile',
          required: true,
          where: {
            [Op.or]: [
              { crmName: { [Op.ne]: null } },
              { primaryColor: { [Op.ne]: null } },
              { companyName: { [Op.ne]: null } }
            ]
          }
        }
      ]
    });
    
    if (usersWithBranding.length === 0) {
      console.log('✅ No user-level branding to migrate');
      return;
    }
    
    console.log(`Found ${usersWithBranding.length} users with branding data`);
    
    // Get organization
    const organization = await Organization.findByPk(organizationId);
    
    // Use branding from the first admin user or first user with branding
    let sourceUser = usersWithBranding.find(u => u.isAdmin);
    if (!sourceUser) {
      sourceUser = usersWithBranding[0];
    }
    
    const profile = sourceUser.profile;
    const orgUpdateData = {};
    
    if (profile.crmName && (!organization.crmName || organization.crmName === 'CRM Killer')) {
      orgUpdateData.crmName = profile.crmName;
      console.log(`📝 Using CRM name: ${profile.crmName}`);
    }
    
    if (profile.primaryColor && (!organization.primaryColor || organization.primaryColor === '#6366f1')) {
      orgUpdateData.primaryColor = profile.primaryColor;
      console.log(`🎨 Using primary color: ${profile.primaryColor}`);
    }
    
    if (profile.companyName && !organization.name.includes(profile.companyName)) {
      console.log(`🏢 Company name from profile: ${profile.companyName} (keeping org name: ${organization.name})`);
    }
    
    if (Object.keys(orgUpdateData).length > 0) {
      await organization.update(orgUpdateData);
      console.log('✅ Updated organization with user branding data');
    }
    
    // Optional: Clear user-level branding since it's now at org level
    console.log('🧹 Clearing user-level branding (now handled at org level)...');
    for (const user of usersWithBranding) {
      await user.profile.update({
        // Keep company name as it might be user-specific
        // crmName: null,  // Comment out if you want to keep it
        // primaryColor: null  // Comment out if you want to keep it
      });
    }
    
  } catch (error) {
    console.error('❌ Error migrating branding:', error);
    throw error;
  }
}

async function verifyOrganizationAssociations() {
  try {
    console.log('\n✅ Verifying organization associations...');
    
    // Test organization queries with associations
    const orgsWithUsers = await Organization.findAll({
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'email', 'isAdmin']
        },
        {
          model: Contact,
          as: 'contacts',
          attributes: ['id', 'firstName', 'lastName'],
          limit: 5
        }
      ]
    });
    
    for (const org of orgsWithUsers) {
      console.log(`📊 ${org.name}:`);
      console.log(`   Users: ${org.users?.length || 0}`);
      console.log(`   Contacts: ${org.contacts?.length || 0}`);
      console.log(`   CRM Name: ${org.crmName}`);
      console.log(`   Primary Color: ${org.primaryColor}`);
      console.log(`   Active: ${org.isActive}`);
    }
    
    console.log('\n✅ Organization associations verified');
    
  } catch (error) {
    console.error('❌ Error verifying associations:', error);
    throw error;
  }
}

async function runFullFix() {
  try {
    console.log('🚀 Starting full organization data fix...\n');
    
    // Step 1: Check current status
    const status = await fixCurrentOrganizationData();
    
    // Step 2: Update/create Sales Co. organization
    const salesCo = await updateSalesCoOrganization();
    
    // Step 3: Link users to organization
    await linkUsersToOrganization(salesCo.id);
    
    // Step 4: Link contacts to organization
    await linkContactsToOrganization(salesCo.id);
    
    // Step 5: Migrate branding data
    await migrateBrandingToOrganization(salesCo.id);
    
    // Step 6: Verify everything works
    await verifyOrganizationAssociations();
    
    console.log('\n🎉 Organization data fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Organization data fix failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Export functions for individual use
module.exports = {
  fixCurrentOrganizationData,
  updateSalesCoOrganization,
  linkUsersToOrganization,
  linkContactsToOrganization,
  migrateBrandingToOrganization,
  verifyOrganizationAssociations,
  runFullFix
};

// Run full fix if called directly
if (require.main === module) {
  runFullFix();
}