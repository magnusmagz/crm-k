const automationEmitter = require('./eventEmitter');
const automationEngine = require('./automationEngine');

// Initialize automation system
function initializeAutomations() {
  // Listen for automation triggers
  automationEmitter.on('automation:trigger', async (event) => {
    try {
      await automationEngine.processEvent(event);
    } catch (error) {
      console.error('Error processing automation trigger:', error);
    }
  });

  console.log('Automation system initialized');
}

module.exports = { initializeAutomations };