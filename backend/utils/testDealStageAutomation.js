const { Deal, Stage, Automation, AutomationEnrollment } = require('../models');
const automationEmitter = require('../services/eventEmitter');
const automationDebugger = require('../services/automationDebugger');

async function testDealStageAutomation(dealId, newStageId) {
  try {
    console.log('\n=== TESTING DEAL STAGE CHANGE AUTOMATION ===');
    console.log('Deal ID:', dealId);
    console.log('New Stage ID:', newStageId);
    
    // Enable debug mode
    automationDebugger.setDebugMode(true);
    
    // Get the deal
    const deal = await Deal.findByPk(dealId, {
      include: ['Contact', 'Stage']
    });
    
    if (!deal) {
      console.error('Deal not found');
      return;
    }
    
    console.log('\nDeal found:', {
      id: deal.id,
      name: deal.name,
      currentStageId: deal.stageId,
      currentStageName: deal.Stage?.name,
      hasContact: !!deal.Contact,
      contactName: deal.Contact ? `${deal.Contact.firstName} ${deal.Contact.lastName}` : 'No contact'
    });
    
    // Get the new stage
    const newStage = await Stage.findByPk(newStageId);
    if (!newStage) {
      console.error('New stage not found');
      return;
    }
    
    console.log('\nNew stage:', {
      id: newStage.id,
      name: newStage.name
    });
    
    // Store previous stage info
    const previousStage = deal.Stage;
    const previousStageId = deal.stageId;
    
    // Update the deal's stage
    console.log('\nUpdating deal stage...');
    await deal.update({ stageId: newStageId });
    
    // Reload with associations
    await deal.reload({
      include: ['Contact', 'Stage']
    });
    
    // Emit the stage change event
    console.log('\nEmitting stage change event...');
    automationEmitter.emitDealStageChanged(
      deal.userId,
      deal.toJSON(),
      previousStage?.toJSON(),
      newStage.toJSON()
    );
    
    // Wait a bit for the event to be processed
    console.log('\nWaiting for automation to process...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for enrollments
    console.log('\n=== CHECKING ENROLLMENTS ===');
    const enrollments = await AutomationEnrollment.findAll({
      where: {
        entityType: 'deal',
        entityId: dealId
      },
      include: [{
        model: Automation,
        attributes: ['id', 'name', 'trigger', 'actions']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`\nFound ${enrollments.length} enrollments`);
    
    for (const enrollment of enrollments) {
      console.log('\nEnrollment:', {
        id: enrollment.id,
        automationName: enrollment.Automation?.name,
        automationId: enrollment.automationId,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        metadata: enrollment.metadata
      });
      
      if (enrollment.Automation) {
        console.log('Automation trigger:', enrollment.Automation.trigger);
        console.log('Automation actions:', enrollment.Automation.actions);
      }
    }
    
    // Get debug logs
    const logs = automationDebugger.getEntityLogs('deal', dealId);
    console.log('\n=== DEBUG LOGS ===');
    console.log(`Found ${logs.length} debug logs`);
    
    logs.slice(-20).forEach(log => {
      console.log(`\n[${log.timestamp}] ${log.event} (${log.level}):`);
      console.log(JSON.stringify(log.data, null, 2));
    });
    
  } catch (error) {
    console.error('Test error:', error);
    console.error(error.stack);
  } finally {
    process.exit();
  }
}

// Allow running from command line
if (require.main === module) {
  const dealId = process.argv[2];
  const newStageId = process.argv[3];
  
  if (!dealId || !newStageId) {
    console.log('Usage: node testDealStageAutomation.js <dealId> <newStageId>');
    process.exit(1);
  }
  
  testDealStageAutomation(dealId, newStageId);
}

module.exports = { testDealStageAutomation };