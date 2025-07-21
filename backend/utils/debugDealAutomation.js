const { Deal, Automation, AutomationEnrollment, AutomationLog, Stage } = require('../models');
const { Op } = require('sequelize');

async function debugDealAutomation(dealId) {
  try {
    console.log('\n=== DEBUGGING DEAL AUTOMATION ===');
    console.log('Deal ID:', dealId);
    
    // Get the deal
    const deal = await Deal.findByPk(dealId, {
      include: ['Contact', 'Stage']
    });
    
    if (!deal) {
      console.log('Deal not found!');
      return;
    }
    
    console.log('\n=== DEAL INFO ===');
    console.log('Deal:', {
      id: deal.id,
      name: deal.name,
      value: deal.value,
      status: deal.status,
      stageId: deal.stageId,
      stageName: deal.Stage?.name,
      userId: deal.userId,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt
    });
    
    // Find all enrollments for this deal
    console.log('\n=== ENROLLMENTS ===');
    const enrollments = await AutomationEnrollment.findAll({
      where: {
        entityType: 'deal',
        entityId: dealId
      },
      include: [{
        model: Automation,
        attributes: ['id', 'name', 'trigger', 'isActive', 'actions', 'conditions']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Found ${enrollments.length} enrollments`);
    
    for (const enrollment of enrollments) {
      console.log('\n--- Enrollment ---');
      console.log('ID:', enrollment.id);
      console.log('Status:', enrollment.status);
      console.log('Enrolled At:', enrollment.enrolledAt);
      console.log('Completed At:', enrollment.completedAt);
      console.log('Next Step At:', enrollment.nextStepAt);
      console.log('Current Step:', enrollment.currentStepIndex);
      console.log('Metadata:', JSON.stringify(enrollment.metadata, null, 2));
      
      if (enrollment.Automation) {
        console.log('\nAutomation:', {
          id: enrollment.Automation.id,
          name: enrollment.Automation.name,
          isActive: enrollment.Automation.isActive,
          trigger: enrollment.Automation.trigger,
          conditions: enrollment.Automation.conditions,
          actions: enrollment.Automation.actions
        });
      }
    }
    
    // Find recent automation logs
    console.log('\n=== RECENT AUTOMATION LOGS ===');
    const recentTime = new Date();
    recentTime.setHours(recentTime.getHours() - 1); // Last hour
    
    const logs = await AutomationLog.findAll({
      where: {
        [Op.or]: [
          { 
            triggerData: { 
              [Op.contains]: { entityId: dealId } 
            } 
          },
          { 
            triggerData: { 
              [Op.contains]: { 
                deal: { id: dealId } 
              } 
            } 
          }
        ],
        executedAt: {
          [Op.gte]: recentTime
        }
      },
      order: [['executedAt', 'DESC']],
      limit: 10
    });
    
    console.log(`Found ${logs.length} recent logs`);
    
    for (const log of logs) {
      console.log('\n--- Log Entry ---');
      console.log('Automation ID:', log.automationId);
      console.log('Status:', log.status);
      console.log('Trigger Type:', log.triggerType);
      console.log('Conditions Met:', log.conditionsMet);
      console.log('Executed At:', log.executedAt);
      
      if (log.error) {
        console.log('ERROR:', log.error);
      }
      
      if (log.actionsExecuted && log.actionsExecuted.length > 0) {
        console.log('Actions Executed:', JSON.stringify(log.actionsExecuted, null, 2));
      }
      
      console.log('Trigger Data:', JSON.stringify(log.triggerData, null, 2));
    }
    
    // Check for any deal automations
    console.log('\n=== AVAILABLE DEAL AUTOMATIONS ===');
    const dealAutomations = await Automation.findAll({
      where: {
        userId: deal.userId,
        isActive: true,
        trigger: {
          [Op.or]: [
            { type: 'deal_created' },
            { type: 'deal_updated' },
            { type: 'deal_stage_changed' }
          ]
        }
      }
    });
    
    console.log(`Found ${dealAutomations.length} active deal automations for this user`);
    
    for (const automation of dealAutomations) {
      console.log('\n--- Automation ---');
      console.log('ID:', automation.id);
      console.log('Name:', automation.name);
      console.log('Trigger:', JSON.stringify(automation.trigger, null, 2));
      console.log('Has Conditions:', automation.conditions?.length > 0);
      console.log('Actions Count:', automation.actions?.length || 0);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
    console.error(error.stack);
  } finally {
    process.exit();
  }
}

// Allow running from command line
if (require.main === module) {
  const dealId = process.argv[2];
  
  if (!dealId) {
    console.log('Usage: node debugDealAutomation.js <dealId>');
    process.exit(1);
  }
  
  debugDealAutomation(dealId);
}

module.exports = { debugDealAutomation };