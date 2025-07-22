require('dotenv').config();
const { sequelize, Automation, AutomationLog, Contact } = require('../models');

async function debugAutomation(automationId, contactId) {
  try {
    console.log('🔍 Debugging Automation:', automationId);
    console.log('📧 Contact ID:', contactId);
    console.log('=' .repeat(60));

    // 1. Get the automation details
    const automation = await Automation.findByPk(automationId);
    if (!automation) {
      console.log('❌ Automation not found!');
      return;
    }

    console.log('\n📋 Automation Details:');
    console.log('Name:', automation.name);
    console.log('Type:', automation.type);
    console.log('Active:', automation.isActive);
    console.log('Trigger:', JSON.stringify(automation.trigger, null, 2));
    console.log('Conditions:', JSON.stringify(automation.conditions, null, 2));
    console.log('Actions:', JSON.stringify(automation.actions, null, 2));

    // 2. Get the contact
    if (contactId) {
      const contact = await Contact.findByPk(contactId);
      if (contact) {
        console.log('\n👤 Contact Details:');
        console.log('Name:', contact.firstName, contact.lastName);
        console.log('Email:', contact.email);
        console.log('Tags:', contact.tags);
        console.log('Custom Fields:', JSON.stringify(contact.customFields || {}, null, 2));
      }
    }

    // 3. Get recent logs for this automation
    console.log('\n📜 Recent Logs for this Automation:');
    const logs = await AutomationLog.findAll({
      where: { automationId },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    if (logs.length === 0) {
      console.log('No logs found');
    } else {
      for (const log of logs) {
        console.log(`\n[${log.createdAt.toISOString()}]`);
        console.log('  Entity:', log.entityType, log.entityId);
        console.log('  Status:', log.status);
        console.log('  Conditions Met:', log.conditionsMet);
        console.log('  Conditions Evaluated:', JSON.stringify(log.conditionsEvaluated, null, 2));
        if (log.error) {
          console.log('  ❌ Error:', log.error);
        }
        if (log.executionDetails) {
          console.log('  Execution Details:', JSON.stringify(log.executionDetails, null, 2));
        }
      }
    }

    // 4. Test condition evaluation manually
    if (contactId && automation.conditions.length > 0) {
      console.log('\n🧪 Manual Condition Test:');
      const contact = await Contact.findByPk(contactId);
      const automationEngine = require('../services/automationEngine');
      
      for (const condition of automation.conditions) {
        const testData = { contact };
        const fieldValue = automationEngine.getFieldValue(condition.field, testData);
        console.log(`\nCondition: ${condition.field} ${condition.operator} "${condition.value}"`);
        console.log(`Field value retrieved: "${fieldValue}"`);
        
        // Test the condition
        const result = await automationEngine.evaluateCondition(condition, testData);
        console.log(`Evaluates to: ${result}`);
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
  const automationId = process.argv[2];
  const contactId = process.argv[3];
  
  if (!automationId) {
    console.log('Usage: node debugSpecificAutomation.js <automationId> [contactId]');
    process.exit(1);
  }
  
  debugAutomation(automationId, contactId);
}

module.exports = { debugAutomation };