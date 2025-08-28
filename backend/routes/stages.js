const express = require('express');
const { body, validationResult } = require('express-validator');
const { Stage, Deal } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get all stages for the user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { pipelineType = 'sales' } = req.query;
    
    // For recruiting stages, don't include deals
    if (pipelineType === 'recruiting') {
      const stages = await Stage.findAll({
        where: { 
          userId: req.user.id,
          pipelineType: 'recruiting'
        },
        order: [['order', 'ASC']]
      });
      
      res.json({ stages });
    } else {
      // For sales stages, include deals
      const stages = await Stage.findAll({
        where: { 
          userId: req.user.id,
          pipelineType: 'sales'
        },
        order: [['order', 'ASC']],
        include: [{
          model: Deal,
          as: 'deals',
          attributes: ['id', 'value', 'status'],
          required: false
        }]
      });

      // Calculate totals for each stage
      const stagesWithTotals = stages.map(stage => {
        const stageData = stage.toJSON();
        const allDeals = stageData.deals || [];
        return {
          ...stageData,
          dealCount: allDeals.length,
          totalValue: allDeals.reduce((sum, deal) => sum + (parseFloat(deal.value) || 0), 0),
          deals: undefined // Remove the deals array from response to reduce payload
        };
      });

      res.json({ stages: stagesWithTotals });
    }
  } catch (error) {
    console.error('Get stages error:', error);
    res.status(500).json({ error: 'Failed to get stages' });
  }
});

// Create new stage
router.post('/', authMiddleware, [
  body('name').notEmpty().trim(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('order').optional().isInt({ min: 0 }),
  body('pipelineType').optional().isIn(['sales', 'recruiting'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pipelineType = req.body.pipelineType || 'sales';

    // Get the highest order value for this pipeline type
    const maxOrderStage = await Stage.findOne({
      where: { 
        userId: req.user.id,
        pipelineType
      },
      order: [['order', 'DESC']]
    });

    const stage = await Stage.create({
      ...req.body,
      userId: req.user.id,
      pipelineType,
      order: req.body.order !== undefined ? req.body.order : (maxOrderStage ? maxOrderStage.order + 1 : 0)
    });

    res.status(201).json({ stage });
  } catch (error) {
    console.error('Create stage error:', error);
    res.status(500).json({ error: 'Failed to create stage' });
  }
});

// Reorder stages - MUST be defined before /:id route
router.put('/reorder', authMiddleware, [
  body('stages').isArray(),
  body('stages.*.id').isUUID(),
  body('stages.*.order').isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stages } = req.body;

    // Update all stages in a transaction
    const transaction = await Stage.sequelize.transaction();
    try {
      for (const stageUpdate of stages) {
        await Stage.update(
          { order: stageUpdate.order },
          {
            where: {
              id: stageUpdate.id,
              userId: req.user.id
            },
            transaction
          }
        );
      }
      await transaction.commit();
      res.json({ message: 'Stages reordered successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Reorder stages error:', error);
    res.status(500).json({ error: 'Failed to reorder stages' });
  }
});

// Update stage
router.put('/:id', authMiddleware, [
  body('name').optional().notEmpty().trim(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const stage = await Stage.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!stage) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    // Prevent renaming system stages
    if ((stage.name === 'Closed Won' || stage.name === 'Closed Lost') && req.body.name && req.body.name !== stage.name) {
      return res.status(400).json({ error: 'System stages cannot be renamed' });
    }

    await stage.update(req.body);
    res.json({ stage });
  } catch (error) {
    console.error('Update stage error:', error);
    res.status(500).json({ error: 'Failed to update stage' });
  }
});

// Delete stage
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const stage = await Stage.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [{
        model: Deal,
        as: 'deals',
        required: false
      }]
    });

    if (!stage) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    // Protect system-critical stages
    if (stage.name === 'Closed Won' || stage.name === 'Closed Lost') {
      return res.status(400).json({ 
        error: 'Cannot delete system stage. These stages are required for deal closure functionality.' 
      });
    }

    if (stage.deals && stage.deals.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete stage with active deals. Please move or close all deals first.' 
      });
    }

    await stage.destroy();
    res.json({ message: 'Stage deleted successfully' });
  } catch (error) {
    console.error('Delete stage error:', error);
    res.status(500).json({ error: 'Failed to delete stage' });
  }
});

// Initialize default stages for new users
router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    const { pipelineType = 'sales' } = req.body;
    
    // Check if user already has stages for this pipeline type
    const existingStages = await Stage.count({
      where: { 
        userId: req.user.id,
        pipelineType
      }
    });

    if (existingStages > 0) {
      return res.status(400).json({ error: `Stages already initialized for ${pipelineType} pipeline` });
    }

    const defaultStages = pipelineType === 'recruiting' 
      ? Stage.getDefaultRecruitingStages()
      : Stage.getDefaultStages();
      
    const stages = await Promise.all(
      defaultStages.map(stage => 
        Stage.create({
          ...stage,
          userId: req.user.id,
          pipelineType
        })
      )
    );

    res.status(201).json({ stages });
  } catch (error) {
    console.error('Initialize stages error:', error);
    res.status(500).json({ error: 'Failed to initialize stages' });
  }
});

module.exports = router;