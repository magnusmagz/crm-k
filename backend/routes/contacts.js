const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Contact, CustomField, Deal } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const automationEmitter = require('../services/eventEmitter');

const router = express.Router();

// Validation middleware
const validateContact = [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().matches(/^[\d\s\-\+\(\)]+$/),
  body('company').optional().trim(),
  body('position').optional().trim(),
  body('tags').optional().isArray(),
  body('notes').optional().trim(),
  body('customFields').optional().isObject()
];

// Get all contacts for the user with filtering
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      search,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      limit = 50,
      offset = 0
    } = req.query;

    const where = { userId: req.user.id };

    // Search functionality
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
        { position: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } },
        { tags: { [Op.contains]: [search] } }
      ];
    }

    // Tag filtering
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.tags = { [Op.overlap]: tagArray };
    }

    // First get contacts without deals for better performance
    const contacts = await Contact.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Then get deal counts and values in a single query
    const contactIds = contacts.rows.map(c => c.id);
    const dealStats = await Deal.findAll({
      where: { 
        contactId: contactIds,
        userId: req.user.id 
      },
      attributes: [
        'contactId',
        [Deal.sequelize.fn('COUNT', Deal.sequelize.col('id')), 'dealCount'],
        [Deal.sequelize.fn('SUM', Deal.sequelize.col('value')), 'totalValue'],
        [Deal.sequelize.fn('COUNT', Deal.sequelize.literal("CASE WHEN status = 'won' THEN 1 END")), 'wonDeals']
      ],
      group: ['contactId'],
      raw: true
    });
    
    // Create a map for quick lookup
    const dealStatsMap = dealStats.reduce((map, stat) => {
      map[stat.contactId] = {
        dealCount: parseInt(stat.dealCount) || 0,
        totalValue: parseFloat(stat.totalValue) || 0,
        wonDeals: parseInt(stat.wonDeals) || 0
      };
      return map;
    }, {});
    
    // Add deal stats to contacts
    const contactsWithStats = contacts.rows.map(contact => ({
      ...contact.toJSON(),
      dealStats: dealStatsMap[contact.id] || { dealCount: 0, totalValue: 0, wonDeals: 0 }
    }));

    res.json({
      contacts: contactsWithStats,
      total: contacts.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// Get single contact
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ contact });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Failed to get contact' });
  }
});

// Create new contact
router.post('/', authMiddleware, validateContact, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Validate custom fields against user's field definitions
    if (req.body.customFields) {
      const customFields = await CustomField.findAll({
        where: { userId: req.user.id }
      });

      for (const field of customFields) {
        const value = req.body.customFields[field.name];
        
        // Check required fields
        if (field.required && !value) {
          return res.status(400).json({ 
            error: `Custom field '${field.label}' is required` 
          });
        }

        // Validate field types
        if (value) {
          switch (field.type) {
            case 'number':
              if (isNaN(value)) {
                return res.status(400).json({ 
                  error: `Custom field '${field.label}' must be a number` 
                });
              }
              break;
            case 'date':
              if (isNaN(Date.parse(value))) {
                return res.status(400).json({ 
                  error: `Custom field '${field.label}' must be a valid date` 
                });
              }
              break;
            case 'url':
              try {
                new URL(value);
              } catch {
                return res.status(400).json({ 
                  error: `Custom field '${field.label}' must be a valid URL` 
                });
              }
              break;
            case 'select':
              if (!field.options.includes(value)) {
                return res.status(400).json({ 
                  error: `Custom field '${field.label}' must be one of: ${field.options.join(', ')}` 
                });
              }
              break;
            case 'checkbox':
              if (typeof value !== 'boolean') {
                return res.status(400).json({ 
                  error: `Custom field '${field.label}' must be true or false` 
                });
              }
              break;
          }
        }
      }
    }

    const contact = await Contact.create({
      ...req.body,
      userId: req.user.id
    });

    // Emit event for automations
    automationEmitter.emitContactCreated(req.user.id, contact.toJSON());

    res.status(201).json({
      message: 'Contact created successfully',
      contact
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update contact
router.put('/:id', authMiddleware, validateContact, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Validate custom fields (same as create)
    if (req.body.customFields) {
      const customFields = await CustomField.findAll({
        where: { userId: req.user.id }
      });

      for (const field of customFields) {
        const value = req.body.customFields[field.name];
        
        if (field.required && !value) {
          return res.status(400).json({ 
            error: `Custom field '${field.label}' is required` 
          });
        }

        if (value) {
          switch (field.type) {
            case 'number':
              if (isNaN(value)) {
                return res.status(400).json({ 
                  error: `Custom field '${field.label}' must be a number` 
                });
              }
              break;
            case 'date':
              if (isNaN(Date.parse(value))) {
                return res.status(400).json({ 
                  error: `Custom field '${field.label}' must be a valid date` 
                });
              }
              break;
            case 'url':
              try {
                new URL(value);
              } catch {
                return res.status(400).json({ 
                  error: `Custom field '${field.label}' must be a valid URL` 
                });
              }
              break;
            case 'select':
              if (!field.options.includes(value)) {
                return res.status(400).json({ 
                  error: `Custom field '${field.label}' must be one of: ${field.options.join(', ')}` 
                });
              }
              break;
            case 'checkbox':
              if (typeof value !== 'boolean') {
                return res.status(400).json({ 
                  error: `Custom field '${field.label}' must be true or false` 
                });
              }
              break;
          }
        }
      }
    }

    // Track changed fields
    const changedFields = Object.keys(req.body);
    
    await contact.update(req.body);

    // Emit event for automations
    automationEmitter.emitContactUpdated(req.user.id, contact.toJSON(), changedFields);

    res.json({
      message: 'Contact updated successfully',
      contact
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Contact.destroy({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Bulk operations
router.post('/bulk-delete', authMiddleware, 
  body('ids').isArray().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { ids } = req.body;

      const result = await Contact.destroy({
        where: {
          id: { [Op.in]: ids },
          userId: req.user.id
        }
      });

      res.json({ 
        message: `${result} contacts deleted successfully`,
        deletedCount: result 
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({ error: 'Failed to delete contacts' });
    }
  }
);

// Get all unique tags for the user
router.get('/tags/all', authMiddleware, async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      where: { userId: req.user.id },
      attributes: ['tags']
    });

    const allTags = new Set();
    contacts.forEach(contact => {
      contact.tags.forEach(tag => allTags.add(tag));
    });

    res.json({ tags: Array.from(allTags).sort() });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

module.exports = router;