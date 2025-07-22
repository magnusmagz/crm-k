const { AutomationLog, AutomationEnrollment, Automation, Contact, Deal } = require('../models');
const { Op } = require('sequelize');
const automationDebugger = require('../services/automationDebugger');

class AutomationFailureAnalyzer {
  constructor() {
    this.failureReasons = {
      CONDITION_NOT_MET: 'Automation conditions were not satisfied',
      ACTION_FAILED: 'One or more actions failed to execute',
      ENTITY_NOT_FOUND: 'Target entity (contact/deal) was not found',
      ENROLLMENT_FAILED: 'Failed to enroll entity in automation',
      TRIGGER_MISMATCH: 'Event trigger did not match automation trigger',
      AUTOMATION_INACTIVE: 'Automation was inactive at execution time',
      PERMISSION_DENIED: 'User does not have permission for this automation',
      SYSTEM_ERROR: 'System error occurred during execution'
    };
  }

  async analyzeFailure(entityType, entityId, userId, options = {}) {
    const report = {
      entityType,
      entityId,
      userId,
      timestamp: new Date(),
      entity: null,
      enrollments: [],
      logs: [],
      applicableAutomations: [],
      issues: [],
      recommendations: []
    };

    try {
      // 1. Get entity details
      report.entity = await this.getEntity(entityType, entityId, userId);
      if (!report.entity) {
        report.issues.push({
          type: 'ENTITY_NOT_FOUND',
          severity: 'critical',
          message: `${entityType} with ID ${entityId} not found`
        });
        return report;
      }

      // 2. Get all enrollments
      report.enrollments = await this.getEnrollments(entityType, entityId, userId);

      // 3. Get automation logs
      report.logs = await this.getAutomationLogs(entityType, entityId, userId);

      // 4. Get applicable automations
      report.applicableAutomations = await this.getApplicableAutomations(entityType, userId);

      // 5. Analyze failures
      await this.analyzeEnrollmentFailures(report);
      await this.analyzeLogFailures(report);
      await this.analyzeMissingEnrollments(report);

      // 6. Generate recommendations
      this.generateRecommendations(report);

      // 7. Print report if requested
      if (options.printReport) {
        this.printReport(report);
      }

    } catch (error) {
      report.issues.push({
        type: 'SYSTEM_ERROR',
        severity: 'critical',
        message: error.message,
        stack: error.stack
      });
    }

    return report;
  }

  async getEntity(entityType, entityId, userId) {
    const Model = entityType === 'contact' ? Contact : Deal;
    return await Model.findOne({
      where: { id: entityId, userId }
    });
  }

  async getEnrollments(entityType, entityId, userId) {
    return await AutomationEnrollment.findAll({
      where: {
        entityType,
        entityId,
        userId
      },
      include: [{
        model: Automation,
        include: ['steps']
      }],
      order: [['createdAt', 'DESC']]
    });
  }

  async getAutomationLogs(entityType, entityId, userId) {
    const searchConditions = {
      userId,
      [Op.or]: []
    };

    // Different ways the entity might be referenced in logs
    if (entityType === 'contact') {
      searchConditions[Op.or].push(
        { triggerData: { contact: { id: entityId } } },
        { triggerData: { contactId: entityId } },
        { triggerData: { entity: { id: entityId, type: 'contact' } } }
      );
    } else {
      searchConditions[Op.or].push(
        { triggerData: { deal: { id: entityId } } },
        { triggerData: { dealId: entityId } },
        { triggerData: { entity: { id: entityId, type: 'deal' } } }
      );
    }

    return await AutomationLog.findAll({
      where: searchConditions,
      include: [{
        model: Automation,
        attributes: ['id', 'name', 'trigger']
      }],
      order: [['executedAt', 'DESC']],
      limit: 50
    });
  }

  async getApplicableAutomations(entityType, userId) {
    const triggerTypes = entityType === 'contact' 
      ? ['contact_created', 'contact_updated']
      : ['deal_created', 'deal_updated', 'deal_stage_changed'];

    return await Automation.findAll({
      where: {
        userId,
        isActive: true,
        [Op.or]: triggerTypes.map(type => ({ 
          trigger: { type } 
        }))
      }
    });
  }

  async analyzeEnrollmentFailures(report) {
    for (const enrollment of report.enrollments) {
      if (enrollment.status === 'failed') {
        report.issues.push({
          type: 'ENROLLMENT_FAILED',
          severity: 'high',
          message: `Enrollment ${enrollment.id} failed`,
          details: {
            automationName: enrollment.Automation?.name,
            failureReason: enrollment.metadata?.failureReason || enrollment.metadata?.error,
            failedAt: enrollment.updatedAt
          }
        });
      }

      if (enrollment.status === 'active' && enrollment.nextStepAt < new Date()) {
        report.issues.push({
          type: 'ENROLLMENT_STUCK',
          severity: 'medium',
          message: `Enrollment ${enrollment.id} is stuck`,
          details: {
            automationName: enrollment.Automation?.name,
            currentStep: enrollment.currentStepIndex,
            nextStepAt: enrollment.nextStepAt,
            timeSinceStuck: new Date() - enrollment.nextStepAt
          }
        });
      }
    }
  }

  async analyzeLogFailures(report) {
    for (const log of report.logs) {
      if (log.status === 'failed') {
        report.issues.push({
          type: 'ACTION_FAILED',
          severity: 'high',
          message: `Automation execution failed`,
          details: {
            automationName: log.Automation?.name,
            error: log.error,
            failedActions: log.actionsExecuted?.filter(a => a.status === 'failed'),
            executedAt: log.executedAt
          }
        });
      }

      if (log.status === 'skipped' && log.conditionsMet === false) {
        const failedConditions = log.conditionsEvaluated?.filter(c => !c.result);
        if (failedConditions?.length > 0) {
          report.issues.push({
            type: 'CONDITION_NOT_MET',
            severity: 'low',
            message: `Automation skipped due to conditions`,
            details: {
              automationName: log.Automation?.name,
              failedConditions,
              executedAt: log.executedAt
            }
          });
        }
      }
    }
  }

  async analyzeMissingEnrollments(report) {
    const enrolledAutomationIds = new Set(report.enrollments.map(e => e.automationId));
    
    for (const automation of report.applicableAutomations) {
      if (!enrolledAutomationIds.has(automation.id)) {
        // Check if conditions would be met
        const wouldQualify = await this.checkIfEntityQualifies(report.entity, automation);
        
        if (wouldQualify) {
          report.issues.push({
            type: 'MISSING_ENROLLMENT',
            severity: 'medium',
            message: `Entity not enrolled in applicable automation`,
            details: {
              automationName: automation.name,
              automationId: automation.id,
              trigger: automation.trigger
            }
          });
        }
      }
    }
  }

  async checkIfEntityQualifies(entity, automation) {
    if (!automation.conditions || automation.conditions.length === 0) {
      return true;
    }

    for (const condition of automation.conditions) {
      if (!this.evaluateCondition(condition, entity)) {
        return false;
      }
    }

    return true;
  }

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

  generateRecommendations(report) {
    const recommendations = [];

    // Check for stuck enrollments
    const stuckEnrollments = report.issues.filter(i => i.type === 'ENROLLMENT_STUCK');
    if (stuckEnrollments.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Process stuck enrollments',
        description: 'Use the /automations/enrollment/:id/process endpoint to manually process stuck enrollments',
        enrollmentIds: stuckEnrollments.map(i => i.details.enrollmentId)
      });
    }

    // Check for missing enrollments
    const missingEnrollments = report.issues.filter(i => i.type === 'MISSING_ENROLLMENT');
    if (missingEnrollments.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Manually enroll entity',
        description: 'Use the /automations/:id/enroll endpoint to manually enroll this entity',
        automationIds: missingEnrollments.map(i => i.details.automationId)
      });
    }

    // Check for systematic failures
    const actionFailures = report.issues.filter(i => i.type === 'ACTION_FAILED');
    if (actionFailures.length > 3) {
      recommendations.push({
        priority: 'high',
        action: 'Review automation configuration',
        description: 'Multiple action failures detected. Review automation actions for configuration errors.'
      });
    }

    // Check debug mode
    if (report.issues.some(i => i.type === 'SYSTEM_ERROR')) {
      recommendations.push({
        priority: 'high',
        action: 'Enable debug mode',
        description: 'Set AUTOMATION_DEBUG=true to capture detailed execution logs'
      });
    }

    report.recommendations = recommendations;
  }

  printReport(report) {
    console.log('\n=== AUTOMATION FAILURE ANALYSIS REPORT ===\n');

    // Entity Info
    console.log('Entity Information:');
    console.log(`Type: ${report.entityType}`);
    console.log(`ID: ${report.entityId}`);
    if (report.entity) {
      console.log(`Name: ${report.entityType === 'contact' 
        ? `${report.entity.firstName} ${report.entity.lastName}` 
        : report.entity.name}`);
    }
    console.log('');

    // Summary
    console.log('\nSummary:');
    console.log(`Total Enrollments: ${report.enrollments.length}`);
    console.log(`Failed Enrollments: ${report.enrollments.filter(e => e.status === 'failed').length}`);
    console.log(`Active Enrollments: ${report.enrollments.filter(e => e.status === 'active').length}`);
    console.log(`Automation Logs: ${report.logs.length}`);
    console.log(`Issues Found: ${report.issues.length}`);
    console.log('');

    // Issues
    if (report.issues.length > 0) {
      console.log('\nIssues Found:');
      report.issues.forEach((issue, index) => {
        const prefix = issue.severity === 'critical' ? '❌' 
                    : issue.severity === 'high' ? '⚠️' 
                    : '⚪';
        
        console.log(`\n${index + 1}. ${prefix} [${issue.severity.toUpperCase()}] ${issue.type}`);
        console.log(`   ${issue.message}`);
        if (issue.details) {
          Object.entries(issue.details).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              console.log(`   ${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`);
            }
          });
        }
      });
      console.log('');
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n✅ Recommendations:');
      report.recommendations.forEach((rec, index) => {
        const prefix = rec.priority === 'high' ? '🔴' : '🟡';
        console.log(`\n${index + 1}. ${prefix} [${rec.priority.toUpperCase()}] ${rec.action}`);
        console.log(`   ${rec.description}`);
        if (rec.enrollmentIds) {
          console.log(`   Enrollment IDs: ${rec.enrollmentIds.join(', ')}`);
        }
        if (rec.automationIds) {
          console.log(`   Automation IDs: ${rec.automationIds.join(', ')}`);
        }
      });
    }

    console.log('\n=== END OF REPORT ===\n');
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new AutomationFailureAnalyzer();
  const [,, entityType, entityId, userId] = process.argv;

  if (!entityType || !entityId || !userId) {
    console.log('Usage: node automationFailureAnalyzer.js <entityType> <entityId> <userId>');
    console.log('Example: node automationFailureAnalyzer.js contact 73ad755e-887e-4fc2-91c8-2f368d44cc1b user-id');
    process.exit(1);
  }

  analyzer.analyzeFailure(entityType, entityId, userId, { printReport: true })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = AutomationFailureAnalyzer;