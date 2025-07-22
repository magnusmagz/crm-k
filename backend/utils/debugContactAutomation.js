const { AutomationLog, AutomationEnrollment, Automation, Contact } = require('../models');
const { Op } = require('sequelize');
const automationDebugger = require('../services/automationDebugger');

async function debugContactAutomation(contactId, userId) {
  console.log(`\n=== Debugging Automation for Contact: ${contactId} ===\n`);

  try {
    // 1. Find the contact
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });

    if (!contact) {
      console.log('❌ Contact not found');
      return;
    }

    console.log('✅ Contact found:', {
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      company: contact.company,
      tags: contact.tags,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    });

    // 2. Check automation enrollments for this contact
    console.log('\n=== Checking Automation Enrollments ===\n');
    const enrollments = await AutomationEnrollment.findAll({
      where: {
        entityType: 'contact',
        entityId: contactId,
        userId
      },
      include: [{
        model: Automation,
        attributes: ['id', 'name', 'trigger', 'isActive', 'isMultiStep', 'conditions', 'actions']
      }],
      order: [['createdAt', 'DESC']]
    });

    if (enrollments.length === 0) {
      console.log('❌ No automation enrollments found for this contact');
    } else {
      console.log(`✅ Found ${enrollments.length} enrollment(s):\n`);
      
      for (const enrollment of enrollments) {
        console.log(`Enrollment ID: ${enrollment.id}`);
        console.log(`Automation: ${enrollment.Automation?.name || 'Unknown'} (ID: ${enrollment.automationId})`);
        console.log(`Status: ${enrollment.status}`);
        console.log(`Current Step: ${enrollment.currentStepIndex}`);
        console.log(`Enrolled At: ${enrollment.enrolledAt}`);
        console.log(`Next Step At: ${enrollment.nextStepAt}`);
        console.log(`Completed At: ${enrollment.completedAt || 'Not completed'}`);
        
        if (enrollment.metadata?.error || enrollment.metadata?.failureReason) {
          console.log(`❌ Error: ${enrollment.metadata.error || enrollment.metadata.failureReason}`);
        }
        
        if (enrollment.Automation) {
          console.log(`\nAutomation Details:`);
          console.log(`- Trigger: ${JSON.stringify(enrollment.Automation.trigger)}`);
          console.log(`- Is Active: ${enrollment.Automation.isActive}`);
          console.log(`- Is Multi-Step: ${enrollment.Automation.isMultiStep}`);
          console.log(`- Conditions: ${JSON.stringify(enrollment.Automation.conditions, null, 2)}`);
          console.log(`- Actions: ${JSON.stringify(enrollment.Automation.actions, null, 2)}`);
        }
        console.log('\n---\n');
      }
    }

    // 3. Check automation logs
    console.log('\n=== Checking Automation Logs ===\n');
    
    // Find all automation logs that might be related to this contact
    const logs = await AutomationLog.findAll({
      where: {
        userId,
        [Op.or]: [
          { triggerData: { contact: { id: contactId } } },
          { triggerData: { contactId: contactId } },
          { triggerData: { entityId: contactId } },
          { actionsExecuted: { [Op.contains]: contactId } }
        ]
      },
      include: [{
        model: Automation,
        attributes: ['id', 'name']
      }],
      order: [['executedAt', 'DESC']],
      limit: 20
    });

    if (logs.length === 0) {
      console.log('❌ No automation logs found for this contact');
    } else {
      console.log(`✅ Found ${logs.length} log(s):\n`);
      
      for (const log of logs) {
        console.log(`Log ID: ${log.id}`);
        console.log(`Automation: ${log.Automation?.name || 'Unknown'} (ID: ${log.automationId})`);
        console.log(`Status: ${log.status}`);
        console.log(`Trigger Type: ${log.triggerType}`);
        console.log(`Executed At: ${log.executedAt}`);
        console.log(`Conditions Met: ${log.conditionsMet}`);
        
        if (log.conditionsEvaluated && log.conditionsEvaluated.length > 0) {
          console.log(`Conditions Evaluated:`);
          log.conditionsEvaluated.forEach(cond => {
            console.log(`  - ${cond.field} ${cond.operator} ${cond.value}: ${cond.result ? '✅' : '❌'}`);
          });
        }
        
        if (log.actionsExecuted && log.actionsExecuted.length > 0) {
          console.log(`Actions Executed:`);
          log.actionsExecuted.forEach(action => {
            console.log(`  - ${action.type}: ${action.status} ${action.error ? `(Error: ${action.error})` : ''}`);
          });
        }
        
        if (log.error) {
          console.log(`❌ Error: ${log.error}`);
        }
        
        console.log('\n---\n');
      }
    }

    // 4. Check in-memory debug logs
    console.log('\n=== Checking In-Memory Debug Logs ===\n');
    const debugLogs = automationDebugger.getEntityLogs('contact', contactId, 100);
    
    if (debugLogs.length === 0) {
      console.log('❌ No in-memory debug logs found (debug mode may be disabled)');
      console.log('💡 To enable debug mode, set AUTOMATION_DEBUG=true in environment variables');
    } else {
      console.log(`✅ Found ${debugLogs.length} debug log(s):\n`);
      
      debugLogs.forEach(log => {
        console.log(`[${log.timestamp}] ${log.event}: ${JSON.stringify(log.data, null, 2)}`);
      });
    }

    // 5. Find all automations that could potentially target this contact
    console.log('\n=== Checking Applicable Automations ===\n');
    const allAutomations = await Automation.findAll({
      where: {
        userId,
        isActive: true,
        [Op.or]: [
          { trigger: { type: 'contact_created' } },
          { trigger: { type: 'contact_updated' } }
        ]
      }
    });

    console.log(`Found ${allAutomations.length} active contact automation(s):`);
    for (const automation of allAutomations) {
      console.log(`\n- ${automation.name} (ID: ${automation.id})`);
      console.log(`  Trigger: ${automation.trigger.type}`);
      console.log(`  Created: ${automation.createdAt}`);
      
      // Check if this contact would meet the conditions
      if (automation.conditions && automation.conditions.length > 0) {
        console.log(`  Conditions:`);
        for (const condition of automation.conditions) {
          const fieldValue = contact[condition.field];
          const wouldPass = evaluateCondition(condition, contact);
          console.log(`    - ${condition.field} ${condition.operator} ${condition.value}: ${wouldPass ? '✅ Would pass' : '❌ Would fail'} (current value: ${fieldValue})`);
        }
      }
    }

  } catch (error) {
    console.error('Error debugging automation:', error);
  }
}

function evaluateCondition(condition, entity) {
  const fieldValue = entity[condition.field];
  const targetValue = condition.value;
  
  switch (condition.operator) {
    case 'equals':
      return fieldValue == targetValue;
    case 'not_equals':
      return fieldValue != targetValue;
    case 'contains':
      return fieldValue && fieldValue.toString().includes(targetValue);
    case 'not_contains':
      return !fieldValue || !fieldValue.toString().includes(targetValue);
    case 'is_empty':
      return !fieldValue || fieldValue === '';
    case 'is_not_empty':
      return fieldValue && fieldValue !== '';
    case 'greater_than':
      return parseFloat(fieldValue) > parseFloat(targetValue);
    case 'less_than':
      return parseFloat(fieldValue) < parseFloat(targetValue);
    case 'has_tag':
      return entity.tags && entity.tags.includes(targetValue);
    case 'not_has_tag':
      return !entity.tags || !entity.tags.includes(targetValue);
    default:
      return false;
  }
}

// If running directly
if (require.main === module) {
  const contactId = process.argv[2];
  const userId = process.argv[3];
  
  if (!contactId || !userId) {
    console.log('Usage: node debugContactAutomation.js <contactId> <userId>');
    process.exit(1);
  }
  
  debugContactAutomation(contactId, userId).then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { debugContactAutomation };