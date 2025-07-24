require('dotenv').config();
const { sequelize, Deal, Contact } = require('../models');

async function cleanupData() {
  try {
    console.log('🧹 Starting data cleanup...\n');

    // First, count existing data
    const dealCount = await Deal.count();
    const contactCount = await Contact.count();

    console.log(`📊 Current data:`);
    console.log(`   - Deals: ${dealCount}`);
    console.log(`   - Contacts: ${contactCount}`);
    console.log('');

    if (dealCount === 0 && contactCount === 0) {
      console.log('✅ No data to clean up!');
      return;
    }

    // Confirm before proceeding
    console.log('⚠️  WARNING: This will permanently delete ALL deals and contacts!');
    console.log('   This action cannot be undone.\n');
    
    // In a production environment, you'd want to add a confirmation prompt here
    // For now, we'll proceed with the deletion

    // Step 1: Delete all deals first (due to foreign key constraints)
    if (dealCount > 0) {
      console.log('🗑️  Deleting all deals...');
      const deletedDeals = await Deal.destroy({
        where: {},
        truncate: true,
        cascade: true
      });
      console.log(`   ✅ Deleted ${deletedDeals} deals`);
    }

    // Step 2: Delete all contacts
    if (contactCount > 0) {
      console.log('🗑️  Deleting all contacts...');
      const deletedContacts = await Contact.destroy({
        where: {},
        truncate: true,
        cascade: true
      });
      console.log(`   ✅ Deleted ${deletedContacts} contacts`);
    }

    // Verify cleanup
    const finalDealCount = await Deal.count();
    const finalContactCount = await Contact.count();

    console.log('\n📊 Final data count:');
    console.log(`   - Deals: ${finalDealCount}`);
    console.log(`   - Contacts: ${finalContactCount}`);

    if (finalDealCount === 0 && finalContactCount === 0) {
      console.log('\n✅ Data cleanup completed successfully!');
    } else {
      console.log('\n❌ Some data may not have been deleted properly.');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the cleanup
cleanupData();