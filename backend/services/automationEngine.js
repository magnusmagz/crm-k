const { Automation, AutomationLog, Contact, Deal, Stage } = require('../models');
const { Op } = require('sequelize');

class AutomationEngine {
  constructor() {
    this.actionHandlers = {
      'update_contact_field': this.updateContactField.bind(this),
      'add_contact_tag': this.addContactTag.bind(this),
      'update_deal_field': this.updateDealField.bind(this),
      'move_deal_to_stage': this.moveDealToStage.bind(this),
      'update_custom_field': this.updateCustomField.bind(this)
    };
  }

  async processEvent(event) {
    const { type, userId, data } = event;

    try {
      // Find all active automations for this user and trigger type
      const automations = await Automation.findAll({
        where: {
          userId,
          isActive: true,
          [Op.and]: [
            { trigger: { [Op.contains]: { type } } }
          ]
        }
      });

      // Process each automation
      for (const automation of automations) {
        await this.executeAutomation(automation, event);
      }
    } catch (error) {
      console.error('Error processing automation event:', error);
    }
  }

  async executeAutomation(automation, event) {
    const log = {
      automationId: automation.id,
      userId: automation.userId,
      triggerType: event.type,
      triggerData: event.data,
      conditionsMet: true,
      conditionsEvaluated: [],
      actionsExecuted: [],
      status: 'success'
    };

    try {
      // Evaluate conditions
      if (automation.conditions && automation.conditions.length > 0) {
        log.conditionsMet = await this.evaluateConditions(
          automation.conditions,
          event.data,
          log.conditionsEvaluated
        );
      }

      if (!log.conditionsMet) {
        log.status = 'skipped';
        await AutomationLog.create(log);
        return;
      }

      // Execute actions
      for (const action of automation.actions) {
        try {
          await this.executeAction(action, event.data, automation.userId);
          log.actionsExecuted.push({
            type: action.type,
            config: action.config,
            status: 'success'
          });
        } catch (actionError) {
          log.actionsExecuted.push({
            type: action.type,
            config: action.config,
            status: 'failed',
            error: actionError.message
          });
          throw actionError;
        }
      }

      // Update automation stats
      await automation.update({
        executionCount: automation.executionCount + 1,
        lastExecutedAt: new Date()
      });

    } catch (error) {
      log.status = 'failed';
      log.error = error.message;
    }

    // Save log
    await AutomationLog.create(log);
  }

  async evaluateConditions(conditions, data, evaluatedLog) {
    let result = true;
    let currentLogic = 'AND';

    for (const condition of conditions) {
      const conditionResult = await this.evaluateCondition(condition, data);
      
      evaluatedLog.push({
        ...condition,
        result: conditionResult
      });

      if (currentLogic === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      // Update logic for next iteration
      if (condition.logic) {
        currentLogic = condition.logic;
      }
    }

    return result;
  }

  async evaluateCondition(condition, data) {
    const { field, operator, value } = condition;
    const fieldValue = this.getFieldValue(field, data);
    
    // Debug logging
    if (process.env.AUTOMATION_DEBUG === 'true') {
      console.log('[AutomationEngine] Evaluating condition:', {
        field,
        operator,
        value,
        fieldValue,
        data: JSON.stringify(data, null, 2)
      });
    }

    switch (operator) {
      case 'equals':
        return fieldValue == value;
      case 'not_equals':
        return fieldValue != value;
      case 'contains':
        return fieldValue ? fieldValue.toString().toLowerCase().includes(value.toLowerCase()) : false;
      case 'not_contains':
        return !fieldValue || !fieldValue.toString().toLowerCase().includes(value.toLowerCase());
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '';
      case 'greater_than':
        return parseFloat(fieldValue) > parseFloat(value);
      case 'less_than':
        return parseFloat(fieldValue) < parseFloat(value);
      case 'has_tag':
        return Array.isArray(fieldValue) && fieldValue.includes(value);
      case 'not_has_tag':
        return !Array.isArray(fieldValue) || !fieldValue.includes(value);
      default:
        return false;
    }
  }

  getFieldValue(field, data) {
    // Handle both formats: "email" and "contact.email"
    let fieldPath = field;
    
    // If field doesn't have a prefix and we have contact/deal data, add the prefix
    // Exception: customFields already has a dot, so don't add prefix
    if (!field.includes('.') || field.startsWith('customFields.')) {
      if (data.contact && !field.startsWith('contact.')) {
        fieldPath = `contact.${field}`;
      } else if (data.deal && !field.startsWith('deal.')) {
        fieldPath = `deal.${field}`;
      }
    }
    
    const parts = fieldPath.split('.');
    let value = data;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  async executeAction(action, eventData, userId) {
    const handler = this.actionHandlers[action.type];
    if (!handler) {
      throw new Error(`Unknown action type: ${action.type}`);
    }

    await handler(action.config, eventData, userId);
  }

  // Action Handlers
  async updateContactField(config, eventData, userId) {
    const { contactId, field, value } = config;
    const targetContactId = contactId || eventData.contact?.id;

    if (!targetContactId) {
      throw new Error('No contact ID available for update');
    }

    const contact = await Contact.findOne({
      where: { id: targetContactId, userId }
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Check if it's a custom field
    if (field.startsWith('customFields.')) {
      const customFieldName = field.replace('customFields.', '');
      const customFields = contact.customFields || {};
      customFields[customFieldName] = value;
      await contact.update({ customFields });
    } else {
      // Standard field update
      const updateData = {};
      updateData[field] = value;
      await contact.update(updateData);
    }
  }

  async addContactTag(config, eventData, userId) {
    const { contactId, tags } = config;
    const targetContactId = contactId || eventData.contact?.id;

    if (!targetContactId) {
      throw new Error('No contact ID available for update');
    }

    const contact = await Contact.findOne({
      where: { id: targetContactId, userId }
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    const newTags = Array.isArray(tags) ? tags : [tags];
    const existingTags = contact.tags || [];
    const updatedTags = [...new Set([...existingTags, ...newTags])];

    await contact.update({ tags: updatedTags });
  }

  async updateDealField(config, eventData, userId) {
    const { dealId, field, value } = config;
    const targetDealId = dealId || eventData.deal?.id;

    if (!targetDealId) {
      throw new Error('No deal ID available for update');
    }

    const deal = await Deal.findOne({
      where: { id: targetDealId, userId }
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    // Check if it's a custom field
    if (field.startsWith('customFields.')) {
      const customFieldName = field.replace('customFields.', '');
      const customFields = deal.customFields || {};
      customFields[customFieldName] = value;
      await deal.update({ customFields });
    } else {
      // Standard field update
      const updateData = {};
      updateData[field] = value;
      await deal.update(updateData);
    }
  }

  async moveDealToStage(config, eventData, userId) {
    const { dealId, stageId } = config;
    const targetDealId = dealId || eventData.deal?.id;

    if (!targetDealId) {
      throw new Error('No deal ID available for update');
    }

    const deal = await Deal.findOne({
      where: { id: targetDealId, userId }
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    // Verify stage belongs to user
    const stage = await Stage.findOne({
      where: { id: stageId, userId }
    });

    if (!stage) {
      throw new Error('Stage not found');
    }

    await deal.update({ stageId });
  }

  async updateCustomField(config, eventData, userId) {
    const { entityType, entityId, fieldName, value } = config;
    
    // Determine the entity ID based on config or event data
    let targetEntityId = entityId;
    if (!targetEntityId) {
      if (entityType === 'contact') {
        targetEntityId = eventData.contact?.id;
      } else if (entityType === 'deal') {
        targetEntityId = eventData.deal?.id;
      }
    }

    if (!targetEntityId) {
      throw new Error(`No ${entityType} ID available for update`);
    }

    // Get the entity
    const Model = entityType === 'contact' ? Contact : Deal;
    const entity = await Model.findOne({
      where: { id: targetEntityId, userId }
    });

    if (!entity) {
      throw new Error(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`);
    }

    // Update custom field
    const customFields = entity.customFields || {};
    customFields[fieldName] = value;
    await entity.update({ customFields });
  }
}

// Create singleton instance
const automationEngine = new AutomationEngine();

module.exports = automationEngine;