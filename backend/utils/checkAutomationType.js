require('dotenv').config();
const { sequelize, Automation, AutomationStep } = require('../models');

async function checkAutomationType(automationId) {
  try {
    const automation = await Automation.findByPk(automationId, {
      include: [{
        model: AutomationStep,
        as: 'steps'
      }]
    });

    if (!automation) {
      console.log('Automation not found');
      return;
    }

    console.log('Automation Details:');
    console.log('ID:', automation.id);
    console.log('Name:', automation.name);
    console.log('Type:', automation.type);
    console.log('IsMultiStep:', automation.isMultiStep);
    console.log('IsActive:', automation.isActive);
    console.log('Has Steps:', automation.steps ? automation.steps.length : 0);
    
    if (automation.steps && automation.steps.length > 0) {
      console.log('\nSteps:');
      automation.steps.forEach((step, idx) => {
        console.log(`  ${idx + 1}. ${step.name || 'Unnamed'}`);
      });
    }

    // Check if type and isMultiStep are consistent
    if (automation.type === 'multi_step' && !automation.isMultiStep) {
      console.log('\n⚠️  WARNING: Inconsistent state - type is multi_step but isMultiStep is false');
    }
    if (automation.type === 'single' && automation.isMultiStep) {
      console.log('\n⚠️  WARNING: Inconsistent state - type is single but isMultiStep is true');
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
  if (!automationId) {
    console.log('Usage: node checkAutomationType.js <automationId>');
    process.exit(1);
  }
  checkAutomationType(automationId);
}

module.exports = { checkAutomationType };