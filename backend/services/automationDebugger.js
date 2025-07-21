const { AutomationLog, AutomationEnrollment } = require('../models');
const { Op } = require('sequelize');

class AutomationDebugger {
  constructor() {
    this.debugLogs = [];
    this.isDebugMode = process.env.AUTOMATION_DEBUG === 'true';
  }

  // Start a debug session for an automation execution
  startSession(automationId, entityType, entityId) {
    const sessionId = `${automationId}-${entityType}-${entityId}-${Date.now()}`;
    this.log(sessionId, 'SESSION_START', {
      automationId,
      entityType,
      entityId,
      timestamp: new Date()
    });
    return sessionId;
  }

  // Log debug information
  log(sessionId, event, data, level = 'info') {
    const logEntry = {
      sessionId,
      event,
      data,
      level,
      timestamp: new Date()
    };

    if (this.isDebugMode) {
      console.log(`[AUTOMATION_DEBUG] ${event}:`, JSON.stringify(data, null, 2));
    }

    this.debugLogs.push(logEntry);

    // Keep only last 1000 entries in memory
    if (this.debugLogs.length > 1000) {
      this.debugLogs.shift();
    }

    return logEntry;
  }

  // Log trigger evaluation
  logTriggerEvaluation(sessionId, triggerType, triggerData, result) {
    return this.log(sessionId, 'TRIGGER_EVALUATION', {
      triggerType,
      triggerData,
      result,
      reason: result ? 'Trigger matched' : 'Trigger did not match'
    });
  }

  // Log enrollment decision
  logEnrollmentDecision(sessionId, automationId, entityId, decision, reason) {
    return this.log(sessionId, 'ENROLLMENT_DECISION', {
      automationId,
      entityId,
      decision,
      reason,
      timestamp: new Date()
    }, decision ? 'info' : 'warn');
  }

  // Log condition evaluation
  logConditionEvaluation(sessionId, condition, entity, result) {
    const fieldValue = entity[condition.field];
    return this.log(sessionId, 'CONDITION_EVALUATION', {
      condition: {
        field: condition.field,
        operator: condition.operator,
        targetValue: condition.value,
        logic: condition.logic
      },
      entityValue: fieldValue,
      entityType: typeof fieldValue,
      result,
      evaluation: this.explainConditionResult(condition, fieldValue, result)
    });
  }

  // Explain why a condition passed or failed
  explainConditionResult(condition, actualValue, result) {
    const explanations = {
      'equals': `${actualValue} ${result ? '==' : '!='} ${condition.value}`,
      'not_equals': `${actualValue} ${result ? '!=' : '=='} ${condition.value}`,
      'contains': `"${actualValue}" ${result ? 'contains' : 'does not contain'} "${condition.value}"`,
      'not_contains': `"${actualValue}" ${result ? 'does not contain' : 'contains'} "${condition.value}"`,
      'is_empty': `${actualValue} is ${result ? 'empty' : 'not empty'}`,
      'is_not_empty': `${actualValue} is ${result ? 'not empty' : 'empty'}`,
      'greater_than': `${actualValue} ${result ? '>' : '<='} ${condition.value}`,
      'less_than': `${actualValue} ${result ? '<' : '>='} ${condition.value}`,
      'has_tag': `Tags ${result ? 'include' : 'do not include'} "${condition.value}"`,
      'not_has_tag': `Tags ${result ? 'do not include' : 'include'} "${condition.value}"`
    };
    return explanations[condition.operator] || 'Unknown evaluation';
  }

  // Log action execution
  logActionExecution(sessionId, action, entity, result, error = null) {
    return this.log(sessionId, 'ACTION_EXECUTION', {
      action: {
        type: action.type,
        config: action.config
      },
      entityBefore: this.sanitizeEntity(entity),
      result,
      error: error ? error.message : null,
      timestamp: new Date()
    }, error ? 'error' : 'info');
  }

  // Log state changes
  logStateChange(sessionId, entityType, entityId, field, oldValue, newValue) {
    return this.log(sessionId, 'STATE_CHANGE', {
      entityType,
      entityId,
      field,
      oldValue,
      newValue,
      changed: oldValue !== newValue
    });
  }

  // Log enrollment state change
  logEnrollmentStateChange(sessionId, enrollmentId, oldStatus, newStatus, reason) {
    return this.log(sessionId, 'ENROLLMENT_STATE_CHANGE', {
      enrollmentId,
      oldStatus,
      newStatus,
      reason,
      timestamp: new Date()
    });
  }

  // Get debug logs for a session
  getSessionLogs(sessionId) {
    return this.debugLogs.filter(log => log.sessionId === sessionId);
  }

  // Get recent debug logs for an automation
  getAutomationLogs(automationId, limit = 100) {
    return this.debugLogs
      .filter(log => log.data.automationId === automationId)
      .slice(-limit);
  }

  // Create a detailed execution report
  async createExecutionReport(automationId, enrollmentId) {
    const enrollment = await AutomationEnrollment.findByPk(enrollmentId);
    const logs = await AutomationLog.findAll({
      where: {
        automationId,
        createdAt: {
          [Op.gte]: enrollment.enrolledAt
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const debugLogs = this.getAutomationLogs(automationId, 50);

    return {
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        currentStep: enrollment.currentStepIndex,
        enrolledAt: enrollment.enrolledAt,
        metadata: enrollment.metadata
      },
      executionLogs: logs.map(log => ({
        id: log.id,
        status: log.status,
        triggerType: log.triggerType,
        conditionsEvaluated: log.conditionsEvaluated,
        actionsExecuted: log.actionsExecuted,
        error: log.error,
        executedAt: log.executedAt
      })),
      debugLogs: debugLogs,
      summary: this.generateDebugSummary(debugLogs)
    };
  }

  // Generate a summary of common issues
  generateDebugSummary(debugLogs) {
    const issues = [];
    const conditionFailures = debugLogs.filter(log => 
      log.event === 'CONDITION_EVALUATION' && !log.data.result
    );
    const actionErrors = debugLogs.filter(log => 
      log.event === 'ACTION_EXECUTION' && log.data.error
    );
    const enrollmentFailures = debugLogs.filter(log => 
      log.event === 'ENROLLMENT_DECISION' && !log.data.decision
    );

    if (conditionFailures.length > 0) {
      issues.push({
        type: 'CONDITION_FAILURES',
        count: conditionFailures.length,
        details: conditionFailures.map(log => log.data.evaluation)
      });
    }

    if (actionErrors.length > 0) {
      issues.push({
        type: 'ACTION_ERRORS',
        count: actionErrors.length,
        details: actionErrors.map(log => ({
          action: log.data.action.type,
          error: log.data.error
        }))
      });
    }

    if (enrollmentFailures.length > 0) {
      issues.push({
        type: 'ENROLLMENT_FAILURES',
        count: enrollmentFailures.length,
        details: enrollmentFailures.map(log => log.data.reason)
      });
    }

    return {
      totalLogs: debugLogs.length,
      issues,
      hasErrors: actionErrors.length > 0,
      allConditionsPassed: conditionFailures.length === 0
    };
  }

  // Sanitize entity data for logging
  sanitizeEntity(entity) {
    const sanitized = { ...entity };
    // Remove sensitive fields if needed
    delete sanitized.password;
    delete sanitized.token;
    return sanitized;
  }

  // Test automation with detailed logging
  async testAutomation(automation, testData) {
    const sessionId = this.startSession(automation.id, 'test', 'test-entity');
    const results = {
      sessionId,
      logs: [],
      passed: false,
      issues: []
    };

    try {
      // Log the test data
      this.log(sessionId, 'TEST_START', {
        automationId: automation.id,
        automationName: automation.name,
        trigger: automation.trigger,
        testData
      });

      // Simulate trigger evaluation
      this.logTriggerEvaluation(sessionId, automation.trigger.type, testData, true);

      // Test conditions if any
      if (automation.conditions && automation.conditions.length > 0) {
        const testEntity = testData.contact || testData.deal || {};
        for (const condition of automation.conditions) {
          const result = await this.testCondition(condition, testEntity);
          this.logConditionEvaluation(sessionId, condition, testEntity, result);
          if (!result) {
            results.issues.push(`Condition failed: ${this.explainConditionResult(condition, testEntity[condition.field], result)}`);
          }
        }
      }

      // Test actions (without executing)
      for (const action of automation.actions) {
        this.log(sessionId, 'ACTION_TEST', {
          action,
          wouldExecute: true,
          testMode: true
        });
      }

      results.passed = results.issues.length === 0;
      results.logs = this.getSessionLogs(sessionId);

    } catch (error) {
      this.log(sessionId, 'TEST_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
      results.issues.push(`Test error: ${error.message}`);
    }

    return results;
  }

  // Test a single condition
  async testCondition(condition, entity) {
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
}

module.exports = new AutomationDebugger();