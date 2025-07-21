const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Deal, Contact, Stage } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Validation middleware
const validateDeal = [
  body('name').notEmpty().trim(),
  body('value').optional().isDecimal({ decimal_digits: '0,2' }),
  body('stageId').isUUID(),
  body('contactId').optional({ nullable: true }).isUUID(),
  body('notes').optional().trim(),
  body('expectedCloseDate').optional().isISO8601()
];

// Get all deals for the user with filtering
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      search,
      stageId,
      status = 'open',
      contactId,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      limit = 100,
      offset = 0
    } = req.query;

    const where = { userId: req.user.id };

    // Status filter
    if (status !== 'all') {
      where.status = status;
    }

    // Stage filter
    if (stageId) {
      where.stageId = stageId;
    }

    // Contact filter
    if (contactId) {
      where.contactId = contactId;
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const deals = await Deal.findAndCountAll({
      where,
      include: [
        {
          model: Contact,
          attributes: ['id', 'firstName', 'lastName', 'email', 'company']
        },
        {
          model: Stage,
          attributes: ['id', 'name', 'color', 'order']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate analytics
    const analytics = await Deal.findAll({
      where: { userId: req.user.id },
      attributes: [
        'status',
        [Deal.sequelize.fn('COUNT', Deal.sequelize.col('id')), 'count'],
        [Deal.sequelize.fn('SUM', Deal.sequelize.col('value')), 'totalValue']
      ],
      group: ['status']
    });

    const analyticsData = {
      total: 0,
      totalValue: 0,
      open: 0,
      openValue: 0,
      won: 0,
      wonValue: 0,
      lost: 0,
      lostValue: 0
    };

    analytics.forEach(stat => {
      const count = parseInt(stat.dataValues.count);
      const value = parseFloat(stat.dataValues.totalValue || 0);
      analyticsData.total += count;
      analyticsData.totalValue += value;
      analyticsData[stat.status] = count;
      analyticsData[`${stat.status}Value`] = value;
    });

    res.json({
      deals: deals.rows,
      total: deals.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      analytics: analyticsData
    });
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({ error: 'Failed to get deals' });
  }
});

// Get single deal
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: Contact,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'company']
        },
        {
          model: Stage,
          attributes: ['id', 'name', 'color']
        }
      ]
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ deal });
  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({ error: 'Failed to get deal' });
  }
});

// Create new deal
router.post('/', authMiddleware, validateDeal, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify stage belongs to user
    const stage = await Stage.findOne({
      where: {
        id: req.body.stageId,
        userId: req.user.id
      }
    });

    if (!stage) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    // Verify contact belongs to user if provided
    if (req.body.contactId) {
      const contact = await Contact.findOne({
        where: {
          id: req.body.contactId,
          userId: req.user.id
        }
      });

      if (!contact) {
        return res.status(400).json({ error: 'Invalid contact' });
      }
    }

    const deal = await Deal.create({
      ...req.body,
      userId: req.user.id
    });

    // Fetch with associations
    const dealWithAssociations = await Deal.findByPk(deal.id, {
      include: [
        { model: Contact },
        { model: Stage }
      ]
    });

    res.status(201).json({ deal: dealWithAssociations });
  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// Update deal
router.put('/:id', authMiddleware, validateDeal, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const deal = await Deal.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Verify stage belongs to user if changing
    if (req.body.stageId && req.body.stageId !== deal.stageId) {
      const stage = await Stage.findOne({
        where: {
          id: req.body.stageId,
          userId: req.user.id
        }
      });

      if (!stage) {
        return res.status(400).json({ error: 'Invalid stage' });
      }
    }

    // Handle status changes
    if (req.body.status !== deal.status) {
      if (req.body.status === 'won' || req.body.status === 'lost') {
        req.body.closedAt = new Date();
      } else {
        req.body.closedAt = null;
      }
    }

    await deal.update(req.body);

    // Fetch with associations
    const updatedDeal = await Deal.findByPk(deal.id, {
      include: [
        { model: Contact },
        { model: Stage }
      ]
    });

    res.json({ deal: updatedDeal });
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// Update deal stage (for drag and drop)
router.patch('/:id/stage', authMiddleware, [
  body('stageId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const deal = await Deal.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Verify stage belongs to user
    const stage = await Stage.findOne({
      where: {
        id: req.body.stageId,
        userId: req.user.id
      }
    });

    if (!stage) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    await deal.update({ stageId: req.body.stageId });

    res.json({ message: 'Deal stage updated successfully' });
  } catch (error) {
    console.error('Update deal stage error:', error);
    res.status(500).json({ error: 'Failed to update deal stage' });
  }
});

// Delete deal
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    await deal.destroy();
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

module.exports = router;