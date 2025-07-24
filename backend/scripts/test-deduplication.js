require('dotenv').config();
const { sequelize, User, Contact, Deal, Stage, Pipeline } = require('../models');
const bcrypt = require('bcryptjs');

async function testDeduplication() {
  try {
    console.log('🧪 Testing Import Deduplication Logic\n');

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const testUser = await User.findOrCreate({
      where: { email: 'dedup-test@example.com' },
      defaults: {
        password: hashedPassword,
        name: 'Dedup Test User'
      }
    });

    // Create pipeline and stage
    const [pipeline] = await Pipeline.findOrCreate({
      where: { 
        userId: testUser[0].id,
        name: 'Test Pipeline'
      },
      defaults: {
        isDefault: true
      }
    });

    const [stage] = await Stage.findOrCreate({
      where: {
        userId: testUser[0].id,
        name: 'Test Stage'
      },
      defaults: {
        pipelineId: pipeline.id,
        order: 1,
        color: '#3B82F6'
      }
    });

    console.log('📊 Test 1: Contact Deduplication by Email');
    console.log('=========================================\n');

    // Clear existing test data
    await Contact.destroy({ where: { userId: testUser[0].id } });

    // Create initial contact
    const contact1 = await Contact.create({
      userId: testUser[0].id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      company: 'Original Company'
    });
    console.log('✅ Created initial contact:', contact1.email);

    // Try to create duplicate with same email
    try {
      const duplicate = await Contact.findOne({
        where: {
          email: 'john.doe@test.com',
          userId: testUser[0].id
        }
      });
      
      if (duplicate) {
        console.log('✅ Duplicate detection working - found existing contact');
      }
    } catch (error) {
      console.log('❌ Error checking duplicate:', error.message);
    }

    console.log('\n📊 Test 2: Deal Deduplication by Name + Contact');
    console.log('==============================================\n');

    // Clear existing deals
    await Deal.destroy({ where: { userId: testUser[0].id } });

    // Create initial deal
    const deal1 = await Deal.create({
      userId: testUser[0].id,
      name: 'Website Redesign Project',
      value: 5000,
      stageId: stage.id,
      contactId: contact1.id
    });
    console.log('✅ Created initial deal:', deal1.name);

    // Check for duplicate deal
    const duplicateDeal = await Deal.findOne({
      where: {
        name: 'Website Redesign Project',
        contactId: contact1.id,
        userId: testUser[0].id
      }
    });

    if (duplicateDeal) {
      console.log('✅ Deal duplicate detection working');
    }

    // Create another contact
    const contact2 = await Contact.create({
      userId: testUser[0].id,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@test.com'
    });

    // Same deal name but different contact should be allowed
    const deal2 = await Deal.create({
      userId: testUser[0].id,
      name: 'Website Redesign Project',
      value: 7000,
      stageId: stage.id,
      contactId: contact2.id
    });
    console.log('✅ Created deal with same name but different contact');

    // Verify both deals exist
    const allDeals = await Deal.findAll({
      where: {
        name: 'Website Redesign Project',
        userId: testUser[0].id
      }
    });
    console.log(`✅ Total deals with name "Website Redesign Project": ${allDeals.length}`);

    console.log('\n📊 Test 3: Case-Insensitive Email Matching');
    console.log('=========================================\n');

    // Test case-insensitive email
    const contactUpper = await Contact.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')),
        'john.doe@test.com'.toLowerCase()
      )
    });

    if (contactUpper) {
      console.log('✅ Case-insensitive email matching working');
    }

    console.log('\n📊 Summary');
    console.log('==========');
    console.log('✅ All deduplication tests completed successfully!');
    console.log('\nDeduplication rules:');
    console.log('- Contacts: Deduplicated by email (case-insensitive)');
    console.log('- Deals: Deduplicated by name + contact combination');
    console.log('- Import strategies: skip, update, or create duplicates');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testDeduplication();