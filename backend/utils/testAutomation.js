const { Automation, Contact, AutomationEnrollment } = require('../models');
const automationEngineV2 = require('../services/automationEngineV2');
const automationDebugger = require('../services/automationDebugger');

async function testAutomationForContact(automationId, contactId) {
  try {
    console.log('=== TESTING AUTOMATION ===');
    console.log('Automation ID:', automationId);
    console.log('Contact ID:', contactId);
    
    // Enable debug mode
    automationDebugger.setDebugMode(true);
    
    // Get the automation
    const automation = await Automation.findByPk(automationId);
    if (!automation) {
      console.error('Automation not found');
      return;
    }
    
    console.log('Automation:', {
      id: automation.id,
      name: automation.name,
      isActive: automation.isActive,
      trigger: automation.trigger,
      actions: automation.actions,
      isMultiStep: automation.isMultiStep
    });
    
    // Get the contact
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      console.error('Contact not found');
      return;
    }
    
    console.log('Contact:', {
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
      tags: contact.tags,
      email: contact.email
    });
    
    // Check existing enrollments
    const existingEnrollment = await AutomationEnrollment.findOne({
      where: {
        automationId,
        entityType: 'contact',
        entityId: contactId
      }
    });
    
    if (existingEnrollment) {
      console.log('Existing enrollment found:', {
        id: existingEnrollment.id,
        status: existingEnrollment.status,
        enrolledAt: existingEnrollment.enrolledAt,
        nextStepAt: existingEnrollment.nextStepAt
      });
      
      // Force process the enrollment
      console.log('Processing enrollment step...');
      const fullEnrollment = await AutomationEnrollment.findByPk(existingEnrollment.id, {
        include: [{
          model: Automation,
          include: [{
            model: require('../models').AutomationStep,
            as: 'steps'
          }]
        }]
      });
      
      await automationEngineV2.processEnrollmentStep(fullEnrollment);
    } else {
      // Enroll the contact
      console.log('Enrolling contact in automation...');
      const result = await automationEngineV2.enroll(
        automation,
        'contact',
        contactId,
        contact.userId
      );
      
      console.log('Enrollment result:', result);
    }
    
    // Get debug logs
    const debugLogs = automationDebugger.getEntityLogs('contact', contactId);
    console.log('\n=== DEBUG LOGS ===');
    debugLogs.forEach(log => {
      console.log(`[${log.timestamp}] ${log.event}:`, JSON.stringify(log.data, null, 2));
    });
    
  } catch (error) {
    console.error('Test automation error:', error);
    console.error(error.stack);
  }
}

// Allow running from command line
if (require.main === module) {
  const automationId = process.argv[2];
  const contactId = process.argv[3];
  
  if (!automationId || !contactId) {
    console.log('Usage: node testAutomation.js <automationId> <contactId>');
    process.exit(1);
  }
  
  testAutomationForContact(automationId, contactId).then(() => {
    process.exit(0);
  });
}

module.exports = { testAutomationForContact };