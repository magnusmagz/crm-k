const EventEmitter = require('events');
const automationEnrollmentService = require('./automationEnrollmentService');

class AutomationEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners to handle multiple automations
    this.setMaxListeners(100);
    this.setupListeners();
  }

  setupListeners() {
    // Listen for automation triggers and handle enrollments
    this.on('automation:trigger', async (event) => {
      try {
        await automationEnrollmentService.handleTrigger(
          event.type,
          event.userId,
          event.data
        );
      } catch (error) {
        console.error('Error handling automation trigger:', error);
      }
    });
  }

  // Contact Events
  emitContactCreated(userId, contact) {
    this.emit('automation:trigger', {
      type: 'contact_created',
      userId,
      data: {
        contact,
        timestamp: new Date()
      }
    });
  }

  emitContactUpdated(userId, contact, changedFields) {
    this.emit('automation:trigger', {
      type: 'contact_updated',
      userId,
      data: {
        contact,
        changedFields,
        timestamp: new Date()
      }
    });
  }

  // Deal Events
  emitDealCreated(userId, deal) {
    this.emit('automation:trigger', {
      type: 'deal_created',
      userId,
      data: {
        deal,
        timestamp: new Date()
      }
    });
  }

  emitDealUpdated(userId, deal, changedFields) {
    this.emit('automation:trigger', {
      type: 'deal_updated',
      userId,
      data: {
        deal,
        changedFields,
        timestamp: new Date()
      }
    });
  }

  emitDealStageChanged(userId, deal, previousStage, newStage) {
    // Emit both deal_updated and deal_stage_changed
    this.emit('automation:trigger', {
      type: 'deal_stage_changed',
      userId,
      data: {
        deal,
        previousStage,
        newStage,
        timestamp: new Date()
      }
    });

    // Also emit deal_updated with stageId in changedFields
    this.emitDealUpdated(userId, deal, ['stageId']);
  }
}

// Create singleton instance
const automationEmitter = new AutomationEventEmitter();

module.exports = automationEmitter;