const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { Position, RecruitingPipeline, Contact, Stage } = require('../models');
const { Op } = require('sequelize');

// Get all positions for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, search, limit = 100, offset = 0 } = req.query;
    const where = { userId: req.user.id };

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { department: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const positions = await Position.findAll({
      where,
      include: [
        {
          model: RecruitingPipeline,
          as: 'candidates',
          include: [
            {
              model: Contact,
              as: 'Candidate',
              attributes: ['id', 'firstName', 'lastName', 'email']
            },
            {
              model: Stage,
              attributes: ['id', 'name', 'color']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Calculate analytics
    const analytics = {
      total: positions.length,
      open: positions.filter(p => p.status === 'open').length,
      closed: positions.filter(p => p.status === 'closed').length,
      onHold: positions.filter(p => p.status === 'on-hold').length,
      totalCandidates: positions.reduce((sum, p) => sum + (p.candidates?.length || 0), 0)
    };

    res.json({ positions, analytics });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// Get single position
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const position = await Position.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: RecruitingPipeline,
          as: 'candidates',
          include: [
            {
              model: Contact,
              as: 'Candidate',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'skills', 'experienceYears']
            },
            {
              model: Stage,
              attributes: ['id', 'name', 'color', 'order']
            }
          ],
          order: [['appliedAt', 'DESC']]
        }
      ]
    });

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json({ position });
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ error: 'Failed to fetch position' });
  }
});

// Create new position
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      department,
      location,
      type,
      remote,
      salaryRange,
      requirements,
      description,
      status,
      customFields
    } = req.body;

    const position = await Position.create({
      userId: req.user.id,
      title,
      department,
      location,
      type: type || 'full-time',
      remote: remote || 'onsite',
      salaryRange,
      requirements,
      description,
      status: status || 'open',
      customFields: customFields || {}
    });

    res.status(201).json({ position });
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({ error: 'Failed to create position' });
  }
});

// Update position
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const position = await Position.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    await position.update(req.body);

    res.json({ position });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// Delete position
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const position = await Position.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    // Note: We allow deletion even with candidates
    // The recruiting pipeline records will remain for historical tracking
    // but the position won't be available for new candidates
    
    await position.destroy();

    res.json({ message: 'Position deleted successfully' });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({ error: 'Failed to delete position' });
  }
});

// Bulk update positions
router.put('/bulk/update', authMiddleware, async (req, res) => {
  try {
    const { positionIds, updates } = req.body;

    if (!positionIds || !Array.isArray(positionIds)) {
      return res.status(400).json({ error: 'Position IDs array is required' });
    }

    await Position.update(updates, {
      where: {
        id: positionIds,
        userId: req.user.id
      }
    });

    const updatedPositions = await Position.findAll({
      where: {
        id: positionIds,
        userId: req.user.id
      }
    });

    res.json({ positions: updatedPositions });
  } catch (error) {
    console.error('Error bulk updating positions:', error);
    res.status(500).json({ error: 'Failed to bulk update positions' });
  }
});

module.exports = router;