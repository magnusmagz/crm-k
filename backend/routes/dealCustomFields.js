const express = require('express');
const { body, validationResult } = require('express-validator');
const { CustomField, Deal } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get all custom fields for deals
router.get('/', authMiddleware, async (req, res) => {
  try {
    const customFields = await CustomField.findAll({
      where: { 
        userId: req.user.id,
        entityType: 'deal'
      },
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });

    res.json({ customFields });
  } catch (error) {
    console.error('Get deal custom fields error:', error);
    res.status(500).json({ error: 'Failed to get custom fields' });
  }
});

// Create new custom field for deals
router.post('/', authMiddleware, [
  body('name').matches(/^[a-zA-Z0-9_]+$/).withMessage('Name must contain only letters, numbers, and underscores'),
  body('label').notEmpty().trim(),
  body('type').isIn(['text', 'textarea', 'number', 'date', 'select', 'checkbox', 'url']),
  body('required').optional().isBoolean(),
  body('options').optional().isArray(),
  body('validation').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if field name already exists for this user and entity type
    const existing = await CustomField.findOne({
      where: {
        userId: req.user.id,
        entityType: 'deal',
        name: req.body.name
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'A field with this name already exists' });
    }

    // Get the highest order value
    const maxOrderField = await CustomField.findOne({
      where: { 
        userId: req.user.id,
        entityType: 'deal'
      },
      order: [['order', 'DESC']]
    });

    const newOrder = maxOrderField ? maxOrderField.order + 1 : 0;

    const customField = await CustomField.create({
      ...req.body,
      userId: req.user.id,
      entityType: 'deal',
      order: newOrder
    });

    res.status(201).json({
      message: 'Custom field created successfully',
      customField
    });
  } catch (error) {
    console.error('Create deal custom field error:', error);
    res.status(500).json({ error: 'Failed to create custom field' });
  }
});

// Update custom field
router.put('/:id', authMiddleware, [
  body('label').optional().notEmpty().trim(),
  body('required').optional().isBoolean(),
  body('options').optional().isArray(),
  body('validation').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customField = await CustomField.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        entityType: 'deal'
      }
    });

    if (!customField) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    // Don't allow changing name or type as it could break existing data
    const { name, type, entityType, ...updateData } = req.body;

    await customField.update(updateData);

    res.json({
      message: 'Custom field updated successfully',
      customField
    });
  } catch (error) {
    console.error('Update deal custom field error:', error);
    res.status(500).json({ error: 'Failed to update custom field' });
  }
});

// Delete custom field
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const customField = await CustomField.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        entityType: 'deal'
      }
    });

    if (!customField) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    // Remove this field from all deals
    const deals = await Deal.findAll({
      where: { userId: req.user.id }
    });

    for (const deal of deals) {
      if (deal.customFields && deal.customFields[customField.name] !== undefined) {
        const updatedFields = { ...deal.customFields };
        delete updatedFields[customField.name];
        await deal.update({ customFields: updatedFields });
      }
    }

    await customField.destroy();

    res.json({ message: 'Custom field deleted successfully' });
  } catch (error) {
    console.error('Delete deal custom field error:', error);
    res.status(500).json({ error: 'Failed to delete custom field' });
  }
});

// Reorder custom fields
router.post('/reorder', authMiddleware, [
  body('fieldIds').isArray().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fieldIds } = req.body;

    // Verify all fields belong to the user and are deal fields
    const customFields = await CustomField.findAll({
      where: {
        id: { [Op.in]: fieldIds },
        userId: req.user.id,
        entityType: 'deal'
      }
    });

    if (customFields.length !== fieldIds.length) {
      return res.status(400).json({ error: 'Invalid field IDs provided' });
    }

    // Update order based on array position
    for (let i = 0; i < fieldIds.length; i++) {
      await CustomField.update(
        { order: i },
        {
          where: {
            id: fieldIds[i],
            userId: req.user.id,
            entityType: 'deal'
          }
        }
      );
    }

    res.json({ message: 'Fields reordered successfully' });
  } catch (error) {
    console.error('Reorder deal custom fields error:', error);
    res.status(500).json({ error: 'Failed to reorder fields' });
  }
});

module.exports = router;