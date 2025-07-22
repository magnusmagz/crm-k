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
    // Process pending enrollments every 10 seconds for faster response
    this.cronJob = cron.schedule('*/10 * * * * *', () => {
      this.processPendingEnrollments();
    });

    // Also process immediately on startup
    this.processPendingEnrollments();

    console.log('AutomationEngineV2 initialized - processing enrollments every 10 seconds');
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
          required: true,
          include: [{
            model: AutomationStep,
            as: 'steps',
            required: false
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
          if (!fullAutomation) {
            throw new Error(`Automation ${automation.id} not found when reloading`);
          }
          // Use the fully loaded automation
          automation = fullAutomation;
        }
        
        automationDebugger.log(debugSessionId, 'LEGACY_AUTOMATION_CHECK', {
          automationId: automation.id,
          hasActions: !!automation.actions,
          actionsLength: automation.actions?.length || 0,
          actions: automation.actions
        });
        
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
      // Validate actions array
      if (!actions || !Array.isArray(actions)) {
        throw new Error(`Invalid actions: expected array, got ${typeof actions}`);
      }
      
      if (actions.length === 0) {
        automationDebugger.log(debugSessionId, 'NO_ACTIONS_TO_EXECUTE', {
          enrollmentId: enrollment.id,
          warning: 'No actions to execute'
        }, 'warn');
        return { success: true };
      }
      
      const entity = await this.getEntity(enrollment);
      
      automationDebugger.log(debugSessionId, 'ACTION_EXECUTION_START', {
        enrollmentId: enrollment.id,
        entityType: enrollment.entityType,
        entityId: enrollment.entityId,
        actionsCount: actions.length,
        actions: actions
      });
      
      for (const action of actions) {
        automationDebugger.log(debugSessionId, 'ACTION_BEFORE_EXECUTE', {
          actionType: action.type,
          actionConfig: action.config,
          entityState: entity ? entity.toJSON() : null
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
      
      // Try to log execution, but don't fail if logging fails
      try {
        await this.logExecution(enrollment, 'success', { actions });
      } catch (logError) {
        automationDebugger.log(debugSessionId, 'LOG_EXECUTION_ERROR', {
          error: logError.message,
          originalStatus: 'success'
        }, 'error');
      }
      
      return { success: true };
    } catch (error) {
      automationDebugger.logActionExecution(debugSessionId, { type: 'unknown' }, {}, false, error);
      
      // Try to log execution, but don't fail if logging fails
      try {
        await this.logExecution(enrollment, 'failed', { error: error.message });
      } catch (logError) {
        automationDebugger.log(debugSessionId, 'LOG_EXECUTION_ERROR', {
          error: logError.message,
          originalStatus: 'failed',
          originalError: error.message
        }, 'error');
      }
      
      return { success: false, error: error.message };
    }
  }

  // Execute a single action
  async executeAction(action, entity, enrollment) {
    const debugSessionId = automationDebugger.startSession(enrollment.automationId, enrollment.entityType, enrollment.entityId);
    
    try {
      // Validate action structure
      if (!action || !action.type) {
        throw new Error('Invalid action: missing type');
      }
      
      if (!action.config) {
        throw new Error('Invalid action: missing config');
      }
      
      automationDebugger.log(debugSessionId, 'EXECUTE_ACTION_DETAIL', {
        actionType: action.type,
        actionConfig: action.config,
        entityType: enrollment.entityType,
        entityId: entity.id,
        entityHasUpdate: typeof entity.update === 'function',
        entityData: {
          id: entity.id,
          tags: entity.tags,
          firstName: entity.firstName,
          lastName: entity.lastName
        }
      });
      
      switch (action.type) {
        case 'update_contact_field':
          if (enrollment.entityType === 'contact') {
            if (!action.config.field || action.config.value === undefined) {
              throw new Error('Invalid update_contact_field config: missing field or value');
            }
            await entity.update({ [action.config.field]: action.config.value });
            automationDebugger.log(debugSessionId, 'FIELD_UPDATED', {
              field: action.config.field,
              value: action.config.value
            });
          } else if (enrollment.entityType === 'deal' && entity.Contact) {
            // For deals, update the associated contact
            if (!action.config.field || action.config.value === undefined) {
              throw new Error('Invalid update_contact_field config: missing field or value');
            }
            await entity.Contact.update({ [action.config.field]: action.config.value });
            automationDebugger.log(debugSessionId, 'CONTACT_FIELD_UPDATED_FROM_DEAL', {
              contactId: entity.Contact.id,
              field: action.config.field,
              value: action.config.value
            });
          } else if (enrollment.entityType === 'deal' && !entity.Contact) {
            automationDebugger.log(debugSessionId, 'NO_CONTACT_FOR_DEAL', {
              dealId: entity.id,
              dealName: entity.name,
              message: 'Cannot update contact field - deal has no associated contact'
            }, 'warn');
          }
          break;
        
        case 'add_contact_tag':
          if (enrollment.entityType === 'contact') {
            // Handle both config.tag (V2) and config.tags (V1) formats
            const tagValue = action.config.tag || action.config.tags;
            if (!tagValue) {
              automationDebugger.log(debugSessionId, 'ADD_TAG_CONFIG_ERROR', {
                config: action.config,
                hasTag: !!action.config.tag,
                hasTags: !!action.config.tags
              }, 'error');
              throw new Error('Invalid add_contact_tag config: missing tag/tags');
            }
            
            const currentTags = entity.tags || [];
            // Handle both single tag and array of tags
            const tagsToAdd = Array.isArray(tagValue) ? tagValue : [tagValue];
            const newTag = tagsToAdd[0]; // For now, just handle the first tag
            
            automationDebugger.log(debugSessionId, 'ADD_TAG_DETAIL', {
              currentTags,
              newTag,
              tagExists: currentTags.includes(newTag)
            });
            
            if (!currentTags.includes(newTag)) {
              const updatedTags = [...currentTags, newTag];
              await entity.update({ tags: updatedTags });
              
              automationDebugger.log(debugSessionId, 'TAG_ADDED', {
                updatedTags: updatedTags
              });
            }
          } else if (enrollment.entityType === 'deal' && entity.Contact) {
            // For deals, add tag to the associated contact
            // Handle both config.tag (V2) and config.tags (V1) formats
            const tagValue = action.config.tag || action.config.tags;
            if (!tagValue) {
              throw new Error('Invalid add_contact_tag config: missing tag/tags');
            }
            
            const currentTags = entity.Contact.tags || [];
            // Handle both single tag and array of tags
            const tagsToAdd = Array.isArray(tagValue) ? tagValue : [tagValue];
            const newTag = tagsToAdd[0]; // For now, just handle the first tag
            
            automationDebugger.log(debugSessionId, 'ADD_TAG_TO_DEAL_CONTACT', {
              contactId: entity.Contact.id,
              currentTags,
              newTag,
              tagExists: currentTags.includes(newTag)
            });
            
            if (!currentTags.includes(newTag)) {
              const updatedTags = [...currentTags, newTag];
              await entity.Contact.update({ tags: updatedTags });
              
              automationDebugger.log(debugSessionId, 'TAG_ADDED_TO_DEAL_CONTACT', {
                contactId: entity.Contact.id,
                updatedTags: updatedTags
              });
            }
          } else if (enrollment.entityType === 'deal' && !entity.Contact) {
            automationDebugger.log(debugSessionId, 'NO_CONTACT_FOR_DEAL_TAG', {
              dealId: entity.id,
              dealName: entity.name,
              message: 'Cannot add contact tag - deal has no associated contact'
            }, 'warn');
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
        automationDebugger.log(debugSessionId, 'ACTION_NOT_IMPLEMENTED', {
          actionType: 'create_task',
          message: 'Task creation not yet implemented'
        });
        break;
      
      case 'send_notification':
        // Future: Send internal notification
        automationDebugger.log(debugSessionId, 'ACTION_NOT_IMPLEMENTED', {
          actionType: 'send_notification',
          message: 'Notification sending not yet implemented'
        });
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
    
    automationDebugger.log(debugSessionId, 'ACTION_COMPLETED', {
      actionType: action.type,
      entityId: entity.id
    });
    
    } catch (error) {
      automationDebugger.log(debugSessionId, 'ACTION_EXECUTION_ERROR', {
        actionType: action.type,
        actionConfig: action.config,
        error: error.message,
        stack: error.stack
      }, 'error');
      throw error;
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
    // Use the same field extraction logic as automationEnrollmentService
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
        return !fieldValue || !fieldValue.toString().toLowerCase().includes(targetValue.toLowerCase());
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
    let fieldPath = field;
    
    // If the field doesn't contain a dot and isn't a custom field path,
    // it's a direct entity property
    if (!field.includes('.') || field.startsWith('customFields.')) {
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
      let entity = null;
      
      if (enrollment.entityType === 'contact') {
        entity = await Contact.findByPk(enrollment.entityId);
        automationDebugger.log(debugSessionId, 'GET_ENTITY_RESULT', {
          found: !!entity,
          entityId: enrollment.entityId,
          entityData: entity ? {
            id: entity.id,
            firstName: entity.firstName,
            lastName: entity.lastName,
            tags: entity.tags,
            email: entity.email
          } : null
        });
      } else if (enrollment.entityType === 'deal') {
        entity = await Deal.findByPk(enrollment.entityId, {
          include: ['Contact', 'Stage']
        });
        automationDebugger.log(debugSessionId, 'GET_ENTITY_RESULT', {
          found: !!entity,
          entityId: enrollment.entityId,
          entityData: entity ? {
            id: entity.id,
            name: entity.name,
            value: entity.value,
            status: entity.status
          } : null
        });
      } else {
        throw new Error('Unknown entity type: ' + enrollment.entityType);
      }
      
      if (!entity) {
        throw new Error(`Entity not found: ${enrollment.entityType} with id ${enrollment.entityId}`);
      }
      
      return entity;
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
      // Check if already enrolled (only check for active enrollments)
      // Allow re-enrollment if previous enrollment is completed or failed
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
      
      // Log if there was a previous completed enrollment
      const previousEnrollment = await AutomationEnrollment.findOne({
        where: {
          automationId: automation.id,
          entityType,
          entityId,
          status: ['completed', 'failed']
        },
        order: [['completedAt', 'DESC']]
      });
      
      if (previousEnrollment) {
        automationDebugger.log(debugSessionId, 'RE_ENROLLMENT', {
          previousEnrollmentId: previousEnrollment.id,
          previousStatus: previousEnrollment.status,
          completedAt: previousEnrollment.completedAt
        });
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
            console.log('[AutomationEngineV2] Processing single-step automation immediately:', {
              enrollmentId: fullEnrollment.id,
              automationName: fullEnrollment.Automation?.name,
              hasActions: !!fullEnrollment.Automation?.actions,
              actionCount: fullEnrollment.Automation?.actions?.length
            });
            await this.processEnrollmentStep(fullEnrollment);
          } catch (error) {
            console.error('[AutomationEngineV2] Error processing single-step automation:', error);
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
      conditionsMet: status === 'success', // Required field
      conditionsEvaluated: details.conditions || [],
      actionsExecuted: details.actions || [],
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
        completedAt: new Date(),
        metadata: result.success ? enrollment.metadata : { ...enrollment.metadata, error: result.error }
      });
      
      // Only increment completedEnrollments for successful executions
      if (result.success) {
        await automation.increment('completedEnrollments');
      }
      // For failures, we just track in the enrollment status
      
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