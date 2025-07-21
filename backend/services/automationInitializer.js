const automationEmitter = require('./eventEmitter');
const automationEngine = require('./automationEngine');
const automationEngineV2 = require('./automationEngineV2');

// Initialize automation system
function initializeAutomations() {
  // Initialize the V2 engine for multi-step workflows
  automationEngineV2.initialize();

  // Keep the old engine as fallback for legacy single-step automations
  // The event emitter now handles enrollment through automationEnrollmentService
  
  console.log('Automation system initialized with multi-step support');
}

module.exports = { initializeAutomations };