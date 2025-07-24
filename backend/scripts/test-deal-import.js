require('dotenv').config();
const { Contact, Deal, Stage, Pipeline } = require('../models');

async function testDealImport() {
  try {
    console.log('🧪 Testing Deal Import Requirements\n');

    // Check current state
    const contactCount = await Contact.count();
    const dealCount = await Deal.count();
    const stageCount = await Stage.count();

    console.log('📊 Current database state:');
    console.log(`   - Contacts: ${contactCount}`);
    console.log(`   - Deals: ${dealCount}`);
    console.log(`   - Stages: ${stageCount}`);
    console.log('');

    // Check if stages exist
    if (stageCount === 0) {
      console.log('❌ No stages found! Deals require stages to be created.');
      console.log('   Please initialize stages first.');
      return;
    }

    // Get first stage
    const firstStage = await Stage.findOne({
      order: [['order', 'ASC']]
    });
    console.log(`✅ Default stage available: ${firstStage.name} (ID: ${firstStage.id})`);

    // Test contact creation
    console.log('\n🧪 Testing contact creation...');
    
    const testContactData = {
      userId: firstStage.userId, // Use the same user as the stage
      firstName: 'Test',
      lastName: 'Contact',
      email: 'test@example.com'
    };

    try {
      const testContact = await Contact.create(testContactData);
      console.log('✅ Contact creation successful');
      console.log(`   Created contact: ${testContact.firstName} ${testContact.lastName}`);
      
      // Clean up test contact
      await testContact.destroy();
      console.log('   (Test contact deleted)');
    } catch (error) {
      console.log('❌ Contact creation failed:', error.message);
    }

    // Check Deal model requirements
    console.log('\n📋 Deal model requirements:');
    const dealModel = Deal.rawAttributes;
    console.log(`   - contactId: ${dealModel.contactId.allowNull ? 'Optional' : 'REQUIRED'}`);
    console.log(`   - stageId: ${dealModel.stageId.allowNull ? 'Optional' : 'REQUIRED'}`);
    console.log(`   - name: ${dealModel.name.allowNull ? 'Optional' : 'REQUIRED'}`);

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await require('../models').sequelize.close();
    process.exit(0);
  }
}

testDealImport();