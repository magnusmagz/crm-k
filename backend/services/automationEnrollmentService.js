const { Automation, AutomationEnrollment, Contact, Deal } = require('../models');
const automationEngineV2 = require('./automationEngineV2');
const { Op } = require('sequelize');

class AutomationEnrollmentService {
  // Handle trigger events and enroll entities
  async handleTrigger(eventType, userId, data) {
    try {
      // Find all active automations for this user with matching trigger
      const automations = await Automation.findAll({
        where: {
          userId,
          isActive: true,
          trigger: {
            type: eventType
          }
        },
        include: ['steps']
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

    // Determine entity based on trigger type
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
        return { success: false, error: 'Unknown trigger type' };
    }

    // Check if entity should be enrolled
    const shouldEnroll = await this.checkEnrollmentCriteria(automation, entity, eventType, data);
    
    if (shouldEnroll) {
      return await automationEngineV2.enroll(automation, entityType, entityId, automation.userId);
    }
    
    return { success: false, reason: 'Enrollment criteria not met' };
  }

  // Check if entity meets enrollment criteria
  async checkEnrollmentCriteria(automation, entity, eventType, data) {
    // For stage change triggers, check if it's the right stage transition
    if (eventType === 'deal_stage_changed' && automation.trigger.config) {
      const { fromStageId, toStageId } = automation.trigger.config;
      
      if (fromStageId && data.previousStageId !== fromStageId) {
        return false;
      }
      
      if (toStageId && entity.stageId !== toStageId) {
        return false;
      }
    }

    // If automation has initial conditions, check them
    if (automation.conditions && automation.conditions.length > 0) {
      // For simple automations, check conditions immediately
      if (!automation.isMultiStep) {
        const conditionsMet = await this.evaluateConditions(automation.conditions, entity);
        return conditionsMet;
      }
    }
    
    return true;
  }

  // Evaluate conditions (simplified version for enrollment)
  async evaluateConditions(conditions, entity) {
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const met = this.evaluateCondition(condition, entity);
      
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
    const fieldValue = entity[condition.field];
    const targetValue = condition.value;
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue == targetValue;
      case 'not_equals':
        return fieldValue != targetValue;
      case 'contains':
        return fieldValue && fieldValue.toString().includes(targetValue);
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

  // Get enrolled entities for an automation
  async getEnrolledEntities(automationId, status = 'active') {
    const enrollments = await AutomationEnrollment.findAll({
      where: {
        automationId,
        ...(status && { status })
      },
      order: [['enrolledAt', 'DESC']]
    });

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
          enrollment,
          entity,
          type: enrollment.entityType
        });
      }
    }
    
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
      limit: 10,
      include: [{
        model: Contact,
        as: 'contact',
        required: false
      }, {
        model: Deal,
        as: 'deal',
        required: false,
        include: ['Contact']
      }]
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