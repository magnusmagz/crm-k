const { Automation, AutomationEnrollment, Contact, Deal, sequelize } = require('../models');
const automationEngineV2 = require('./automationEngineV2');
const automationDebugger = require('./automationDebugger');
const { Op } = require('sequelize');

class AutomationEnrollmentService {
  // Handle trigger events and enroll entities
  async handleTrigger(eventType, userId, data) {
    try {
      console.log('[AutomationEnrollment] Handling trigger:', {
        eventType,
        userId,
        dataKeys: Object.keys(data),
        contactId: data.contact?.id,
        contactName: `${data.contact?.firstName} ${data.contact?.lastName}`,
        contactTags: data.contact?.tags,
        changedFields: data.changedFields
      });

      // Find all active automations for this user with matching trigger
      const automations = await Automation.findAll({
        where: {
          userId,
          isActive: true,
          [Op.and]: [
            sequelize.where(
              sequelize.cast(sequelize.col('trigger'), 'jsonb'),
              Op.contains,
              { type: eventType }
            )
          ]
        },
        include: ['steps']
      });

      console.log('[AutomationEnrollment] Found automations:', {
        count: automations.length,
        automations: automations.map(a => ({ id: a.id, name: a.name, trigger: a.trigger }))
      });

      const results = [];

      for (const automation of automations) {
        const result = await this.processAutomationTrigger(automation, eventType, data);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Error handling trigger:', error);
      return [];
    }
  }

  // Process a single automation trigger
  async processAutomationTrigger(automation, eventType, data) {
    let entityType, entityId, entity;

    // Start debug session
    const debugSessionId = automationDebugger.startSession(automation.id, 'trigger', eventType);

    // Determine entity based on trigger type
    try {
      switch (eventType) {
        case 'contact_created':
        case 'contact_updated':
          entityType = 'contact';
          entityId = data.contact.id;
          entity = data.contact;
          break;
        
        case 'deal_created':
        case 'deal_updated':
        case 'deal_stage_changed':
          entityType = 'deal';
          entityId = data.deal.id;
          entity = data.deal;
          break;
        
        default:
          automationDebugger.log(debugSessionId, 'TRIGGER_ERROR', {
            error: 'Unknown trigger type',
            eventType
          }, 'error');
          return { success: false, error: 'Unknown trigger type' };
      }
      
      // Log entity details
      automationDebugger.log(debugSessionId, 'ENTITY_DETAILS', {
        entityType,
        entityId,
        entityData: entity,
        eventType,
        eventData: data
      });
      
    } catch (error) {
      automationDebugger.log(debugSessionId, 'ENTITY_EXTRACTION_ERROR', {
        error: error.message,
        eventType,
        dataStructure: Object.keys(data || {}),
        stack: error.stack
      }, 'error');
      return { success: false, error: `Failed to extract entity: ${error.message}` };
    }

    // Log trigger evaluation
    automationDebugger.logTriggerEvaluation(debugSessionId, eventType, data, true);

    // Check if entity should be enrolled
    const shouldEnroll = await this.checkEnrollmentCriteria(automation, entity, eventType, data, debugSessionId);
    
    if (shouldEnroll) {
      automationDebugger.logEnrollmentDecision(debugSessionId, automation.id, entityId, true, 'All criteria met');
      return await automationEngineV2.enroll(automation, entityType, entityId, automation.userId);
    }
    
    automationDebugger.logEnrollmentDecision(debugSessionId, automation.id, entityId, false, 'Enrollment criteria not met');
    return { success: false, reason: 'Enrollment criteria not met' };
  }

  // Check if entity meets enrollment criteria
  async checkEnrollmentCriteria(automation, entity, eventType, data, debugSessionId) {
    // For stage change triggers, check if it's the right stage transition
    if (eventType === 'deal_stage_changed' && automation.trigger.config) {
      const { fromStageId, toStageId } = automation.trigger.config;
      
      // Get previousStageId from the previousStage object
      const previousStageId = data.previousStage?.id || data.previousStageId;
      
      if (fromStageId && previousStageId !== fromStageId) {
        if (debugSessionId) {
          automationDebugger.log(debugSessionId, 'STAGE_CHANGE_MISMATCH', {
            reason: 'From stage does not match',
            expected: fromStageId,
            actual: previousStageId,
            previousStage: data.previousStage
          });
        }
        return false;
      }
      
      if (toStageId && entity.stageId !== toStageId) {
        if (debugSessionId) {
          automationDebugger.log(debugSessionId, 'STAGE_CHANGE_MISMATCH', {
            reason: 'To stage does not match',
            expected: toStageId,
            actual: entity.stageId,
            newStage: data.newStage
          });
        }
        return false;
      }
    }

    // If automation has initial conditions, check them
    if (automation.conditions && automation.conditions.length > 0) {
      // For simple automations, check conditions immediately
      if (!automation.isMultiStep) {
        const conditionsMet = await this.evaluateConditions(automation.conditions, entity, debugSessionId);
        if (!conditionsMet && debugSessionId) {
          automationDebugger.log(debugSessionId, 'ENROLLMENT_CRITERIA_FAILED', {
            reason: 'Initial conditions not met',
            automationId: automation.id
          });
        }
        return conditionsMet;
      }
    }
    
    return true;
  }

  // Evaluate conditions (simplified version for enrollment)
  async evaluateConditions(conditions, entity, debugSessionId) {
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const met = this.evaluateCondition(condition, entity);
      
      if (debugSessionId) {
        automationDebugger.logConditionEvaluation(debugSessionId, condition, entity, met);
      }
      
      if (i === 0) {
        if (!met) return false;
      } else {
        const logic = conditions[i - 1].logic || 'AND';
        if (logic === 'AND' && !met) return false;
        if (logic === 'OR' && met) return true;
      }
    }
    
    return true;
  }

  // Evaluate a single condition
  evaluateCondition(condition, entity) {
    // Get field value - supports dot notation for custom fields
    const fieldValue = this.getFieldValue(condition.field, entity);
    const targetValue = condition.value;
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue == targetValue;
      case 'not_equals':
        return fieldValue != targetValue;
      case 'contains':
        return fieldValue ? fieldValue.toString().toLowerCase().includes(targetValue.toLowerCase()) : false;
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

  // Get field value with dot notation support
  getFieldValue(field, entity) {
    // Handle field names that don't have entity prefix
    // If field is just "email" or "firstName", access it directly from entity
    let fieldPath = field;
    
    // If the field doesn't contain a dot and isn't a custom field path,
    // it's a direct entity property
    if (!field.includes('.') || field.startsWith('customFields.')) {
      // For customFields.something, we still need to traverse
      // For simple fields like 'email', we can access directly
      fieldPath = field;
    }
    
    const parts = fieldPath.split('.');
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

  // Get enrolled entities for an automation
  async getEnrolledEntities(automationId, status = null) {
    const whereClause = {
      automationId
    };
    
    // Only add status filter if explicitly provided
    if (status) {
      whereClause.status = status;
    }
    
    const enrollments = await AutomationEnrollment.findAll({
      where: whereClause,
      order: [['enrolledAt', 'DESC']]
    });
    
    console.log(`Found ${enrollments.length} enrollments for automation ${automationId}`);

    // Fetch the actual entities
    const entities = [];
    
    for (const enrollment of enrollments) {
      let entity;
      
      if (enrollment.entityType === 'contact') {
        entity = await Contact.findByPk(enrollment.entityId);
      } else if (enrollment.entityType === 'deal') {
        entity = await Deal.findByPk(enrollment.entityId, {
          include: ['Contact', 'Stage']
        });
      }
      
      if (entity) {
        entities.push({
          enrollment: enrollment.toJSON(),
          entity: entity.toJSON(),
          type: enrollment.entityType
        });
      } else {
        console.log(`Entity not found: ${enrollment.entityType} ${enrollment.entityId}`);
      }
    }
    
    console.log(`Returning ${entities.length} entities with data`);
    return entities;
  }

  // Get enrollment summary for an automation
  async getEnrollmentSummary(automationId) {
    const [active, completed, failed, unenrolled] = await Promise.all([
      AutomationEnrollment.count({ where: { automationId, status: 'active' } }),
      AutomationEnrollment.count({ where: { automationId, status: 'completed' } }),
      AutomationEnrollment.count({ where: { automationId, status: 'failed' } }),
      AutomationEnrollment.count({ where: { automationId, status: 'unenrolled' } })
    ]);

    const recentEnrollments = await AutomationEnrollment.findAll({
      where: { automationId },
      order: [['enrolledAt', 'DESC']],
      limit: 10
    });

    return {
      total: active + completed + failed + unenrolled,
      active,
      completed,
      failed,
      unenrolled,
      recentEnrollments
    };
  }

  // Preview which entities would be enrolled
  async previewEnrollment(automationId, userId) {
    const automation = await Automation.findByPk(automationId);
    if (!automation || automation.userId !== userId) {
      throw new Error('Automation not found');
    }

    let potentialEntities = [];
    
    // Based on trigger type, find matching entities
    switch (automation.trigger.type) {
      case 'contact_created':
      case 'contact_updated':
        const contacts = await Contact.findAll({
          where: { userId },
          limit: 100
        });
        
        for (const contact of contacts) {
          // Check if already enrolled
          const isEnrolled = await AutomationEnrollment.findOne({
            where: {
              automationId,
              entityType: 'contact',
              entityId: contact.id,
              status: 'active'
            }
          });
          
          if (!isEnrolled && await this.checkEnrollmentCriteria(automation, contact, automation.trigger.type, { contact })) {
            potentialEntities.push({
              type: 'contact',
              entity: contact,
              wouldEnroll: true
            });
          }
        }
        break;
      
      case 'deal_created':
      case 'deal_updated':
      case 'deal_stage_changed':
        const deals = await Deal.findAll({
          where: { userId },
          include: ['Contact', 'Stage'],
          limit: 100
        });
        
        for (const deal of deals) {
          const isEnrolled = await AutomationEnrollment.findOne({
            where: {
              automationId,
              entityType: 'deal',
              entityId: deal.id,
              status: 'active'
            }
          });
          
          if (!isEnrolled && await this.checkEnrollmentCriteria(automation, deal, automation.trigger.type, { deal })) {
            potentialEntities.push({
              type: 'deal',
              entity: deal,
              wouldEnroll: true
            });
          }
        }
        break;
    }
    
    return {
      automation,
      potentialCount: potentialEntities.length,
      preview: potentialEntities.slice(0, 20) // Show first 20
    };
  }
}

module.exports = new AutomationEnrollmentService();