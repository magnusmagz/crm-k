require('dotenv').config();
const { sequelize, Contact, Automation, AutomationEnrollment, AutomationStep } = require('../models');

async function debugEnrollment(contactId) {
  try {
    console.log('🔍 Debugging Enrollments for Contact:', contactId);
    console.log('=' .repeat(60));

    // Get all enrollments for this contact
    const enrollments = await AutomationEnrollment.findAll({
      where: {
        entityId: contactId,
        entityType: 'contact'
      },
      include: [{
        model: Automation,
        as: 'automation',
        include: [{
          model: AutomationStep,
          as: 'steps'
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    if (enrollments.length === 0) {
      console.log('No enrollments found for this contact');
      return;
    }

    console.log(`\nFound ${enrollments.length} enrollment(s):\n`);

    for (const enrollment of enrollments) {
      const automation = enrollment.automation;
      console.log(`📋 Automation: ${automation.name}`);
      console.log(`   ID: ${automation.id}`);
      console.log(`   Type: ${automation.type}`);
      console.log(`   Active: ${automation.isActive}`);
      console.log(`\n   Enrollment Details:`);
      console.log(`   - Status: ${enrollment.status}`);
      console.log(`   - Enrolled At: ${enrollment.enrolledAt}`);
      console.log(`   - Started At: ${enrollment.startedAt || 'Not started'}`);
      console.log(`   - Completed At: ${enrollment.completedAt || 'Not completed'}`);
      console.log(`   - Current Step Index: ${enrollment.currentStepIndex}`);
      console.log(`   - Next Step At: ${enrollment.nextStepAt || 'N/A'}`);
      
      if (automation.type === 'multi_step' && automation.steps) {
        console.log(`\n   Steps (${automation.steps.length} total):`);
        automation.steps.forEach((step, index) => {
          const isCurrent = index === enrollment.currentStepIndex;
          const isCompleted = index < enrollment.currentStepIndex;
          const status = isCompleted ? '✅' : (isCurrent ? '👉' : '⏳');
          console.log(`   ${status} Step ${index + 1}: ${step.name || 'Unnamed step'}`);
          if (step.delay) {
            console.log(`      Delay: ${step.delay.value} ${step.delay.unit}`);
          }
        });
      }

      // Check if enrollment is stuck
      if (enrollment.status === 'active' && enrollment.nextStepAt) {
        const now = new Date();
        const nextStepTime = new Date(enrollment.nextStepAt);
        if (nextStepTime < now) {
          console.log(`\n   ⚠️  WARNING: This enrollment appears to be stuck!`);
          console.log(`      Next step was due at: ${nextStepTime}`);
          console.log(`      Current time: ${now}`);
          console.log(`      Overdue by: ${Math.floor((now - nextStepTime) / 1000 / 60)} minutes`);
        }
      }

      // Check for single-step automations that should execute immediately
      if (automation.type === 'single' && enrollment.status === 'active' && !enrollment.startedAt) {
        console.log(`\n   ⚠️  WARNING: Single-step automation enrolled but not executed!`);
        console.log(`      This automation should have executed immediately upon enrollment.`);
      }

      console.log('\n' + '-'.repeat(60));
    }

    // Get the contact to check current state
    const contact = await Contact.findByPk(contactId);
    if (contact) {
      console.log('\n👤 Current Contact State:');
      console.log(`   Email: ${contact.email}`);
      console.log(`   Tags: ${JSON.stringify(contact.tags || [])}`);
      console.log(`   Custom Fields: ${JSON.stringify(contact.customFields || {})}`);
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
    console.log('Usage: node debugEnrollment.js <contactId>');
    process.exit(1);
  }
  debugEnrollment(contactId);
}

module.exports = { debugEnrollment };