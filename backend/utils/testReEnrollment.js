require('dotenv').config();
const { sequelize, Contact, Automation, AutomationEnrollment } = require('../models');
const automationEngineV2 = require('../services/automationEngineV2');

async function testReEnrollment(contactId, automationId) {
  try {
    console.log('🔄 Testing Re-enrollment');
    console.log('='.repeat(60));

    // Get contact
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      console.log('❌ Contact not found');
      return;
    }

    // Get automation
    const automation = await Automation.findByPk(automationId);
    if (!automation) {
      console.log('❌ Automation not found');
      return;
    }

    console.log('Contact:', contact.firstName, contact.lastName, '(' + contact.email + ')');
    console.log('Automation:', automation.name);
    console.log();

    // Check existing enrollments
    const enrollments = await AutomationEnrollment.findAll({
      where: {
        automationId: automation.id,
        entityType: 'contact',
        entityId: contact.id
      },
      order: [['createdAt', 'DESC']]
    });

    console.log('Existing Enrollments:');
    for (const enrollment of enrollments) {
      console.log(`  - ID: ${enrollment.id}`);
      console.log(`    Status: ${enrollment.status}`);
      console.log(`    Created: ${enrollment.createdAt}`);
      console.log(`    Completed: ${enrollment.completedAt || 'N/A'}`);
    }
    console.log();

    // Try to enroll
    console.log('Attempting to enroll...');
    const result = await automationEngineV2.enroll(automation, 'contact', contact.id, automation.userId);
    
    if (result.success) {
      console.log('✅ Enrollment successful!');
      console.log('   Enrollment ID:', result.enrollment.id);
      console.log('   Status:', result.enrollment.status);
      console.log('   Is Re-enrollment:', !!enrollments.find(e => e.id === result.enrollment.id));
    } else {
      console.log('❌ Enrollment failed:', result.reason || result.error);
    }

    // Check enrollments again
    console.log('\nEnrollments after attempt:');
    const newEnrollments = await AutomationEnrollment.findAll({
      where: {
        automationId: automation.id,
        entityType: 'contact',
        entityId: contact.id
      },
      order: [['createdAt', 'DESC']]
    });

    for (const enrollment of newEnrollments) {
      console.log(`  - ID: ${enrollment.id}`);
      console.log(`    Status: ${enrollment.status}`);
      console.log(`    Created: ${enrollment.createdAt}`);
      console.log(`    Completed: ${enrollment.completedAt || 'N/A'}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  const contactId = process.argv[2];
  const automationId = process.argv[3];
  
  if (!contactId || !automationId) {
    console.log('Usage: node testReEnrollment.js <contactId> <automationId>');
    process.exit(1);
  }
  
  testReEnrollment(contactId, automationId);
}

module.exports = { testReEnrollment };