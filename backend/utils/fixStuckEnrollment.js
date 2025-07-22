require('dotenv').config();
const { sequelize, AutomationEnrollment, Automation, AutomationStep } = require('../models');
const automationEngineV2 = require('../services/automationEngineV2');

async function fixStuckEnrollment(contactId) {
  try {
    console.log('🔧 Checking for stuck enrollments for contact:', contactId);
    
    // Find active enrollments for this contact
    const enrollments = await AutomationEnrollment.findAll({
      where: {
        entityId: contactId,
        entityType: 'contact',
        status: 'active'
      },
      include: [{
        model: Automation,
        as: 'automation',
        include: [{
          model: AutomationStep,
          as: 'steps'
        }]
      }]
    });

    if (enrollments.length === 0) {
      console.log('No active enrollments found');
      return;
    }

    console.log(`Found ${enrollments.length} active enrollment(s)`);

    for (const enrollment of enrollments) {
      const automation = enrollment.automation;
      console.log(`\n📋 Processing: ${automation.name}`);
      console.log(`   Type: ${automation.type || 'single'}`);
      console.log(`   IsMultiStep: ${automation.isMultiStep}`);
      console.log(`   Status: ${enrollment.status}`);
      
      // For single-step automations that haven't been processed
      if (!automation.isMultiStep && !enrollment.startedAt) {
        console.log('   ⚠️  Single-step automation not processed! Processing now...');
        
        try {
          await automationEngineV2.processEnrollmentStep(enrollment);
          console.log('   ✅ Successfully processed!');
        } catch (error) {
          console.error('   ❌ Error processing:', error.message);
        }
      }
      
      // For multi-step automations that are overdue
      else if (automation.isMultiStep && enrollment.nextStepAt) {
        const now = new Date();
        const nextStepTime = new Date(enrollment.nextStepAt);
        
        if (nextStepTime < now) {
          console.log(`   ⚠️  Multi-step automation overdue by ${Math.floor((now - nextStepTime) / 1000 / 60)} minutes`);
          console.log('   Processing next step...');
          
          try {
            await automationEngineV2.processEnrollmentStep(enrollment);
            console.log('   ✅ Successfully processed!');
          } catch (error) {
            console.error('   ❌ Error processing:', error.message);
          }
        }
      }
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
  if (!contactId) {
    console.log('Usage: node fixStuckEnrollment.js <contactId>');
    process.exit(1);
  }
  fixStuckEnrollment(contactId);
}

module.exports = { fixStuckEnrollment };