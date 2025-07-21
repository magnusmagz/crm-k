const { Automation, AutomationLog, AutomationStep, AutomationEnrollment, Contact, Deal, Stage, sequelize } = require('../models');
const { Op } = require('sequelize');
const cron = require('node-cron');
const automationDebugger = require('./automationDebugger');

class AutomationEngineV2 {
  constructor() {
    this.isProcessing = false;
    this.cronJob = null;
  }

  // Initialize the engine and start processing
  initialize() {
    // Process pending enrollments every minute
    this.cronJob = cron.schedule('* * * * *', () => {
      this.processPendingEnrollments();
    });

    console.log('AutomationEngineV2 initialized');
  }

  // Process enrollments that are ready for their next step
  async processPendingEnrollments() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      const now = new Date();
      const pendingEnrollments = await AutomationEnrollment.findAll({
        where: {
          status: 'active',
          nextStepAt: {
            [Op.lte]: now
          }
        },
        include: [{
          model: Automation,
          where: { isActive: true },
          include: [{
            model: AutomationStep,
            as: 'steps'
          }]
        }]
      });

      for (const enrollment of pendingEnrollments) {
        await this.processEnrollmentStep(enrollment);
      }
    } catch (error) {
      console.error('Error processing pending enrollments:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process a single enrollment step
  async processEnrollmentStep(enrollment) {
    const debugSessionId = automationDebugger.startSession(enrollment.automationId, enrollment.entityType, enrollment.entityId);
    
    try {
      automationDebugger.log(debugSessionId, 'PROCESS_ENROLLMENT_STEP_START', {
        enrollmentId: enrollment.id,
        automationId: enrollment.automationId,
        hasAutomation: !!enrollment.Automation,
        isMultiStep: enrollment.Automation?.isMultiStep
      });
      
      const automation = enrollment.Automation;
      
      if (!automation) {
        throw new Error('Automation not loaded with enrollment');
      }
      
      if (automation.isMultiStep && automation.steps && automation.steps.length > 0) {
        // Multi-step workflow
        const currentStep = automation.steps.find(s => s.stepIndex === enrollment.currentStepIndex);
        
        if (!currentStep) {
          // No more steps, complete the enrollment
          await enrollment.update({
            status: 'completed',
            completedAt: new Date()
          });
          return;
        }

        const result = await this.executeStep(currentStep, enrollment);
        
        if (result.success) {
          // Determine next step
          const nextStepIndex = this.determineNextStep(currentStep, result);
          
          if (nextStepIndex !== null) {
            const nextStep = automation.steps.find(s => s.stepIndex === nextStepIndex);
            const nextStepAt = this.calculateNextStepTime(nextStep);
            
            await enrollment.update({
              currentStepIndex: nextStepIndex,
              nextStepAt
            });
          } else {
            // No more steps
            await enrollment.update({
              status: 'completed',
              completedAt: new Date()
            });
          }
        } else {
          // Step failed
          await enrollment.update({
            status: 'failed',
            metadata: { ...enrollment.metadata, failureReason: result.error }
          });
        }
      } else {
        // Legacy single-step automation
        // Ensure automation has all data
        if (!automation.actions || automation.actions.length === 0) {
          // Reload automation with full data
          const fullAutomation = await Automation.findByPk(automation.id);
          automation.actions = fullAutomation.actions;
          automation.conditions = fullAutomation.conditions;
          automation.trigger = fullAutomation.trigger;
        }
        await this.executeLegacyAutomation(automation, enrollment);
      }
    } catch (error) {
      console.error('Error processing enrollment step:', error);
      await enrollment.update({
        status: 'failed',
        metadata: { ...enrollment.metadata, error: error.message }
      });
    }
  }

  // Execute a single step
  async executeStep(step, enrollment) {
    switch (step.type) {
      case 'action':
        return await this.executeActions(step.actions, enrollment);
      
      case 'delay':
        // Delays are handled by nextStepAt, just return success
        return { success: true };
      
      case 'condition':
        return await this.evaluateConditions(step.conditions, enrollment);
      
      case 'branch':
        return await this.evaluateBranch(step, enrollment);
      
      default:
        return { success: false, error: 'Unknown step type' };
    }
  }

  // Execute actions
  async executeActions(actions, enrollment) {
    const debugSessionId = automationDebugger.startSession(enrollment.automationId, enrollment.entityType, enrollment.entityId);
    
    try {
      const entity = await this.getEntity(enrollment);
      
      automationDebugger.log(debugSessionId, 'ACTION_EXECUTION_START', {
        enrollmentId: enrollment.id,
        entityType: enrollment.entityType,
        entityId: enrollment.entityId,
        actionsCount: actions.length
      });
      
      for (const action of actions) {
        automationDebugger.log(debugSessionId, 'ACTION_BEFORE_EXECUTE', {
          actionType: action.type,
          actionConfig: action.config,
          entityState: entity
        });
        
        try {
          await this.executeAction(action, entity, enrollment);
          automationDebugger.logActionExecution(debugSessionId, action, entity, true);
        } catch (actionError) {
          automationDebugger.log(debugSessionId, 'ACTION_ERROR', {
            action,
            error: actionError.message,
            stack: actionError.stack
          }, 'error');
          throw actionError;
        }
      }
      
      await this.logExecution(enrollment, 'success', { actions });
      return { success: true };
    } catch (error) {
      automationDebugger.logActionExecution(debugSessionId, { type: 'unknown' }, {}, false, error);
      await this.logExecution(enrollment, 'failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Execute a single action
  async executeAction(action, entity, enrollment) {
    const debugSessionId = automationDebugger.startSession(enrollment.automationId, enrollment.entityType, enrollment.entityId);
    
    automationDebugger.log(debugSessionId, 'EXECUTE_ACTION_DETAIL', {
      actionType: action.type,
      actionConfig: action.config,
      entityType: enrollment.entityType,
      entityId: entity.id,
      entityHasUpdate: typeof entity.update === 'function'
    });
    
    switch (action.type) {
      case 'update_contact_field':
        if (enrollment.entityType === 'contact') {
          await entity.update({ [action.config.field]: action.config.value });
        }
        break;
      
      case 'add_contact_tag':
        if (enrollment.entityType === 'contact') {
          const currentTags = entity.tags || [];
          const newTag = action.config.tag;
          
          automationDebugger.log(debugSessionId, 'ADD_TAG_DETAIL', {
            currentTags,
            newTag,
            tagExists: currentTags.includes(newTag)
          });
          
          if (!currentTags.includes(newTag)) {
            currentTags.push(newTag);
            await entity.update({ tags: currentTags });
            
            automationDebugger.log(debugSessionId, 'TAG_ADDED', {
              updatedTags: currentTags
            });
          }
        }
        break;
      
      case 'update_deal_field':
        if (enrollment.entityType === 'deal') {
          await entity.update({ [action.config.field]: action.config.value });
        }
        break;
      
      case 'move_deal_to_stage':
        if (enrollment.entityType === 'deal') {
          await entity.update({ stageId: action.config.stageId });
        }
        break;
      
      case 'create_task':
        // Future: Create a task
        break;
      
      case 'send_notification':
        // Future: Send internal notification
        break;
    }
  }

  // Evaluate conditions
  async evaluateConditions(conditions, enrollment) {
    if (!conditions || conditions.length === 0) {
      return { success: true };
    }

    const entity = await this.getEntity(enrollment);
    
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const met = await this.evaluateCondition(condition, entity);
      
      if (i === 0) {
        if (!met) return { success: false, conditionsFailed: true };
      } else {
        const logic = conditions[i - 1].logic || 'AND';
        if (logic === 'AND' && !met) return { success: false, conditionsFailed: true };
        if (logic === 'OR' && met) return { success: true };
      }
    }
    
    return { success: true };
  }

  // Evaluate a single condition
  async evaluateCondition(condition, entity) {
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

  // Evaluate branch conditions and determine path
  async evaluateBranch(step, enrollment) {
    const entity = await this.getEntity(enrollment);
    
    for (const branch of step.branchConfig.branches) {
      const conditionsMet = await this.evaluateConditions(branch.conditions, enrollment);
      if (conditionsMet.success) {
        return { success: true, nextBranch: branch.name };
      }
    }
    
    // No branch conditions met, use default if available
    if (step.branchConfig.defaultBranch) {
      return { success: true, nextBranch: 'default' };
    }
    
    return { success: true, nextBranch: null };
  }

  // Determine the next step based on current step and results
  determineNextStep(currentStep, result) {
    if (currentStep.type === 'branch' && result.nextBranch) {
      return currentStep.branchStepIndices[result.nextBranch] || null;
    }
    
    if (currentStep.type === 'condition' && result.conditionsFailed) {
      // Conditions not met, skip to alternative path if defined
      return currentStep.branchStepIndices.false || null;
    }
    
    return currentStep.nextStepIndex;
  }

  // Calculate when the next step should execute
  calculateNextStepTime(step) {
    if (!step || step.type !== 'delay') {
      return new Date(); // Execute immediately
    }
    
    const now = new Date();
    const delayConfig = step.delayConfig;
    
    switch (delayConfig.unit) {
      case 'minutes':
        return new Date(now.getTime() + delayConfig.value * 60 * 1000);
      case 'hours':
        return new Date(now.getTime() + delayConfig.value * 60 * 60 * 1000);
      case 'days':
        return new Date(now.getTime() + delayConfig.value * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
  }

  // Get the entity (contact or deal) for the enrollment
  async getEntity(enrollment) {
    const debugSessionId = automationDebugger.startSession(enrollment.automationId, enrollment.entityType, enrollment.entityId);
    
    automationDebugger.log(debugSessionId, 'GET_ENTITY_START', {
      entityType: enrollment.entityType,
      entityId: enrollment.entityId
    });
    
    try {
      if (enrollment.entityType === 'contact') {
        const contact = await Contact.findByPk(enrollment.entityId);
        automationDebugger.log(debugSessionId, 'GET_ENTITY_RESULT', {
          found: !!contact,
          entityId: enrollment.entityId
        });
        return contact;
      } else if (enrollment.entityType === 'deal') {
        const deal = await Deal.findByPk(enrollment.entityId, {
          include: ['Contact', 'Stage']
        });
        automationDebugger.log(debugSessionId, 'GET_ENTITY_RESULT', {
          found: !!deal,
          entityId: enrollment.entityId
        });
        return deal;
      }
      throw new Error('Unknown entity type: ' + enrollment.entityType);
    } catch (error) {
      automationDebugger.log(debugSessionId, 'GET_ENTITY_ERROR', {
        error: error.message,
        stack: error.stack,
        entityType: enrollment.entityType,
        entityId: enrollment.entityId
      }, 'error');
      throw error;
    }
  }

  // Enroll an entity in an automation
  async enroll(automation, entityType, entityId, userId) {
    const debugSessionId = automationDebugger.startSession(automation.id, entityType, entityId);
    
    try {
      // Check if already enrolled
      const existing = await AutomationEnrollment.findOne({
        where: {
          automationId: automation.id,
          entityType,
          entityId,
          status: 'active'
        }
      });
      
      if (existing) {
        automationDebugger.log(debugSessionId, 'ENROLLMENT_EXISTS', {
          enrollmentId: existing.id,
          status: existing.status
        });
        return { success: false, reason: 'Already enrolled' };
      }
      
      // Create enrollment
      const enrollment = await AutomationEnrollment.create({
        automationId: automation.id,
        userId,
        entityType,
        entityId,
        currentStepIndex: 0,
        status: 'active',
        nextStepAt: new Date() // Start immediately
      });
      
      automationDebugger.log(debugSessionId, 'ENROLLMENT_CREATED', {
        enrollmentId: enrollment.id,
        automationId: automation.id,
        entityType,
        entityId,
        nextStepAt: enrollment.nextStepAt
      });
      
      // Update automation enrollment counts
      await automation.increment({
        enrolledCount: 1,
        activeEnrollments: 1
      });
      
      // Process immediately for single-step automations
      if (!automation.isMultiStep) {
        automationDebugger.log(debugSessionId, 'IMMEDIATE_PROCESSING', {
          reason: 'Single-step automation',
          automationId: automation.id
        });
        
        // Need to reload with associations
        const fullEnrollment = await AutomationEnrollment.findByPk(enrollment.id, {
          include: [{
            model: Automation,
            include: [{
              model: AutomationStep,
              as: 'steps'
            }]
          }]
        });
        
        automationDebugger.log(debugSessionId, 'ENROLLMENT_LOADED', {
          enrollmentId: enrollment.id,
          hasFullEnrollment: !!fullEnrollment,
          hasAutomation: !!fullEnrollment?.Automation,
          automationName: fullEnrollment?.Automation?.name,
          actions: fullEnrollment?.Automation?.actions
        });
        
        // Process immediately
        setImmediate(async () => {
          try {
            await this.processEnrollmentStep(fullEnrollment);
          } catch (error) {
            automationDebugger.log(debugSessionId, 'IMMEDIATE_PROCESSING_ERROR', {
              error: error.message,
              stack: error.stack
            }, 'error');
          }
        });
      }
      
      return { success: true, enrollment };
    } catch (error) {
      automationDebugger.log(debugSessionId, 'ENROLLMENT_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
      console.error('Error enrolling entity:', error);
      return { success: false, error: error.message };
    }
  }

  // Unenroll an entity from an automation
  async unenroll(automationId, entityType, entityId) {
    const enrollment = await AutomationEnrollment.findOne({
      where: {
        automationId,
        entityType,
        entityId,
        status: 'active'
      }
    });
    
    if (enrollment) {
      await enrollment.update({ status: 'unenrolled' });
      
      const automation = await Automation.findByPk(automationId);
      await automation.decrement('activeEnrollments');
    }
  }

  // Get enrollment statistics for an automation
  async getEnrollmentStats(automationId) {
    const stats = await AutomationEnrollment.findAll({
      where: { automationId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    return stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.get('count'));
      return acc;
    }, {});
  }

  // Log execution details
  async logExecution(enrollment, status, details) {
    await AutomationLog.create({
      automationId: enrollment.automationId,
      userId: enrollment.userId,
      triggerType: 'step_execution',
      triggerData: {
        enrollmentId: enrollment.id,
        stepIndex: enrollment.currentStepIndex,
        entityType: enrollment.entityType,
        entityId: enrollment.entityId
      },
      status,
      conditionsEvaluated: details.conditions,
      actionsExecuted: details.actions,
      error: details.error,
      executedAt: new Date()
    });
  }

  // Execute legacy single-step automation
  async executeLegacyAutomation(automation, enrollment) {
    const debugSessionId = automationDebugger.startSession(enrollment.automationId, enrollment.entityType, enrollment.entityId);
    
    automationDebugger.log(debugSessionId, 'LEGACY_AUTOMATION_START', {
      automationId: automation.id,
      automationName: automation.name,
      enrollmentId: enrollment.id,
      conditions: automation.conditions,
      actions: automation.actions,
      hasActions: automation.actions && automation.actions.length > 0
    });
    
    try {
      const entity = await this.getEntity(enrollment);
      
      if (!entity) {
        throw new Error(`Entity not found: ${enrollment.entityType} ${enrollment.entityId}`);
      }
      
      automationDebugger.log(debugSessionId, 'ENTITY_LOADED', {
        entityType: enrollment.entityType,
        entityId: enrollment.entityId,
        hasEntity: !!entity,
        entityData: entity ? {
          id: entity.id,
          tags: entity.tags,
          firstName: entity.firstName,
          lastName: entity.lastName
        } : null
      });
    
      // Check conditions
      if (automation.conditions && automation.conditions.length > 0) {
        const conditionsMet = await this.evaluateConditions(automation.conditions, enrollment);
        if (!conditionsMet.success) {
          automationDebugger.log(debugSessionId, 'LEGACY_CONDITIONS_NOT_MET', {
            conditions: automation.conditions,
            result: conditionsMet
          });
          await enrollment.update({ status: 'completed' });
          return;
        }
      }
      
      automationDebugger.log(debugSessionId, 'LEGACY_EXECUTING_ACTIONS', {
        actionsCount: automation.actions.length,
        actions: automation.actions
      });
      
      // Execute actions
      const result = await this.executeActions(automation.actions, enrollment);
      
      await enrollment.update({
        status: result.success ? 'completed' : 'failed',
        completedAt: new Date()
      });
      
      await automation.increment(result.success ? 'completedEnrollments' : 'failedEnrollments');
      
    } catch (error) {
      automationDebugger.log(debugSessionId, 'LEGACY_AUTOMATION_ERROR', {
        error: error.message,
        stack: error.stack,
        enrollmentId: enrollment.id
      }, 'error');
      
      await enrollment.update({
        status: 'failed',
        completedAt: new Date(),
        metadata: { ...enrollment.metadata, error: error.message }
      });
      
      throw error;
    }
  }

  // Shutdown the engine
  shutdown() {
    if (this.cronJob) {
      this.cronJob.stop();
    }
  }
}

module.exports = new AutomationEngineV2();