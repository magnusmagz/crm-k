require('dotenv').config();
const { sequelize, Contact, Automation, AutomationLog, AutomationEnrollment } = require('../models');

async function debugContactAutomation(contactId) {
  try {
    console.log('🔍 Debugging automation for contact:', contactId);
    console.log('=' .repeat(60));

    // 1. Check if contact exists
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      console.log('❌ Contact not found!');
      return;
    }
    console.log('✅ Contact found:', contact.firstName, contact.lastName);
    console.log('   Email:', contact.email);
    console.log('   Tags:', contact.tags || 'none');
    console.log('   Custom Fields:', JSON.stringify(contact.customFields || {}, null, 2));
    console.log();

    // 2. Check automation logs for this contact
    console.log('📋 Recent Automation Logs:');
    console.log('-' .repeat(60));
    
    const logs = await AutomationLog.findAll({
      where: {
        entityId: contactId,
        entityType: 'contact'
      },
      include: [{
        model: Automation,
        as: 'automation',
        attributes: ['name', 'trigger']
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    if (logs.length === 0) {
      console.log('No automation logs found for this contact');
    } else {
      for (const log of logs) {
        console.log(`\n[${log.createdAt.toISOString()}] ${log.automation.name}`);
        console.log(`  Status: ${log.status}`);
        console.log(`  Conditions Met: ${log.conditionsMet}`);
        if (log.error) {
          console.log(`  Error: ${log.error}`);
        }
        if (log.executionDetails) {
          console.log(`  Details: ${JSON.stringify(log.executionDetails, null, 2)}`);
        }
      }
    }

    // 3. Check active enrollments
    console.log('\n\n📊 Active Enrollments:');
    console.log('-' .repeat(60));
    
    const enrollments = await AutomationEnrollment.findAll({
      where: {
        entityId: contactId,
        entityType: 'contact',
        status: ['active', 'waiting']
      },
      include: [{
        model: Automation,
        as: 'automation',
        attributes: ['name', 'type']
      }],
      order: [['createdAt', 'DESC']]
    });

    if (enrollments.length === 0) {
      console.log('No active enrollments found');
    } else {
      for (const enrollment of enrollments) {
        console.log(`\n${enrollment.automation.name} (${enrollment.automation.type})`);
        console.log(`  Status: ${enrollment.status}`);
        console.log(`  Current Step: ${enrollment.currentStepIndex}`);
        console.log(`  Started: ${enrollment.startedAt}`);
        console.log(`  Next Step At: ${enrollment.nextStepAt || 'N/A'}`);
      }
    }

    // 4. Check which automations this contact could trigger
    console.log('\n\n🎯 Applicable Automations:');
    console.log('-' .repeat(60));
    
    const automations = await Automation.findAll({
      where: {
        isActive: true,
        userId: contact.userId
      }
    });

    for (const automation of automations) {
      const trigger = automation.trigger;
      const applicable = trigger.type.includes('contact');
      
      if (applicable) {
        console.log(`\n${automation.name}`);
        console.log(`  Trigger: ${trigger.type}`);
        console.log(`  Conditions: ${automation.conditions.length} condition(s)`);
        
        // Evaluate conditions
        const automationEnrollmentService = require('../services/automationEnrollmentService');
        const conditionsMet = automationEnrollmentService.evaluateConditions(
          automation.conditions,
          contact,
          trigger.type,
          { contact }
        );
        
        console.log(`  Would trigger: ${conditionsMet ? 'YES ✅' : 'NO ❌'}`);
        
        if (!conditionsMet && automation.conditions.length > 0) {
          console.log('  Failed conditions:');
          for (const condition of automation.conditions) {
            const value = getFieldValue(condition.field, contact);
            console.log(`    - ${condition.field} ${condition.operator} ${condition.value}`);
            console.log(`      (actual value: ${value})`);
          }
        }
      }
    }

    console.log('\n\n✅ Debug complete!');
    
  } catch (error) {
    console.error('Error debugging automation:', error);
  } finally {
    await sequelize.close();
  }
}

function getFieldValue(field, entity) {
  const parts = field.split('.');
  let value = entity;
  
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return null;
    }
  }
  
  return value;
}

// Run if called directly
if (require.main === module) {
  const contactId = process.argv[2];
  if (!contactId) {
    console.log('Usage: node debugAutomation.js <contactId>');
    process.exit(1);
  }
  debugContactAutomation(contactId);
}

module.exports = { debugContactAutomation };