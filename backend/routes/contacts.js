const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Contact, CustomField, Deal, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const automationEmitter = require('../services/eventEmitter');
const upload = require('../middleware/upload');
const { parseCSV, getCSVHeaders, validateContactRecord, mapCSVToContact, autoDetectMapping } = require('../utils/csvParser');

const router = express.Router();

// Validation middleware
const validateContact = [
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
  body('email').optional({ nullable: true, checkFalsy: false }).isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('phone').optional({ nullable: true, checkFalsy: true }).matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),
  body('company').optional({ nullable: true, checkFalsy: false }).trim(),
  body('position').optional({ nullable: true, checkFalsy: false }).trim(),
  body('tags').optional({ nullable: true, checkFalsy: false }).isArray().withMessage('Tags must be an array'),
  body('notes').optional({ nullable: true, checkFalsy: false }).trim(),
  body('customFields').optional({ nullable: true, checkFalsy: false }).isObject().withMessage('Custom fields must be an object')
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
        [Deal.sequelize.fn('COUNT', Deal.sequelize.literal("CASE WHEN status = 'won' THEN 1 END")), 'wonDeals'],
        [Deal.sequelize.fn('COUNT', Deal.sequelize.literal("CASE WHEN status = 'open' THEN 1 END")), 'openDeals'],
        [Deal.sequelize.fn('SUM', Deal.sequelize.literal("CASE WHEN status = 'open' THEN value ELSE 0 END")), 'openValue']
      ],
      group: ['contactId'],
      raw: true
    });
    
    // Create a map for quick lookup
    const dealStatsMap = dealStats.reduce((map, stat) => {
      map[stat.contactId] = {
        dealCount: parseInt(stat.dealCount) || 0,
        totalValue: parseFloat(stat.totalValue) || 0,
        wonDeals: parseInt(stat.wonDeals) || 0,
        openDeals: parseInt(stat.openDeals) || 0,
        openValue: parseFloat(stat.openValue) || 0
      };
      return map;
    }, {});
    
    // Add deal stats to contacts
    const contactsWithStats = contacts.rows.map(contact => ({
      ...contact.toJSON(),
      dealStats: dealStatsMap[contact.id] || { dealCount: 0, totalValue: 0, wonDeals: 0, openDeals: 0, openValue: 0 }
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
        if (field.required && !value && value !== 0 && value !== false) {
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
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    console.log('Update contact request body:', JSON.stringify(req.body, null, 2));
    console.log('Contact ID:', req.params.id);
    
    // Run validation manually to catch errors
    try {
      await Promise.all(validateContact.map(validation => validation.run(req)));
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Express validator errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({ error: 'Validation failed', details: validationError.message });
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
      console.log('Custom fields in request:', req.body.customFields);
      
      const customFields = await CustomField.findAll({
        where: { userId: req.user.id }
      });
      
      console.log('User custom field definitions:', customFields.map(f => ({ 
        name: f.name, 
        type: f.type, 
        required: f.required 
      })));

      for (const field of customFields) {
        const value = req.body.customFields[field.name];
        
        if (field.required && !value && value !== 0 && value !== false) {
          console.error(`Required field '${field.label}' is missing. Value:`, value);
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
    console.error('Error stack:', error.stack);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));
      console.error('Sequelize validation errors:', validationErrors);
      return res.status(400).json({ 
        error: 'Validation failed', 
        validationErrors 
      });
    }
    
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

// CSV Import - Parse headers and preview
router.post('/import/preview', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse CSV headers
    const headers = await getCSVHeaders(req.file.buffer);
    
    // Parse first 5 rows for preview
    const allRecords = await parseCSV(req.file.buffer);
    const preview = allRecords.slice(0, 5);
    
    // Auto-detect field mapping
    const suggestedMapping = autoDetectMapping(headers);
    
    // Get custom fields for this user
    const customFields = await CustomField.findAll({
      where: { 
        userId: req.user.id,
        entityType: 'contact'
      },
      attributes: ['name', 'label', 'type', 'required']
    });

    res.json({
      headers,
      preview,
      suggestedMapping,
      customFields: customFields.map(cf => ({
        name: cf.name,
        label: cf.label,
        type: cf.type,
        required: cf.required
      })),
      totalRows: allRecords.length
    });
  } catch (error) {
    console.error('CSV preview error:', error);
    res.status(500).json({ error: 'Failed to parse CSV file' });
  }
});

// CSV Import - Process and create contacts
router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { fieldMapping, duplicateStrategy = 'skip' } = req.body;
    
    if (!fieldMapping) {
      return res.status(400).json({ error: 'Field mapping is required' });
    }

    const mapping = JSON.parse(fieldMapping);

    // Parse CSV
    const records = await parseCSV(req.file.buffer);
    
    // Get custom field definitions
    const customFields = await CustomField.findAll({
      where: { 
        userId: req.user.id,
        entityType: 'contact'
      }
    });

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Process records in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const processPromises = batch.map(async (record, index) => {
        const rowIndex = i + index + 2; // +2 for header row and 1-based indexing
        
        try {
          // Map CSV fields to contact fields
          const contactData = mapCSVToContact(record, mapping, customFields);
          
          // Add user ID
          contactData.userId = req.user.id;
          
          // Validate required fields
          if (!contactData.firstName || !contactData.lastName) {
            results.errors.push({
              row: rowIndex,
              error: 'First name and last name are required'
            });
            results.skipped++;
            return;
          }

          // Check for duplicates based on email (case-insensitive)
          if (contactData.email) {
            const existingContact = await Contact.findOne({
              where: {
                [Op.and]: [
                  sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('email')),
                    contactData.email.toLowerCase()
                  ),
                  { userId: req.user.id }
                ]
              }
            });

            if (existingContact) {
              if (duplicateStrategy === 'skip') {
                results.skipped++;
                return;
              } else if (duplicateStrategy === 'update') {
                await existingContact.update(contactData);
                results.updated++;
                
                // Emit update event
                automationEmitter.emitContactUpdated(
                  req.user.id, 
                  existingContact.toJSON(), 
                  Object.keys(contactData)
                );
                return;
              }
              // If strategy is 'create', continue to create new contact
            }
          }

          // Validate custom fields
          if (contactData.customFields) {
            for (const field of customFields) {
              const value = contactData.customFields[field.name];
              
              if (field.required && !value) {
                results.errors.push({
                  row: rowIndex,
                  error: `Custom field '${field.label}' is required`
                });
                results.skipped++;
                return;
              }

              // Type validation
              if (value) {
                switch (field.type) {
                  case 'number':
                    if (isNaN(value)) {
                      results.errors.push({
                        row: rowIndex,
                        error: `Custom field '${field.label}' must be a number`
                      });
                      results.skipped++;
                      return;
                    }
                    contactData.customFields[field.name] = parseFloat(value);
                    break;
                  case 'checkbox':
                    contactData.customFields[field.name] = 
                      value === 'true' || value === '1' || value === 'yes';
                    break;
                  case 'date':
                    if (isNaN(Date.parse(value))) {
                      results.errors.push({
                        row: rowIndex,
                        error: `Custom field '${field.label}' must be a valid date`
                      });
                      results.skipped++;
                      return;
                    }
                    break;
                }
              }
            }
          }

          // Create contact
          const contact = await Contact.create(contactData);
          results.created++;
          
          // Emit creation event
          automationEmitter.emitContactCreated(req.user.id, contact.toJSON());
          
        } catch (error) {
          console.error(`Error processing row ${rowIndex}:`, error);
          results.errors.push({
            row: rowIndex,
            error: error.message || 'Unknown error'
          });
          results.skipped++;
        }
      });

      await Promise.all(processPromises);
    }

    res.json({
      message: 'Import completed',
      results,
      totalProcessed: records.length
    });

  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Failed to import contacts' });
  }
});

module.exports = router;