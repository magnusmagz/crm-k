const { Contact, Deal, AutomationEnrollment, EmailSuppression } = require('../models');
const { Op } = require('sequelize');
const automationDebugger = require('./automationDebugger');

class ExitCriteriaEvaluator {
  constructor() {
    this.debugSessionId = null;
  }

  setDebugSession(sessionId) {
    this.debugSessionId = sessionId;
  }

  /**
   * Check if enrollment should exit based on automation's exit criteria
   * @param {Object} enrollment - The automation enrollment
   * @param {Object} automation - The automation with exit criteria
   * @param {Object} entity - The enrolled entity (contact or deal)
   * @returns {Object} { shouldExit: boolean, reason: string }
   */
  async checkExitCriteria(enrollment, automation, entity) {
    try {
      // Skip if no exit criteria defined
      if (!automation.exitCriteria || Object.keys(automation.exitCriteria).length === 0) {
        return { shouldExit: false };
      }

      // Check goal-based exits
      if (automation.exitCriteria.goals && automation.exitCriteria.goals.length > 0) {
        const goalCheck = await this.evaluateGoals(automation.exitCriteria.goals, entity, enrollment);
        if (goalCheck.shouldExit) {
          this.logExit('goal_met', goalCheck.reason, enrollment);
          return goalCheck;
        }
      }

      // Check condition-based exits
      if (automation.exitCriteria.conditions && automation.exitCriteria.conditions.length > 0) {
        const conditionCheck = await this.evaluateConditions(automation.exitCriteria.conditions, entity, enrollment);
        if (conditionCheck.shouldExit) {
          this.logExit('condition_met', conditionCheck.reason, enrollment);
          return conditionCheck;
        }
      }

      // Check time-based exits
      const timeCheck = await this.evaluateTimeConditions(enrollment, automation);
      if (timeCheck.shouldExit) {
        this.logExit('time_limit', timeCheck.reason, enrollment);
        return timeCheck;
      }

      // Check safety exits
      if (automation.safetyExitEnabled) {
        const safetyCheck = await this.evaluateSafetyConditions(enrollment, automation, entity);
        if (safetyCheck.shouldExit) {
          this.logExit('safety_exit', safetyCheck.reason, enrollment);
          return safetyCheck;
        }
      }

      return { shouldExit: false };
    } catch (error) {
      console.error('Error checking exit criteria:', error);
      automationDebugger.log(this.debugSessionId, 'EXIT_CHECK_ERROR', {
        error: error.message,
        enrollmentId: enrollment.id
      }, 'error');
      return { shouldExit: false };
    }
  }

  /**
   * Evaluate goal-based exit conditions
   */
  async evaluateGoals(goals, entity, enrollment) {
    for (const goal of goals) {
      try {
        let shouldExit = false;
        let reason = '';

        switch (goal.type) {
          case 'field_value':
            shouldExit = await this.checkFieldValue(entity, goal);
            if (shouldExit) {
              reason = goal.description || `Field ${goal.field} met goal condition`;
            }
            break;

          case 'tag_applied':
            if (enrollment.entityType === 'contact' && entity.tags) {
              const hasTag = goal.tags.some(tag => entity.tags.includes(tag));
              shouldExit = goal.match === 'any' ? hasTag : goal.tags.every(tag => entity.tags.includes(tag));
              if (shouldExit) {
                reason = goal.description || `Contact has required tag(s): ${goal.tags.join(', ')}`;
              }
            }
            break;

          case 'deal_value':
            if (enrollment.entityType === 'deal') {
              shouldExit = this.compareValue(entity.value, goal.operator, goal.value);
              if (shouldExit) {
                reason = goal.description || `Deal value ${goal.operator} ${goal.value}`;
              }
            }
            break;

          case 'custom_field':
            if (entity.customFields && entity.customFields[goal.fieldName]) {
              const fieldValue = entity.customFields[goal.fieldName];
              shouldExit = this.compareValue(fieldValue, goal.operator, goal.value);
              if (shouldExit) {
                reason = goal.description || `Custom field ${goal.fieldName} met condition`;
              }
            }
            break;
        }

        if (shouldExit) {
          return { shouldExit: true, reason };
        }
      } catch (error) {
        console.error(`Error evaluating goal ${goal.type}:`, error);
      }
    }

    return { shouldExit: false };
  }

  /**
   * Evaluate condition-based exits
   */
  async evaluateConditions(conditions, entity, enrollment) {
    for (const condition of conditions) {
      try {
        let shouldExit = false;
        let reason = '';

        switch (condition.type) {
          case 'email_engagement':
            // Check if contact has engaged with emails
            if (enrollment.entityType === 'contact') {
              const hasEngagement = await this.checkEmailEngagement(entity.id, condition);
              shouldExit = hasEngagement;
              if (shouldExit) {
                reason = condition.description || 'Contact engaged with email';
              }
            }
            break;

          case 'activity_count':
            // Check activity count in enrollment metadata
            const activityCount = enrollment.metadata?.activityCount || 0;
            shouldExit = activityCount >= condition.count;
            if (shouldExit) {
              reason = condition.description || `Reached ${activityCount} activities`;
            }
            break;

          case 'negative_condition':
            // Exit if condition is NOT met for X days
            const daysSinceEnrollment = Math.floor((Date.now() - new Date(enrollment.enrolledAt)) / (1000 * 60 * 60 * 24));
            if (daysSinceEnrollment >= condition.days) {
              const conditionMet = await this.evaluateNegativeCondition(condition.condition, entity);
              shouldExit = !conditionMet;
              if (shouldExit) {
                reason = condition.description || `Condition not met after ${condition.days} days`;
              }
            }
            break;
        }

        if (shouldExit) {
          return { shouldExit: true, reason };
        }
      } catch (error) {
        console.error(`Error evaluating condition ${condition.type}:`, error);
      }
    }

    return { shouldExit: false };
  }

  /**
   * Evaluate time-based conditions
   */
  async evaluateTimeConditions(enrollment, automation) {
    const now = new Date();
    const enrolledAt = new Date(enrollment.enrolledAt);
    const daysSinceEnrollment = Math.floor((now - enrolledAt) / (1000 * 60 * 60 * 24));

    // Check max duration from automation settings
    if (automation.maxDurationDays && daysSinceEnrollment >= automation.maxDurationDays) {
      return {
        shouldExit: true,
        reason: `Reached maximum duration of ${automation.maxDurationDays} days`
      };
    }

    // Check time conditions in exit criteria
    if (automation.exitCriteria.conditions) {
      for (const condition of automation.exitCriteria.conditions) {
        if (condition.type === 'time_in_automation' && daysSinceEnrollment >= condition.days) {
          return {
            shouldExit: true,
            reason: condition.description || `Reached time limit of ${condition.days} days`
          };
        }
      }
    }

    return { shouldExit: false };
  }

  /**
   * Evaluate safety conditions
   */
  async evaluateSafetyConditions(enrollment, automation, entity) {
    const safety = automation.exitCriteria.safety || {};

    // Check max duration (safety net)
    if (safety.max_duration_days) {
      const daysSinceEnrollment = Math.floor((Date.now() - new Date(enrollment.enrolledAt)) / (1000 * 60 * 60 * 24));
      if (daysSinceEnrollment >= safety.max_duration_days) {
        return {
          shouldExit: true,
          reason: `Safety exit: Exceeded maximum duration of ${safety.max_duration_days} days`
        };
      }
    }

    // Check error count
    if (safety.max_errors && enrollment.metadata?.errorCount >= safety.max_errors) {
      return {
        shouldExit: true,
        reason: `Safety exit: Reached maximum error count of ${safety.max_errors}`
      };
    }

    // Check email suppression (unsubscribe/bounce)
    if (enrollment.entityType === 'contact') {
      const suppression = await EmailSuppression.findOne({
        where: {
          email: entity.email,
          reason: { [Op.in]: ['unsubscribe', 'bounce'] }
        }
      });

      if (suppression) {
        if (safety.exit_on_unsubscribe && suppression.reason === 'unsubscribe') {
          return {
            shouldExit: true,
            reason: 'Safety exit: Contact unsubscribed from emails'
          };
        }
        if (safety.exit_on_bounce && suppression.reason === 'bounce') {
          return {
            shouldExit: true,
            reason: 'Safety exit: Email bounced'
          };
        }
      }
    }

    return { shouldExit: false };
  }

  /**
   * Helper: Check field value against condition
   */
  async checkFieldValue(entity, goal) {
    const fieldValue = entity[goal.field];
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    return this.compareValue(fieldValue, goal.operator, goal.value);
  }

  /**
   * Helper: Compare values based on operator
   */
  compareValue(actualValue, operator, expectedValue) {
    switch (operator) {
      case 'equals':
        return actualValue == expectedValue;
      case 'not_equals':
        return actualValue != expectedValue;
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      case 'greater_or_equal':
        return Number(actualValue) >= Number(expectedValue);
      case 'less_or_equal':
        return Number(actualValue) <= Number(expectedValue);
      case 'contains':
        return String(actualValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(actualValue).includes(String(expectedValue));
      case 'is_empty':
        return !actualValue || actualValue === '';
      case 'is_not_empty':
        return actualValue && actualValue !== '';
      default:
        return false;
    }
  }

  /**
   * Helper: Check email engagement
   */
  async checkEmailEngagement(contactId, condition) {
    // This would need to be implemented based on your email tracking system
    // For now, returning false as placeholder
    return false;
  }

  /**
   * Helper: Evaluate negative condition
   */
  async evaluateNegativeCondition(condition, entity) {
    // Implement based on condition structure
    return false;
  }

  /**
   * Log exit event
   */
  logExit(type, reason, enrollment) {
    automationDebugger.log(this.debugSessionId, 'EXIT_CRITERIA_MET', {
      type,
      reason,
      enrollmentId: enrollment.id,
      automationId: enrollment.automationId,
      entityType: enrollment.entityType,
      entityId: enrollment.entityId
    });
  }
}

module.exports = new ExitCriteriaEvaluator();