// This script can be run on Heroku using: heroku run node scripts/cleanup-heroku.js
const { sequelize, Deal, Contact } = require('../models');

async function cleanupData() {
  try {
    console.log('🧹 Starting data cleanup on Heroku...\n');

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

    console.log('⚠️  Deleting all data...\n');

    // Step 1: Delete all deals first (due to foreign key constraints)
    if (dealCount > 0) {
      console.log('🗑️  Deleting all deals...');
      await sequelize.query('DELETE FROM deals');
      console.log(`   ✅ Deleted ${dealCount} deals`);
    }

    // Step 2: Delete all contacts
    if (contactCount > 0) {
      console.log('🗑️  Deleting all contacts...');
      await sequelize.query('DELETE FROM contacts');
      console.log(`   ✅ Deleted ${contactCount} contacts`);
    }

    // Verify cleanup
    const finalDealCount = await Deal.count();
    const finalContactCount = await Contact.count();

    console.log('\n📊 Final data count:');
    console.log(`   - Deals: ${finalDealCount}`);
    console.log(`   - Contacts: ${finalContactCount}`);

    console.log('\n✅ Data cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the cleanup
cleanupData();