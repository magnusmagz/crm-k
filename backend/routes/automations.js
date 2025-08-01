const express = require('express');
const { body, validationResult } = require('express-validator');
const { Automation, AutomationLog, AutomationEnrollment, AutomationStep, Contact, Deal, CustomField } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const automationEnrollmentService = require('../services/automationEnrollmentService');

const router = express.Router();

// Get all automations for the user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const automations = await Automation.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      attributes: {
        include: [
          [Automation.sequelize.literal(
            `(SELECT COUNT(*) FROM automation_logs WHERE automation_logs.automation_id = "Automation".id)`
          ), 'totalExecutions'],
          [Automation.sequelize.literal(
            `(SELECT COUNT(*) FROM automation_logs WHERE automation_logs.automation_id = "Automation".id AND status = 'success')`
          ), 'successfulExecutions']
        ]
      }
    });

    res.json({ automations });
  } catch (error) {
    console.error('Get automations error:', error);
    res.status(500).json({ error: 'Failed to get automations' });
  }
});

// Get single automation with logs and enrollment info
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: AutomationLog,
          as: 'logs',
          limit: 50,
          order: [['executedAt', 'DESC']]
        },
        {
          model: AutomationStep,
          as: 'steps',
          order: [['stepIndex', 'ASC']]
        }
      ]
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json({ automation });
  } catch (error) {
    console.error('Get automation error:', error);
    res.status(500).json({ error: 'Failed to get automation' });
  }
});

// Create new automation
router.post('/', authMiddleware, [
  body('name').notEmpty().trim(),
  body('trigger.type').isIn([
    'contact_created',
    'contact_updated',
    'deal_created',
    'deal_updated',
    'deal_stage_changed'
  ]),
  body('actions').isArray({ min: 1 }),
  body('conditions').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const automation = await Automation.create({
      ...req.body,
      userId: req.user.id
    });

    res.status(201).json({ automation });
  } catch (error) {
    console.error('Create automation error:', error);
    res.status(500).json({ error: 'Failed to create automation' });
  }
});

// Update automation
router.put('/:id', authMiddleware, [
  body('name').optional().notEmpty().trim(),
  body('isActive').optional().isBoolean(),
  body('trigger').optional().isObject(),
  body('conditions').optional().isArray(),
  body('actions').optional().isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    await automation.update(req.body);
    res.json({ automation });
  } catch (error) {
    console.error('Update automation error:', error);
    res.status(500).json({ error: 'Failed to update automation' });
  }
});

// Toggle automation active state
router.patch('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    await automation.update({ isActive: !automation.isActive });
    res.json({ automation });
  } catch (error) {
    console.error('Toggle automation error:', error);
    res.status(500).json({ error: 'Failed to toggle automation' });
  }
});

// Delete automation
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    await automation.destroy();
    res.json({ message: 'Automation deleted successfully' });
  } catch (error) {
    console.error('Delete automation error:', error);
    res.status(500).json({ error: 'Failed to delete automation' });
  }
});

// Get automation logs
router.get('/:id/logs', authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    const logs = await AutomationLog.findAndCountAll({
      where: { automationId: req.params.id },
      order: [['executedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      logs: logs.rows,
      total: logs.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get automation logs error:', error);
    res.status(500).json({ error: 'Failed to get automation logs' });
  }
});

// Test automation with sample data
router.post('/:id/test', authMiddleware, async (req, res) => {
  try {
    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    // Create test data based on trigger type
    const testData = req.body.testData || await generateTestData(automation.trigger.type, req.user.id);
    
    // Validate that we have required data
    if (!testData || Object.keys(testData).length === 0) {
      return res.status(400).json({ error: 'Invalid test data generated' });
    }

    // Import the engine to test
    const automationEngine = require('../services/automationEngine');
    
    // Test the automation
    const testEvent = {
      type: automation.trigger.type,
      userId: req.user.id,
      data: testData
    };

    // For new multi-step automations, use the enrollment service
    if (automation.isMultiStep) {
      const automationEnrollmentService = require('../services/automationEnrollmentService');
      const automationEngineV2 = require('../services/automationEngineV2');
      
      // Create a test entity based on trigger type
      let testEntity;
      if (automation.trigger.type.includes('contact')) {
        testEntity = { id: 'test-contact-' + Date.now(), ...testData.contact };
      } else {
        testEntity = { id: 'test-deal-' + Date.now(), ...testData.deal };
      }
      
      // Check if it would be enrolled
      const wouldEnroll = await automationEnrollmentService.checkEnrollmentCriteria(
        automation, 
        testEntity, 
        automation.trigger.type, 
        testData
      );
      
      res.json({ 
        message: 'Test completed',
        testData,
        wouldEnroll,
        automationType: 'multi-step'
      });
    } else {
      // Legacy single-step automation test
      await automationEngine.executeAutomation(automation, testEvent);
      
      // Check the latest log to see if it succeeded
      const latestLog = await AutomationLog.findOne({
        where: { 
          automationId: automation.id,
          triggerType: testEvent.type
        },
        order: [['executedAt', 'DESC']]
      });
      
      res.json({ 
        message: 'Test completed',
        testData,
        result: {
          status: latestLog?.status || 'unknown',
          conditionsMet: latestLog?.conditionsMet,
          actionsExecuted: latestLog?.actionsExecuted,
          error: latestLog?.error
        }
      });
    }
  } catch (error) {
    console.error('Test automation error:', error);
    res.status(500).json({ error: 'Failed to test automation' });
  }
});

// Helper function to generate test data
async function generateTestData(triggerType, userId) {
  switch (triggerType) {
    case 'contact_created':
    case 'contact_updated':
      return {
        contact: {
          id: 'test-contact-id',
          firstName: 'Test',
          lastName: 'Contact',
          email: 'test@example.com',
          phone: '555-0123',
          company: 'Test Company',
          tags: ['test', 'sample'],
          notes: 'This is a test contact'
        },
        changedFields: ['email', 'phone']
      };

    case 'deal_created':
    case 'deal_updated':
      return {
        deal: {
          id: 'test-deal-id',
          name: 'Test Deal',
          value: 10000,
          status: 'open',
          stageId: 'test-stage-id',
          Stage: {
            id: 'test-stage-id',
            name: 'Qualified'
          },
          Contact: {
            id: 'test-contact-id',
            firstName: 'Test',
            lastName: 'Contact'
          }
        },
        changedFields: ['value', 'stageId']
      };

    case 'deal_stage_changed':
      return {
        deal: {
          id: 'test-deal-id',
          name: 'Test Deal',
          value: 10000,
          stageId: 'new-stage-id',
          Stage: {
            id: 'new-stage-id',
            name: 'Proposal'
          }
        },
        previousStage: {
          id: 'old-stage-id',
          name: 'Qualified'
        },
        newStage: {
          id: 'new-stage-id',
          name: 'Proposal'
        }
      };

    default:
      return {};
  }
}

// Get enrollment summary for an automation
router.get('/:id/enrollments', authMiddleware, async (req, res) => {
  try {
    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    const summary = await automationEnrollmentService.getEnrollmentSummary(req.params.id);
    const enrolledEntities = await automationEnrollmentService.getEnrolledEntities(req.params.id);

    res.json({ 
      summary,
      enrolledEntities: enrolledEntities.slice(0, 20) // Return first 20
    });
  } catch (error) {
    console.error('Get enrollments error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get enrollments',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Preview enrollment for an automation
router.get('/:id/preview-enrollment', authMiddleware, async (req, res) => {
  try {
    const preview = await automationEnrollmentService.previewEnrollment(
      req.params.id,
      req.user.id
    );

    res.json(preview);
  } catch (error) {
    console.error('Preview enrollment error:', error);
    res.status(500).json({ error: 'Failed to preview enrollment' });
  }
});

// Manually enroll entities
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const { entityType, entityIds } = req.body;

    if (!entityType || !entityIds || !Array.isArray(entityIds)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    const results = [];
    const automationEngineV2 = require('../services/automationEngineV2');

    for (const entityId of entityIds) {
      const result = await automationEngineV2.enroll(
        automation,
        entityType,
        entityId,
        req.user.id
      );
      results.push({ entityId, ...result });
    }

    res.json({ results });
  } catch (error) {
    console.error('Manual enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll entities' });
  }
});

// Unenroll entity from automation
router.post('/:id/unenroll', authMiddleware, async (req, res) => {
  try {
    const { entityType, entityId } = req.body;

    const automationEngineV2 = require('../services/automationEngineV2');
    await automationEngineV2.unenroll(req.params.id, entityType, entityId);

    res.json({ message: 'Entity unenrolled successfully' });
  } catch (error) {
    console.error('Unenroll error:', error);
    res.status(500).json({ error: 'Failed to unenroll entity' });
  }
});

// Get debug logs for an automation
router.get('/:id/debug', authMiddleware, async (req, res) => {
  try {
    const automationDebugger = require('../services/automationDebugger');
    const logs = automationDebugger.getAutomationLogs(req.params.id, 100);
    
    // Get recent enrollments
    const recentEnrollments = await AutomationEnrollment.findAll({
      where: { 
        automationId: req.params.id,
        userId: req.user.id 
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({ 
      debugLogs: logs,
      recentEnrollments,
      debugMode: process.env.AUTOMATION_DEBUG === 'true'
    });
  } catch (error) {
    console.error('Get debug logs error:', error);
    res.status(500).json({ error: 'Failed to get debug logs' });
  }
});

// Force process a specific enrollment (for debugging)
router.post('/enrollment/:enrollmentId/process', authMiddleware, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    
    // Find the enrollment
    const enrollment = await AutomationEnrollment.findOne({
      where: {
        id: enrollmentId,
        userId: req.user.id
      },
      include: [{
        model: Automation,
        include: [{
          model: AutomationStep,
          as: 'steps'
        }]
      }]
    });
    
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    const automationEngineV2 = require('../services/automationEngineV2');
    const automationDebugger = require('../services/automationDebugger');
    
    // Enable debug mode temporarily
    const originalDebugMode = automationDebugger.isDebugMode;
    automationDebugger.isDebugMode = true;
    
    try {
      // Process the enrollment
      await automationEngineV2.processEnrollmentStep(enrollment);
      
      // Get debug logs
      const logs = automationDebugger.getAutomationLogs(enrollment.automationId, 50);
      
      res.json({
        message: 'Enrollment processed',
        enrollment: enrollment.toJSON(),
        debugLogs: logs
      });
    } finally {
      // Restore debug mode
      automationDebugger.isDebugMode = originalDebugMode;
    }
  } catch (error) {
    console.error('Process enrollment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get debug logs for a specific entity
router.get('/debug/entity/:entityType/:entityId', authMiddleware, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const automationDebugger = require('../services/automationDebugger');
    const logs = automationDebugger.getEntityLogs(entityType, entityId, 100);
    
    // Get enrollments for this entity
    const enrollments = await AutomationEnrollment.findAll({
      where: { 
        entityType,
        entityId,
        userId: req.user.id 
      },
      include: [{ 
        model: Automation,
        attributes: ['id', 'name', 'trigger', 'isActive', 'actions']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ 
      debugLogs: logs,
      enrollments,
      entityType,
      entityId,
      debugMode: process.env.AUTOMATION_DEBUG === 'true'
    });
  } catch (error) {
    console.error('Get entity debug logs error:', error);
    res.status(500).json({ error: 'Failed to get entity debug logs' });
  }
});

// Manually process an enrollment
router.post('/:id/process-enrollment', authMiddleware, async (req, res) => {
  try {
    const { enrollmentId } = req.body;
    
    if (!enrollmentId) {
      return res.status(400).json({ error: 'Enrollment ID required' });
    }
    
    const enrollment = await AutomationEnrollment.findOne({
      where: {
        id: enrollmentId,
        userId: req.user.id
      },
      include: [{
        model: Automation,
        include: [{
          model: require('../models').AutomationStep,
          as: 'steps'
        }]
      }]
    });
    
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    const automationEngineV2 = require('../services/automationEngineV2');
    const automationDebugger = require('../services/automationDebugger');
    
    // Enable debug mode for this request
    automationDebugger.setDebugMode(true);
    
    // Process the enrollment
    await automationEngineV2.processEnrollmentStep(enrollment);
    
    // Get the latest logs
    const logs = automationDebugger.getEntityLogs(enrollment.entityType, enrollment.entityId, 20);
    
    res.json({ 
      message: 'Enrollment processed',
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        currentStepIndex: enrollment.currentStepIndex,
        nextStepAt: enrollment.nextStepAt
      },
      debugLogs: logs
    });
  } catch (error) {
    console.error('Process enrollment error:', error);
    res.status(500).json({ 
      error: 'Failed to process enrollment',
      details: error.message 
    });
  }
});

// Process enrollment by ID directly (for debugging)
router.post('/enrollment/:enrollmentId/process', authMiddleware, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    
    const enrollment = await AutomationEnrollment.findOne({
      where: {
        id: enrollmentId,
        userId: req.user.id
      },
      include: [{
        model: Automation,
        include: [{
          model: require('../models').AutomationStep,
          as: 'steps'
        }]
      }]
    });
    
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    const automationEngineV2 = require('../services/automationEngineV2');
    const automationDebugger = require('../services/automationDebugger');
    
    // Enable debug mode
    automationDebugger.setDebugMode(true);
    
    console.log('Processing enrollment:', {
      id: enrollment.id,
      automationId: enrollment.automationId,
      status: enrollment.status,
      hasAutomation: !!enrollment.Automation,
      automationName: enrollment.Automation?.name,
      automationActions: enrollment.Automation?.actions
    });
    
    // Process the enrollment
    await automationEngineV2.processEnrollmentStep(enrollment);
    
    // Reload enrollment to get updated status
    await enrollment.reload();
    
    // Get debug logs
    const logs = automationDebugger.getEntityLogs(enrollment.entityType, enrollment.entityId, 50);
    
    res.json({ 
      message: 'Enrollment processed',
      enrollment: {
        id: enrollment.id,
        automationId: enrollment.automationId,
        status: enrollment.status,
        currentStepIndex: enrollment.currentStepIndex,
        nextStepAt: enrollment.nextStepAt,
        completedAt: enrollment.completedAt,
        metadata: enrollment.metadata
      },
      automation: {
        id: enrollment.Automation?.id,
        name: enrollment.Automation?.name,
        actions: enrollment.Automation?.actions,
        conditions: enrollment.Automation?.conditions
      },
      debugLogs: logs
    });
  } catch (error) {
    console.error('Process enrollment error:', error);
    res.status(500).json({ 
      error: 'Failed to process enrollment',
      details: error.message,
      stack: error.stack
    });
  }
});

// Get available fields for automation conditions and actions
router.get('/fields/:entityType', authMiddleware, async (req, res) => {
  try {
    const { entityType } = req.params;
    
    if (!['contact', 'deal'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }
    
    // Get custom fields for the entity type
    const customFields = await CustomField.findAll({
      where: { 
        userId: req.user.id,
        entityType: entityType
      },
      order: [['createdAt', 'ASC']]
    });
    
    // Define standard fields
    const standardFields = entityType === 'contact' ? [
      { name: 'firstName', label: 'First Name', type: 'text' },
      { name: 'lastName', label: 'Last Name', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'position', label: 'Position', type: 'text' },
      { name: 'tags', label: 'Tags', type: 'array' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ] : [
      { name: 'name', label: 'Deal Name', type: 'text' },
      { name: 'value', label: 'Deal Value', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['open', 'won', 'lost'] },
      { name: 'stageId', label: 'Stage', type: 'select' },
      { name: 'expectedCloseDate', label: 'Expected Close Date', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ];
    
    // Format custom fields to match standard fields structure
    const formattedCustomFields = customFields.map(field => ({
      name: `customFields.${field.name}`,
      label: field.label,
      type: field.type,
      options: field.options,
      isCustom: true,
      required: field.required
    }));
    
    res.json({ 
      fields: [...standardFields, ...formattedCustomFields],
      entityType 
    });
  } catch (error) {
    console.error('Get fields error:', error);
    res.status(500).json({ error: 'Failed to get fields' });
  }
});

// Create multi-step automation
router.post('/multi-step', authMiddleware, [
  body('name').notEmpty().trim(),
  body('trigger').isObject(),
  body('steps').isArray({ min: 1 }),
  body('description').optional().trim(),
  body('exitCriteria').optional().isObject(),
  body('maxDurationDays').optional().isInt({ min: 1, max: 365 }),
  body('safetyExitEnabled').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, trigger, steps, description, exitCriteria, maxDurationDays, safetyExitEnabled } = req.body;
    
    // Create the automation
    const automation = await Automation.create({
      name,
      trigger,
      conditions: [], // Multi-step automations use step conditions
      actions: [], // Multi-step automations use step actions
      isMultiStep: true,
      type: 'multi_step',
      description,
      exitCriteria: exitCriteria || {},
      maxDurationDays: maxDurationDays || null,
      safetyExitEnabled: safetyExitEnabled !== false, // Default to true
      userId: req.user.id
    });

    // Create the steps
    const createdSteps = [];
    for (const step of steps) {
      const createdStep = await AutomationStep.create({
        automationId: automation.id,
        stepIndex: step.stepIndex,
        name: step.name,
        type: step.type,
        config: step.config || {},
        conditions: step.conditions || [],
        actions: step.actions || [],
        delayConfig: step.delayConfig || null,
        branchConfig: step.branchConfig || null,
        nextStepIndex: step.nextStepIndex !== undefined ? step.nextStepIndex : null,
        branchStepIndices: step.branchStepIndices || {}
      });
      createdSteps.push(createdStep);
    }

    // Return automation with steps
    const result = await Automation.findByPk(automation.id, {
      include: [{
        model: AutomationStep,
        as: 'steps',
        order: [['stepIndex', 'ASC']]
      }]
    });

    res.status(201).json({ automation: result });
  } catch (error) {
    console.error('Create multi-step automation error:', error);
    res.status(500).json({ error: 'Failed to create multi-step automation' });
  }
});

// Update multi-step automation
router.put('/:id/multi-step', authMiddleware, [
  body('name').optional().notEmpty().trim(),
  body('trigger').optional().isObject(),
  body('steps').optional().isArray({ min: 1 }),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean(),
  body('exitCriteria').optional().isObject(),
  body('maxDurationDays').optional().isInt({ min: 1, max: 365 }),
  body('safetyExitEnabled').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        isMultiStep: true
      }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Multi-step automation not found' });
    }

    // Update automation fields if provided
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.trigger !== undefined) updates.trigger = req.body.trigger;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.exitCriteria !== undefined) updates.exitCriteria = req.body.exitCriteria;
    if (req.body.maxDurationDays !== undefined) updates.maxDurationDays = req.body.maxDurationDays;
    if (req.body.safetyExitEnabled !== undefined) updates.safetyExitEnabled = req.body.safetyExitEnabled;
    
    if (Object.keys(updates).length > 0) {
      await automation.update(updates);
    }

    // Update steps if provided
    if (req.body.steps) {
      // Delete existing steps
      await AutomationStep.destroy({
        where: { automationId: automation.id }
      });

      // Create new steps
      for (const step of req.body.steps) {
        await AutomationStep.create({
          automationId: automation.id,
          stepIndex: step.stepIndex,
          name: step.name,
          type: step.type,
          config: step.config || {},
          conditions: step.conditions || [],
          actions: step.actions || [],
          delayConfig: step.delayConfig || null,
          branchConfig: step.branchConfig || null,
          nextStepIndex: step.nextStepIndex !== undefined ? step.nextStepIndex : null,
          branchStepIndices: step.branchStepIndices || {}
        });
      }
    }

    // Return updated automation with steps
    const result = await Automation.findByPk(automation.id, {
      include: [{
        model: AutomationStep,
        as: 'steps',
        order: [['stepIndex', 'ASC']]
      }]
    });

    res.json({ automation: result });
  } catch (error) {
    console.error('Update multi-step automation error:', error);
    res.status(500).json({ error: 'Failed to update multi-step automation' });
  }
});

// Get automation with steps
router.get('/:id/with-steps', authMiddleware, async (req, res) => {
  try {
    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [{
        model: AutomationStep,
        as: 'steps',
        order: [['stepIndex', 'ASC']]
      }]
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json({ automation });
  } catch (error) {
    console.error('Get automation with steps error:', error);
    res.status(500).json({ error: 'Failed to get automation' });
  }
});

// Validate workflow
router.post('/:id/validate', authMiddleware, async (req, res) => {
  try {
    const automation = await Automation.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [{
        model: AutomationStep,
        as: 'steps',
        order: [['stepIndex', 'ASC']]
      }]
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    const errors = [];
    const warnings = [];

    // Validate each step
    const stepIndices = new Set();
    for (const step of automation.steps) {
      stepIndices.add(step.stepIndex);

      // Check for duplicate indices
      if (stepIndices.size !== automation.steps.filter(s => s.stepIndex <= step.stepIndex).length) {
        errors.push(`Duplicate step index: ${step.stepIndex}`);
      }

      // Validate step connections
      if (step.nextStepIndex !== null && !stepIndices.has(step.nextStepIndex)) {
        errors.push(`Step ${step.stepIndex} references non-existent step ${step.nextStepIndex}`);
      }

      // Validate branch connections
      if (step.branchStepIndices) {
        for (const [branch, targetIndex] of Object.entries(step.branchStepIndices)) {
          if (targetIndex !== null && !stepIndices.has(targetIndex)) {
            errors.push(`Step ${step.stepIndex} branch '${branch}' references non-existent step ${targetIndex}`);
          }
        }
      }

      // Check for required configurations
      switch (step.type) {
        case 'action':
          if (!step.actions || step.actions.length === 0) {
            errors.push(`Action step ${step.stepIndex} has no actions configured`);
          }
          break;
        case 'delay':
          if (!step.delayConfig || !step.delayConfig.value || !step.delayConfig.unit) {
            errors.push(`Delay step ${step.stepIndex} missing delay configuration`);
          }
          break;
        case 'condition':
          if (!step.conditions || step.conditions.length === 0) {
            errors.push(`Condition step ${step.stepIndex} has no conditions configured`);
          }
          if (!step.branchStepIndices || (!step.branchStepIndices.true && !step.branchStepIndices.false)) {
            warnings.push(`Condition step ${step.stepIndex} has no branch paths configured`);
          }
          break;
        case 'branch':
          if (!step.branchConfig || !step.branchConfig.branches || step.branchConfig.branches.length === 0) {
            errors.push(`Branch step ${step.stepIndex} has no branches configured`);
          }
          break;
      }
    }

    // Check for unreachable steps
    const reachableSteps = new Set([0]); // Start from step 0
    let changed = true;
    while (changed) {
      changed = false;
      for (const step of automation.steps) {
        if (reachableSteps.has(step.stepIndex)) {
          // Add next step
          if (step.nextStepIndex !== null && !reachableSteps.has(step.nextStepIndex)) {
            reachableSteps.add(step.nextStepIndex);
            changed = true;
          }
          // Add branch targets
          if (step.branchStepIndices) {
            for (const targetIndex of Object.values(step.branchStepIndices)) {
              if (targetIndex !== null && !reachableSteps.has(targetIndex)) {
                reachableSteps.add(targetIndex);
                changed = true;
              }
            }
          }
        }
      }
    }

    for (const step of automation.steps) {
      if (!reachableSteps.has(step.stepIndex)) {
        warnings.push(`Step ${step.stepIndex} is unreachable`);
      }
    }

    res.json({
      valid: errors.length === 0,
      errors,
      warnings
    });
  } catch (error) {
    console.error('Validate workflow error:', error);
    res.status(500).json({ error: 'Failed to validate workflow' });
  }
});

module.exports = router;