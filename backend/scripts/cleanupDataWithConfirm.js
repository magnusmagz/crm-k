require('dotenv').config();
const { sequelize, Deal, Contact } = require('../models');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function cleanupData() {
  try {
    console.log('🧹 CRM Data Cleanup Tool\n');

    // First, count existing data
    const dealCount = await Deal.count();
    const contactCount = await Contact.count();

    console.log(`📊 Current data in database:`);
    console.log(`   - Deals: ${dealCount.toLocaleString()}`);
    console.log(`   - Contacts: ${contactCount.toLocaleString()}`);
    console.log(`   - Total records to delete: ${(dealCount + contactCount).toLocaleString()}`);
    console.log('');

    if (dealCount === 0 && contactCount === 0) {
      console.log('✅ No data to clean up!');
      rl.close();
      await sequelize.close();
      process.exit(0);
    }

    // Warning message
    console.log('⚠️  WARNING: This operation will PERMANENTLY delete:');
    console.log('   • ALL deals in the system');
    console.log('   • ALL contacts in the system');
    console.log('   • This action CANNOT be undone!\n');

    // Ask for confirmation
    const answer = await askQuestion('Are you sure you want to proceed? Type "DELETE ALL DATA" to confirm: ');

    if (answer !== 'DELETE ALL DATA') {
      console.log('\n❌ Operation cancelled. No data was deleted.');
      rl.close();
      await sequelize.close();
      process.exit(0);
    }

    console.log('\n🔄 Starting deletion process...\n');

    // Step 1: Delete all deals first (due to foreign key constraints)
    if (dealCount > 0) {
      console.log('🗑️  Deleting all deals...');
      const startTime = Date.now();
      
      // Delete in batches for better performance
      let deletedTotal = 0;
      const batchSize = 1000;
      
      while (deletedTotal < dealCount) {
        const deleted = await Deal.destroy({
          where: {},
          limit: batchSize
        });
        deletedTotal += deleted;
        
        if (deletedTotal < dealCount) {
          process.stdout.write(`   Progress: ${deletedTotal}/${dealCount} (${Math.round(deletedTotal/dealCount*100)}%)\r`);
        }
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`   ✅ Deleted ${deletedTotal} deals in ${duration}s                    `);
    }

    // Step 2: Delete all contacts
    if (contactCount > 0) {
      console.log('🗑️  Deleting all contacts...');
      const startTime = Date.now();
      
      // Delete in batches for better performance
      let deletedTotal = 0;
      const batchSize = 1000;
      
      while (deletedTotal < contactCount) {
        const deleted = await Contact.destroy({
          where: {},
          limit: batchSize
        });
        deletedTotal += deleted;
        
        if (deletedTotal < contactCount) {
          process.stdout.write(`   Progress: ${deletedTotal}/${contactCount} (${Math.round(deletedTotal/contactCount*100)}%)\r`);
        }
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`   ✅ Deleted ${deletedTotal} contacts in ${duration}s                    `);
    }

    // Verify cleanup
    const finalDealCount = await Deal.count();
    const finalContactCount = await Contact.count();

    console.log('\n📊 Final verification:');
    console.log(`   - Remaining deals: ${finalDealCount}`);
    console.log(`   - Remaining contacts: ${finalContactCount}`);

    if (finalDealCount === 0 && finalContactCount === 0) {
      console.log('\n✅ Data cleanup completed successfully!');
      console.log('   Your CRM is now empty and ready for fresh data.');
    } else {
      console.log('\n❌ Warning: Some data may not have been deleted properly.');
      console.log('   Please check the database manually.');
    }

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error('   Details:', error);
  } finally {
    rl.close();
    await sequelize.close();
    process.exit(0);
  }
}

// Run the cleanup
console.clear();
cleanupData();