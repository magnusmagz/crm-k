require('dotenv').config();
const { sequelize, Contact, AutomationLog, AutomationEnrollment, Automation } = require('../models');

async function debugActionExecution(contactId) {
  try {
    console.log('🔍 Debugging action execution for contact:', contactId);
    console.log('=' .repeat(60));

    // Get the contact
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      console.log('❌ Contact not found!');
      return;
    }

    console.log('✅ Contact found:');
    console.log('   Name:', contact.firstName, contact.lastName);
    console.log('   Email:', contact.email);
    console.log('   Current Tags:', contact.tags || []);
    console.log();

    // Get recent automation logs
    const logs = await AutomationLog.findAll({
      where: {
        entityId: contactId,
        entityType: 'contact'
      },
      include: [{
        model: Automation,
        as: 'automation'
      }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    console.log('📋 Recent Automation Logs:');
    console.log('-' .repeat(60));
    
    for (const log of logs) {
      console.log(`\n[${log.createdAt.toISOString()}] ${log.automation.name}`);
      console.log('  Status:', log.status);
      console.log('  Conditions Met:', log.conditionsMet);
      
      if (log.actionsExecuted && log.actionsExecuted.length > 0) {
        console.log('  Actions Executed:');
        for (const action of log.actionsExecuted) {
          console.log(`    - Type: ${action.type}`);
          console.log(`      Status: ${action.status}`);
          if (action.config) {
            console.log(`      Config: ${JSON.stringify(action.config)}`);
          }
          if (action.error) {
            console.log(`      ❌ Error: ${action.error}`);
          }
        }
      }
      
      if (log.error) {
        console.log('  ❌ Overall Error:', log.error);
      }
      
      if (log.executionDetails) {
        console.log('  Execution Details:', JSON.stringify(log.executionDetails, null, 2));
      }
    }

    // Check active enrollments
    console.log('\n\n📊 Active Enrollments:');
    console.log('-' .repeat(60));
    
    const enrollments = await AutomationEnrollment.findAll({
      where: {
        entityId: contactId,
        entityType: 'contact'
      },
      include: [{
        model: Automation,
        as: 'automation'
      }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    for (const enrollment of enrollments) {
      console.log(`\n${enrollment.automation.name}`);
      console.log('  Enrollment Status:', enrollment.status);
      console.log('  Enrollment Created:', enrollment.enrolledAt);
      console.log('  Automation Actions:', JSON.stringify(enrollment.automation.actions, null, 2));
      
      if (enrollment.metadata && enrollment.metadata.error) {
        console.log('  ❌ Enrollment Error:', enrollment.metadata.error);
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
    console.log('Usage: node debugActionExecution.js <contactId>');
    process.exit(1);
  }
  debugActionExecution(contactId);
}

module.exports = { debugActionExecution };