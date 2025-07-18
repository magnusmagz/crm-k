const express = require('express');
const { body, validationResult } = require('express-validator');
const { CustomField, Contact } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Validation middleware
const validateCustomField = [
  body('name').notEmpty().matches(/^[a-zA-Z0-9_]+$/).withMessage('Name must contain only letters, numbers, and underscores'),
  body('label').notEmpty().trim(),
  body('type').isIn(['text', 'textarea', 'number', 'date', 'select', 'checkbox', 'url']),
  body('required').optional().isBoolean(),
  body('options').optional().isArray(),
  body('validation').optional().isObject(),
  body('order').optional().isInt({ min: 0 })
];

// Get all custom fields for the user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const customFields = await CustomField.findAll({
      where: { userId: req.user.id },
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });

    res.json({ customFields });
  } catch (error) {
    console.error('Get custom fields error:', error);
    res.status(500).json({ error: 'Failed to get custom fields' });
  }
});

// Get single custom field
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const customField = await CustomField.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!customField) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    res.json({ customField });
  } catch (error) {
    console.error('Get custom field error:', error);
    res.status(500).json({ error: 'Failed to get custom field' });
  }
});

// Create new custom field
router.post('/', authMiddleware, validateCustomField, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, options } = req.body;

    // Check if field name already exists for this user
    const existingField = await CustomField.findOne({
      where: {
        userId: req.user.id,
        name
      }
    });

    if (existingField) {
      return res.status(400).json({ error: 'Field name already exists' });
    }

    // Validate select fields have options
    if (type === 'select' && (!options || options.length === 0)) {
      return res.status(400).json({ error: 'Select fields must have at least one option' });
    }

    // Clean options for non-select fields
    const fieldData = { ...req.body };
    if (type !== 'select') {
      fieldData.options = null;
    }

    // Get the highest order value for new field
    const maxOrder = await CustomField.max('order', {
      where: { userId: req.user.id }
    });

    const customField = await CustomField.create({
      ...fieldData,
      userId: req.user.id,
      order: fieldData.order !== undefined ? fieldData.order : (maxOrder || 0) + 1
    });

    res.status(201).json({
      message: 'Custom field created successfully',
      customField
    });
  } catch (error) {
    console.error('Create custom field error:', error);
    res.status(500).json({ error: 'Failed to create custom field' });
  }
});

// Update custom field
router.put('/:id', authMiddleware, validateCustomField, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customField = await CustomField.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!customField) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    const { name, type, options } = req.body;

    // Check if new name conflicts with another field
    if (name && name !== customField.name) {
      const conflictingField = await CustomField.findOne({
        where: {
          userId: req.user.id,
          name,
          id: { [Op.ne]: customField.id }
        }
      });

      if (conflictingField) {
        return res.status(400).json({ error: 'Field name already exists' });
      }
    }

    // Validate select fields have options
    if (type === 'select' && (!options || options.length === 0)) {
      return res.status(400).json({ error: 'Select fields must have at least one option' });
    }

    // Clean options for non-select fields
    const updateData = { ...req.body };
    if (type !== 'select') {
      updateData.options = null;
    }

    await customField.update(updateData);

    res.json({
      message: 'Custom field updated successfully',
      customField
    });
  } catch (error) {
    console.error('Update custom field error:', error);
    res.status(500).json({ error: 'Failed to update custom field' });
  }
});

// Delete custom field
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const customField = await CustomField.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!customField) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    // Remove this field from all contacts
    const contacts = await Contact.findAll({
      where: { userId: req.user.id }
    });

    for (const contact of contacts) {
      const customFields = { ...contact.customFields };
      delete customFields[customField.name];
      await contact.update({ customFields });
    }

    await customField.destroy();

    res.json({ message: 'Custom field deleted successfully' });
  } catch (error) {
    console.error('Delete custom field error:', error);
    res.status(500).json({ error: 'Failed to delete custom field' });
  }
});

// Reorder custom fields
router.put('/reorder', authMiddleware, 
  body('fields').isArray().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fields } = req.body;

      // Validate all field IDs belong to the user
      const userFieldIds = await CustomField.findAll({
        where: { userId: req.user.id },
        attributes: ['id']
      }).then(fields => fields.map(f => f.id));

      const providedIds = fields.map(f => f.id);
      const invalidIds = providedIds.filter(id => !userFieldIds.includes(id));

      if (invalidIds.length > 0) {
        return res.status(400).json({ error: 'Invalid field IDs provided' });
      }

      // Update order for each field
      const updatePromises = fields.map((field, index) => 
        CustomField.update(
          { order: index },
          { where: { id: field.id, userId: req.user.id } }
        )
      );

      await Promise.all(updatePromises);

      const updatedFields = await CustomField.findAll({
        where: { userId: req.user.id },
        order: [['order', 'ASC'], ['createdAt', 'ASC']]
      });

      res.json({ 
        message: 'Custom fields reordered successfully',
        customFields: updatedFields 
      });
    } catch (error) {
      console.error('Reorder custom fields error:', error);
      res.status(500).json({ error: 'Failed to reorder custom fields' });
    }
  }
);

module.exports = router;