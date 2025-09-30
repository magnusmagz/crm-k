const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Contact, CustomField, Deal, Note, EmailSuppression, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const automationEmitter = require('../services/eventEmitter');
const upload = require('../middleware/upload');
const { parseCSV, getCSVHeaders, validateContactRecord, mapCSVToContact, autoDetectMapping } = require('../utils/csvParser');
const { touchContactMiddleware } = require('../middleware/contactTouch');

const router = express.Router();


// Validation middleware for creating contacts (firstName/lastName required)
const validateContact = [
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('phone').optional({ nullable: true, checkFalsy: true }).matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),
  body('company').optional({ nullable: true, checkFalsy: false }).trim(),
  body('position').optional({ nullable: true, checkFalsy: false }).trim(),
  body('tags').optional({ nullable: true, checkFalsy: false }).isArray().withMessage('Tags must be an array'),
  body('notes').optional({ nullable: true, checkFalsy: false }).trim(),
  body('lastContacted').optional({ nullable: true, checkFalsy: true }).custom((value) => {
    if (!value) return true;
    // Accept both ISO8601 datetime and YYYY-MM-DD date format
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return true;
  }),
  body('customFields').optional({ nullable: true, checkFalsy: false }).isObject().withMessage('Custom fields must be an object')
];

// Validation middleware for updating contacts (all fields optional for partial updates)
const validateContactUpdate = [
  body('firstName').optional({ nullable: true, checkFalsy: true }).trim(),
  body('lastName').optional({ nullable: true, checkFalsy: true }).trim(),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('phone').optional({ nullable: true, checkFalsy: true }).matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),
  body('company').optional({ nullable: true, checkFalsy: false }).trim(),
  body('position').optional({ nullable: true, checkFalsy: false }).trim(),
  body('tags').optional({ nullable: true, checkFalsy: false }).isArray().withMessage('Tags must be an array'),
  body('notes').optional({ nullable: true, checkFalsy: false }).trim(),
  body('lastContacted').optional({ nullable: true, checkFalsy: true }).custom((value) => {
    if (!value) return true;
    // Accept both ISO8601 datetime and YYYY-MM-DD date format
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return true;
  }),
  body('customFields').optional({ nullable: true, checkFalsy: false }).isObject().withMessage('Custom fields must be an object')
];

// ================================
// STATIC ROUTES (must come first)
// ================================

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

    // Validate and normalize sort parameters
    const allowedSortFields = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'company', 'lastContacted'];
    const normalizedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const normalizedSortOrder = (sortOrder || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // First get contacts without deals for better performance
    const contacts = await Contact.findAndCountAll({
      where,
      order: [[normalizedSortBy, normalizedSortOrder]],
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
        [Deal.sequelize.fn('COALESCE', Deal.sequelize.fn('SUM', Deal.sequelize.col('value')), 0), 'totalValue'],
        [Deal.sequelize.fn('COUNT', Deal.sequelize.literal("CASE WHEN status = 'won' THEN 1 END")), 'wonDeals'],
        [Deal.sequelize.fn('COUNT', Deal.sequelize.literal("CASE WHEN status = 'open' THEN 1 END")), 'openDeals'],
        [Deal.sequelize.fn('COALESCE', Deal.sequelize.fn('SUM', Deal.sequelize.literal("CASE WHEN status = 'open' THEN value ELSE 0 END")), 0), 'openValue']
      ],
      group: ['contactId'],
      raw: true
    });
    
    // Create a map for quick lookup
    const dealStatsMap = dealStats.reduce((map, stat) => {
      const totalValue = parseFloat(stat.totalValue) || 0;
      const openValue = parseFloat(stat.openValue) || 0;
      map[stat.contactId] = {
        dealCount: parseInt(stat.dealCount) || 0,
        totalValue: isNaN(totalValue) ? 0 : totalValue,
        wonDeals: parseInt(stat.wonDeals) || 0,
        openDeals: parseInt(stat.openDeals) || 0,
        openValue: isNaN(openValue) ? 0 : openValue
      };
      return map;
    }, {});
    
    // Get suppression status for contacts with email addresses
    const contactEmails = contacts.rows
      .filter(contact => contact.email)
      .map(contact => contact.email.toLowerCase());
    
    const suppressions = await EmailSuppression.findAll({
      where: {
        email: { [Op.in]: contactEmails }
      },
      attributes: ['email', 'reason']
    });
    
    const suppressionMap = suppressions.reduce((map, suppression) => {
      map[suppression.email] = suppression.reason;
      return map;
    }, {});
    
    // Add deal stats and suppression status to contacts
    const contactsWithStats = contacts.rows.map(contact => ({
      ...contact.toJSON(),
      dealStats: dealStatsMap[contact.id] || { dealCount: 0, totalValue: 0, wonDeals: 0, openDeals: 0, openValue: 0 },
      isUnsubscribed: contact.email ? !!suppressionMap[contact.email.toLowerCase()] : false,
      unsubscribeReason: contact.email ? suppressionMap[contact.email.toLowerCase()] || null : null
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

// Bulk edit contacts
router.post('/bulk-edit', authMiddleware,
  body('ids').isArray().notEmpty().withMessage('Contact IDs array is required'),
  body('updates').isObject().notEmpty().withMessage('Updates object is required'),
  async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { ids, updates } = req.body;

      // Validate that all contacts belong to the user
      const contacts = await Contact.findAll({
        where: {
          id: { [Op.in]: ids },
          userId: req.user.id
        },
        transaction
      });

      if (contacts.length !== ids.length) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Some contacts not found or do not belong to user' });
      }

      // Validate custom fields if they're being updated
      if (updates.customFields) {
        const customFields = await CustomField.findAll({
          where: { 
            userId: req.user.id,
            entityType: 'contact'
          }
        });

        for (const field of customFields) {
          const value = updates.customFields[field.name];
          
          if (value !== undefined && value !== null) {
            switch (field.type) {
              case 'number':
                if (value !== '' && isNaN(value)) {
                  return res.status(400).json({ 
                    error: `Custom field '${field.label}' must be a number` 
                  });
                }
                break;
              case 'date':
                if (value !== '' && isNaN(Date.parse(value))) {
                  return res.status(400).json({ 
                    error: `Custom field '${field.label}' must be a valid date` 
                  });
                }
                break;
              case 'url':
                if (value !== '') {
                  try {
                    new URL(value);
                  } catch {
                    return res.status(400).json({ 
                      error: `Custom field '${field.label}' must be a valid URL` 
                    });
                  }
                }
                break;
              case 'select':
                if (value !== '' && !field.options.includes(value)) {
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

      // Prepare update data - only include non-empty values unless explicitly clearing
      const updateData = {};
      const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'company', 'position', 'notes', 'tags', 'customFields'];
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          if (field === 'tags') {
            // Handle tag operations
            if (updates.tagOperation === 'add') {
              // Add tags to existing tags
              updateData[field] = sequelize.fn('array_cat', sequelize.col('tags'), updates[field]);
            } else if (updates.tagOperation === 'remove') {
              // Remove tags from existing tags
              updateData[field] = sequelize.fn('array_remove', sequelize.col('tags'), updates[field][0]);
            } else {
              // Replace tags
              updateData[field] = updates[field];
            }
          } else if (field === 'customFields') {
            // Merge custom fields with existing ones
            for (const contact of contacts) {
              const existingCustomFields = contact.customFields || {};
              const mergedCustomFields = { ...existingCustomFields };
              
              Object.entries(updates.customFields).forEach(([key, value]) => {
                if (value === '' || value === null) {
                  delete mergedCustomFields[key]; // Remove empty fields
                } else {
                  mergedCustomFields[key] = value;
                }
              });

              await contact.update({ customFields: mergedCustomFields }, { transaction });
            }
            continue; // Skip the bulk update for custom fields
          } else {
            // Only update if value is provided and not empty (unless explicitly clearing)
            if (updates[field] !== '' || updates.clearField === field) {
              updateData[field] = updates[field];
            }
          }
        }
      }

      // Perform bulk update (excluding custom fields which are handled above)
      let updatedCount = 0;
      if (Object.keys(updateData).length > 0) {
        if (updateData.tags && updates.tagOperation === 'add') {
          // Handle tag addition separately for each contact
          for (const contact of contacts) {
            const existingTags = contact.tags || [];
            const newTags = updates.tags || [];
            const mergedTags = [...new Set([...existingTags, ...newTags])];
            
            await contact.update({ tags: mergedTags }, { transaction });
            updatedCount++;
          }
        } else if (updateData.tags && updates.tagOperation === 'remove') {
          // Handle tag removal separately for each contact
          for (const contact of contacts) {
            const existingTags = contact.tags || [];
            const tagsToRemove = updates.tags || [];
            const filteredTags = existingTags.filter(tag => !tagsToRemove.includes(tag));
            
            await contact.update({ tags: filteredTags }, { transaction });
            updatedCount++;
          }
        } else {
          // Standard bulk update
          const result = await Contact.update(updateData, {
            where: {
              id: { [Op.in]: ids },
              userId: req.user.id
            },
            transaction
          });
          updatedCount = result[0];
        }
      } else if (updates.customFields) {
        // If only custom fields were updated
        updatedCount = contacts.length;
      }

      await transaction.commit();

      // Emit automation events for updated contacts
      for (const contact of contacts) {
        const updatedContact = await Contact.findByPk(contact.id);
        automationEmitter.emitContactUpdated(
          req.user.id, 
          updatedContact.toJSON(), 
          Object.keys(updateData)
        );
      }

      res.json({
        message: `${updatedCount} contacts updated successfully`,
        updatedCount,
        totalSelected: ids.length
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Bulk edit error:', error);
      res.status(500).json({ error: 'Failed to update contacts' });
    }
  }
);

// Bulk add contacts to Round Robin pool
router.post('/bulk-add-to-pool', authMiddleware,
  body('ids').isArray().notEmpty().withMessage('Contact IDs array is required'),
  body('autoAssign').optional().isBoolean(),
  async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { ids, autoAssign = false } = req.body;

      // Validate that all contacts belong to the user's organization
      // Note: Using userId for now since contacts are user-scoped
      const contacts = await Contact.findAll({
        where: {
          id: { [Op.in]: ids },
          userId: req.user.id
        },
        transaction
      });

      if (contacts.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'No contacts found' });
      }

      if (contacts.length !== ids.length) {
        await transaction.rollback();
        return res.status(403).json({ 
          error: `${ids.length - contacts.length} contact(s) not found or not accessible` 
        });
      }

      // Remove assignment from all selected contacts (add to pool)
      const result = await Contact.update(
        { 
          assignedTo: null,
          assignedAt: null
        },
        {
          where: {
            id: { [Op.in]: ids },
            userId: req.user.id
          },
          transaction
        }
      );

      await transaction.commit();

      // Log the action for audit purposes
      console.log(`User ${req.user.email} added ${result[0]} contacts to Round Robin pool`);

      // If auto-assign requested, trigger Round Robin assignment
      let assignedCount = 0;
      if (autoAssign && result[0] > 0) {
        try {
          const assignmentEngine = require('../services/assignmentEngine');
          const unassignedContacts = await Contact.findAll({
            where: {
              id: { [Op.in]: ids },
              assignedTo: null,
              userId: req.user.id
            }
          });

          // Get the user's organizationId for Round Robin processing
          const user = await req.user;
          const organizationId = user.organizationId || user.id; // Fallback to userId if no org

          for (const contact of unassignedContacts) {
            const assignment = await assignmentEngine.processIncomingLead(
              contact,
              organizationId
            );
            if (assignment) {
              assignedCount++;
            }
          }
        } catch (assignError) {
          console.error('Error during auto-assignment:', assignError);
          // Don't fail the whole operation if auto-assignment fails
        }
      }

      let message = `Successfully added ${result[0]} contact${result[0] !== 1 ? 's' : ''} to the assignment pool`;
      if (assignedCount > 0) {
        message += ` and assigned ${assignedCount} via Round Robin`;
      }

      res.json({
        message,
        count: result[0],
        assignedCount
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Bulk add to pool error:', error);
      res.status(500).json({ error: 'Failed to add contacts to pool' });
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

// Search for duplicate contacts
router.get('/duplicates', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search || search.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = search.trim().toLowerCase();
    
    // Search by email (exact match) or name (fuzzy match)
    const contacts = await Contact.findAll({
      where: {
        userId: req.user.id,
        [Op.or]: [
          // Email exact match (case-insensitive)
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('email')),
            searchTerm
          ),
          // Email contains
          { email: { [Op.iLike]: `%${searchTerm}%` } },
          // Name fuzzy match
          sequelize.where(
            sequelize.fn('LOWER', 
              sequelize.fn('CONCAT', 
                sequelize.col('first_name'), 
                ' ', 
                sequelize.col('last_name')
              )
            ),
            { [Op.iLike]: `%${searchTerm}%` }
          ),
          // First name only
          { firstName: { [Op.iLike]: `%${searchTerm}%` } },
          // Last name only
          { lastName: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Get deal counts for each contact
    const contactIds = contacts.map(c => c.id);
    const dealCounts = await Deal.findAll({
      where: { 
        contactId: contactIds,
        userId: req.user.id 
      },
      attributes: [
        'contactId',
        [Deal.sequelize.fn('COUNT', Deal.sequelize.col('id')), 'dealCount']
      ],
      group: ['contactId'],
      raw: true
    });
    
    const dealCountMap = dealCounts.reduce((map, stat) => {
      map[stat.contactId] = parseInt(stat.dealCount) || 0;
      return map;
    }, {});

    // Add deal count to contacts
    const contactsWithStats = contacts.map(contact => ({
      ...contact.toJSON(),
      dealCount: dealCountMap[contact.id] || 0
    }));

    res.json({ 
      contacts: contactsWithStats,
      query: search
    });
  } catch (error) {
    console.error('Search duplicates error:', error);
    res.status(500).json({ error: 'Failed to search for duplicates' });
  }
});

// Export contacts to CSV
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const {
      fields = 'firstName,lastName,email,phone,company,position',
      search,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      format = 'csv'
    } = req.query;

    // Parse fields
    const requestedFields = fields.split(',').map(f => f.trim());
    
    // Build query with same filters as the GET / endpoint
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
      const tagArray = tags.split(',').map(tag => tag.trim());
      where.tags = { [Op.contains]: tagArray };
    }

    // Fetch contacts with a limit of 10,000
    const contacts = await Contact.findAll({
      where,
      order: [[sortBy, sortOrder]],
      limit: 10000,
      raw: true
    });

    // Get custom fields for the user
    const customFields = await CustomField.findAll({
      where: { 
        userId: req.user.id,
        entityType: 'contact'
      },
      order: [['order', 'ASC']]
    });

    // Build CSV field definitions
    const csvFields = [];
    const fieldMap = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      position: 'Position',
      tags: 'Tags',
      notes: 'Notes',
      createdAt: 'Created Date',
      updatedAt: 'Updated Date'
    };

    // Add standard fields
    requestedFields.forEach(field => {
      if (fieldMap[field]) {
        csvFields.push({
          label: fieldMap[field],
          value: (row) => {
            if (field === 'tags') {
              return Array.isArray(row.tags) ? row.tags.join(', ') : '';
            }
            if (field === 'createdAt' || field === 'updatedAt') {
              return row[field] ? new Date(row[field]).toISOString() : '';
            }
            return row[field] || '';
          }
        });
      }
    });

    // Add custom fields
    customFields.forEach(customField => {
      const fieldKey = `customFields.${customField.name}`;
      if (requestedFields.includes(fieldKey)) {
        csvFields.push({
          label: customField.label,
          value: (row) => {
            const value = row.customFields?.[customField.name];
            if (value === null || value === undefined) return '';
            if (customField.type === 'checkbox') return value ? 'Yes' : 'No';
            if (customField.type === 'date' && value) {
              return new Date(value).toISOString().split('T')[0];
            }
            return String(value);
          }
        });
      }
    });

    // Generate CSV using the csvExporter utility
    const { generateCSV } = require('../utils/csvExporter');
    
    // Transform data for CSV generation
    const csvData = contacts.map(contact => {
      const row = {};
      csvFields.forEach(field => {
        row[field.label] = field.value(contact);
      });
      return row;
    });

    const csv = generateCSV(csvData);

    // Set response headers
    const filename = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Total-Count', contacts.length.toString());

    res.send(csv);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export contacts' });
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

// Merge contacts with field selection
router.post('/merge-with-fields', authMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { primaryId, mergeIds, mergedData } = req.body;
    
    if (!primaryId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0 || !mergedData) {
      return res.status(400).json({ 
        error: 'Primary contact ID, merge IDs array, and merged data are required' 
      });
    }

    // Ensure primary is not in merge list
    if (mergeIds.includes(primaryId)) {
      return res.status(400).json({ 
        error: 'Primary contact cannot be in the merge list' 
      });
    }

    // Get all contacts (primary + merge targets)
    const allIds = [primaryId, ...mergeIds];
    const contacts = await Contact.findAll({
      where: {
        id: { [Op.in]: allIds },
        userId: req.user.id
      },
      transaction
    });

    // Verify all contacts exist and belong to user
    if (contacts.length !== allIds.length) {
      await transaction.rollback();
      return res.status(404).json({ error: 'One or more contacts not found' });
    }

    // Find primary contact
    const primaryContact = contacts.find(c => c.id === primaryId);

    // Update primary contact with merged data
    const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'company', 'position', 'notes', 'tags', 'customFields'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (mergedData[field] !== undefined) {
        updateData[field] = mergedData[field];
      }
    });

    await primaryContact.update(updateData, { transaction });

    // Reassign all deals from merge contacts to primary
    await Deal.update(
      { contactId: primaryId },
      {
        where: {
          contactId: { [Op.in]: mergeIds },
          userId: req.user.id
        },
        transaction
      }
    );

    // Reassign all notes from merge contacts to primary
    await Note.update(
      { contactId: primaryId },
      {
        where: {
          contactId: { [Op.in]: mergeIds },
          userId: req.user.id
        },
        transaction
      }
    );

    // Delete merged contacts
    await Contact.destroy({
      where: {
        id: { [Op.in]: mergeIds },
        userId: req.user.id
      },
      transaction
    });

    await transaction.commit();

    // Get updated primary contact with deal count
    const updatedPrimary = await Contact.findOne({
      where: { id: primaryId, userId: req.user.id }
    });

    const dealCount = await Deal.count({
      where: { contactId: primaryId, userId: req.user.id }
    });

    res.json({
      message: `Successfully merged ${mergeIds.length} contacts into primary contact`,
      contact: {
        ...updatedPrimary.toJSON(),
        dealCount
      },
      mergedCount: mergeIds.length
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Merge contacts with fields error:', error);
    res.status(500).json({ error: 'Failed to merge contacts' });
  }
});

// Merge contacts (original endpoint for backward compatibility)
router.post('/merge', authMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { primaryId, mergeIds } = req.body;
    
    if (!primaryId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0) {
      return res.status(400).json({ 
        error: 'Primary contact ID and array of merge IDs are required' 
      });
    }

    // Ensure primary is not in merge list
    if (mergeIds.includes(primaryId)) {
      return res.status(400).json({ 
        error: 'Primary contact cannot be in the merge list' 
      });
    }

    // Get all contacts (primary + merge targets)
    const allIds = [primaryId, ...mergeIds];
    const contacts = await Contact.findAll({
      where: {
        id: { [Op.in]: allIds },
        userId: req.user.id
      },
      transaction
    });

    // Verify all contacts exist and belong to user
    if (contacts.length !== allIds.length) {
      await transaction.rollback();
      return res.status(404).json({ error: 'One or more contacts not found' });
    }

    // Find primary contact
    const primaryContact = contacts.find(c => c.id === primaryId);
    const mergeContacts = contacts.filter(c => c.id !== primaryId);

    // Merge data into primary (only fill empty fields)
    const updates = {};
    const fieldsToMerge = ['email', 'phone', 'company', 'position', 'notes'];
    
    for (const field of fieldsToMerge) {
      if (!primaryContact[field] || primaryContact[field] === '') {
        // Find first non-empty value from merge contacts
        for (const mergeContact of mergeContacts) {
          if (mergeContact[field] && mergeContact[field] !== '') {
            updates[field] = mergeContact[field];
            break;
          }
        }
      }
    }

    // Merge notes (concatenate if both have notes)
    if (primaryContact.notes) {
      const additionalNotes = mergeContacts
        .filter(c => c.notes && c.notes !== '')
        .map(c => c.notes);
      
      if (additionalNotes.length > 0) {
        updates.notes = [primaryContact.notes, ...additionalNotes].join('\n\n---\n\n');
      }
    }

    // Merge tags (combine unique tags)
    const allTags = new Set(primaryContact.tags || []);
    mergeContacts.forEach(contact => {
      (contact.tags || []).forEach(tag => allTags.add(tag));
    });
    if (allTags.size > 0) {
      updates.tags = Array.from(allTags);
    }

    // Merge custom fields (only fill empty fields)
    const customFieldUpdates = { ...(primaryContact.customFields || {}) };
    mergeContacts.forEach(contact => {
      if (contact.customFields) {
        Object.entries(contact.customFields).forEach(([key, value]) => {
          if (!customFieldUpdates[key] && value) {
            customFieldUpdates[key] = value;
          }
        });
      }
    });
    if (Object.keys(customFieldUpdates).length > 0) {
      updates.customFields = customFieldUpdates;
    }

    // Update primary contact if there are changes
    if (Object.keys(updates).length > 0) {
      await primaryContact.update(updates, { transaction });
    }

    // Reassign all deals from merge contacts to primary
    await Deal.update(
      { contactId: primaryId },
      {
        where: {
          contactId: { [Op.in]: mergeIds },
          userId: req.user.id
        },
        transaction
      }
    );

    // Reassign all notes from merge contacts to primary
    await Note.update(
      { contactId: primaryId },
      {
        where: {
          contactId: { [Op.in]: mergeIds },
          userId: req.user.id
        },
        transaction
      }
    );

    // Delete merged contacts
    await Contact.destroy({
      where: {
        id: { [Op.in]: mergeIds },
        userId: req.user.id
      },
      transaction
    });

    await transaction.commit();

    // Get updated primary contact with deal count
    const updatedPrimary = await Contact.findOne({
      where: { id: primaryId, userId: req.user.id }
    });

    const dealCount = await Deal.count({
      where: { contactId: primaryId, userId: req.user.id }
    });

    res.json({
      message: `Successfully merged ${mergeIds.length} contacts into primary contact`,
      contact: {
        ...updatedPrimary.toJSON(),
        dealCount
      },
      mergedCount: mergeIds.length
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Merge contacts error:', error);
    res.status(500).json({ error: 'Failed to merge contacts' });
  }
});

// ================================
// DYNAMIC ROUTES (must come last)
// ================================

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

// Update contact
router.put('/:id', authMiddleware, validateContactUpdate, async (req, res) => {
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
        
        if (field.required && !value && value !== 0 && value !== false) {
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
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));
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


module.exports = router;