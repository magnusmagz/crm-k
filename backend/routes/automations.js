const express = require('express');
const { body, validationResult } = require('express-validator');
const { Automation, AutomationLog, AutomationEnrollment, AutomationStep, Contact, Deal } = require('../models');
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
    res.status(500).json({ error: 'Failed to get enrollments' });
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

module.exports = router;