const { Automation, AutomationEnrollment, AutomationLog, Contact } = require('./backend/models');
const { Op } = require('sequelize');

async function debugAutomation() {
  try {
    const contactId = '81eba132-9b63-4c57-846f-d30ca6645e19';
    
    // Check if contact exists
    const contact = await Contact.findByPk(contactId);
    console.log('\n=== CONTACT INFO ===');
    if (contact) {
      console.log('Contact found:', {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        tags: contact.tags,
        createdAt: contact.createdAt
      });
    } else {
      console.log('Contact not found!');
      return;
    }
    
    // Find all enrollments for this contact
    console.log('\n=== ENROLLMENTS ===');
    const enrollments = await AutomationEnrollment.findAll({
      where: {
        entityType: 'contact',
        entityId: contactId
      },
      include: [{
        model: Automation,
        attributes: ['id', 'name', 'trigger', 'isActive', 'actions']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Found ${enrollments.length} enrollments`);
    enrollments.forEach(enrollment => {
      console.log('\nEnrollment:', {
        id: enrollment.id,
        automationName: enrollment.Automation?.name,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        nextStepAt: enrollment.nextStepAt,
        currentStepIndex: enrollment.currentStepIndex,
        metadata: enrollment.metadata
      });
      
      if (enrollment.Automation) {
        console.log('Automation details:', {
          id: enrollment.Automation.id,
          trigger: enrollment.Automation.trigger,
          isActive: enrollment.Automation.isActive,
          actions: enrollment.Automation.actions
        });
      }
    });
    
    // Find recent automation logs
    console.log('\n=== RECENT LOGS ===');
    const recentTime = new Date();
    recentTime.setMinutes(recentTime.getMinutes() - 30); // Last 30 minutes
    
    const logs = await AutomationLog.findAll({
      where: {
        executedAt: {
          [Op.gte]: recentTime
        },
        [Op.or]: [
          { triggerData: { [Op.contains]: { entityId: contactId } } },
          { triggerData: { [Op.contains]: { contact: { id: contactId } } } }
        ]
      },
      order: [['executedAt', 'DESC']],
      limit: 10
    });
    
    console.log(`Found ${logs.length} recent logs`);
    logs.forEach(log => {
      console.log('\nLog:', {
        automationId: log.automationId,
        status: log.status,
        triggerType: log.triggerType,
        error: log.error,
        executedAt: log.executedAt,
        triggerData: JSON.stringify(log.triggerData, null, 2)
      });
    });
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    process.exit();
  }
}

debugAutomation();