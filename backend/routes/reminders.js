const express = require('express');
const { body, validationResult } = require('express-validator');
const { Reminder } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Validation middleware
const validateReminder = [
  body('title').notEmpty().trim().withMessage('Title is required').isLength({ max: 255 }).withMessage('Title must be less than 255 characters'),
  body('description').optional().trim(),
  body('remindAt').isISO8601().withMessage('Valid reminder date is required').custom((value) => {
    if (new Date(value) <= new Date()) {
      throw new Error('Reminder date must be in the future');
    }
    return true;
  }),
  body('entityType').optional().isIn(['contact', 'deal']).withMessage('Entity type must be contact or deal'),
  body('entityId').optional().isUUID().withMessage('Entity ID must be a valid UUID'),
  body('entityName').optional().trim().isLength({ max: 255 }).withMessage('Entity name must be less than 255 characters')
];

// Get user's pending reminders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { completed, entityType, limit = 50, offset = 0 } = req.query;

    const where = { userId: req.user.id };

    // Filter by completion status
    if (completed !== undefined) {
      where.isCompleted = completed === 'true';
    }

    // Filter by entity type
    if (entityType) {
      where.entityType = entityType;
    }

    const reminders = await Reminder.findAndCountAll({
      where,
      order: [['remindAt', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      reminders: reminders.rows,
      total: reminders.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// Create new reminder
router.post('/', authMiddleware, validateReminder, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const reminder = await Reminder.create({
      ...req.body,
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Reminder created successfully',
      reminder
    });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// Get specific reminder
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ reminder });
  } catch (error) {
    console.error('Get reminder error:', error);
    res.status(500).json({ error: 'Failed to fetch reminder' });
  }
});

// Update reminder (primarily for completion status)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Toggle completion status if not specified
    const isCompleted = req.body.isCompleted !== undefined ? req.body.isCompleted : !reminder.isCompleted;

    await reminder.update({
      isCompleted,
      completedAt: isCompleted ? new Date() : null
    });

    res.json({
      message: 'Reminder updated successfully',
      reminder
    });
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// Delete reminder
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Reminder.destroy({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

// Check for due reminders (for polling)
router.get('/check/due', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const reminders = await Reminder.findAll({
      where: {
        userId: req.user.id,
        isCompleted: false,
        remindAt: { [Op.lte]: now }
      },
      order: [['remindAt', 'ASC']],
      limit: 10 // Limit to avoid too many notifications at once
    });

    res.json({ reminders });
  } catch (error) {
    console.error('Check due reminders error:', error);
    res.status(500).json({ error: 'Failed to check due reminders' });
  }
});

// Get dashboard summary
router.get('/dashboard/summary', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalPending,
      dueToday,
      overdue,
      completedToday
    ] = await Promise.all([
      Reminder.count({
        where: { userId: req.user.id, isCompleted: false }
      }),
      Reminder.count({
        where: {
          userId: req.user.id,
          isCompleted: false,
          remindAt: { [Op.between]: [startOfDay, endOfDay] }
        }
      }),
      Reminder.count({
        where: {
          userId: req.user.id,
          isCompleted: false,
          remindAt: { [Op.lt]: now }
        }
      }),
      Reminder.count({
        where: {
          userId: req.user.id,
          isCompleted: true,
          completedAt: { [Op.between]: [startOfDay, endOfDay] }
        }
      })
    ]);

    res.json({
      totalPending,
      dueToday,
      overdue,
      completedToday
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// Bulk operations
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { action, reminderIds } = req.body;

    if (!action || !reminderIds || !Array.isArray(reminderIds)) {
      return res.status(400).json({ error: 'Action and reminder IDs are required' });
    }

    let updateData = {};
    switch (action) {
      case 'complete':
        updateData = { isCompleted: true, completedAt: new Date() };
        break;
      case 'incomplete':
        updateData = { isCompleted: false, completedAt: null };
        break;
      case 'delete':
        const result = await Reminder.destroy({
          where: {
            id: { [Op.in]: reminderIds },
            userId: req.user.id
          }
        });
        return res.json({ message: `${result} reminders deleted successfully` });
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const [affectedCount] = await Reminder.update(updateData, {
      where: {
        id: { [Op.in]: reminderIds },
        userId: req.user.id
      }
    });

    res.json({ message: `${affectedCount} reminders updated successfully` });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

module.exports = router;