const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Deal, Contact, Stage, CustomField, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const automationEmitter = require('../services/eventEmitter');
const upload = require('../middleware/upload');
const { parseCSV, getCSVHeaders, validateDealRecord, mapCSVToDeal, autoDetectDealMapping } = require('../utils/csvParser');

const router = express.Router();

// Validation middleware
const validateDeal = [
  body('name').notEmpty().trim(),
  body('value').optional().isDecimal({ decimal_digits: '0,2' }),
  body('stageId').isUUID(),
  body('contactId').optional().isUUID().withMessage('Invalid contact ID'),
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

    // Search functionality - including contact search
    const includeOptions = [
      {
        model: Contact,
        attributes: ['id', 'firstName', 'lastName', 'email', 'company', 'notes'],
        where: {} // Will be populated if searching contacts
      },
      {
        model: Stage,
        attributes: ['id', 'name', 'color', 'order']
      }
    ];

    if (search) {
      // Search in both deals and contacts
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } },
        { '$Contact.firstName$': { [Op.iLike]: `%${search}%` } },
        { '$Contact.lastName$': { [Op.iLike]: `%${search}%` } },
        { '$Contact.email$': { [Op.iLike]: `%${search}%` } },
        { '$Contact.company$': { [Op.iLike]: `%${search}%` } },
        { '$Contact.notes$': { [Op.iLike]: `%${search}%` } }
      ];
      // Remove the empty where clause from Contact to allow the search to work
      includeOptions[0].required = false;
      delete includeOptions[0].where;
    }

    const deals = await Deal.findAndCountAll({
      where,
      include: includeOptions,
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
        [Deal.sequelize.fn('COALESCE', Deal.sequelize.fn('SUM', Deal.sequelize.col('value')), 0), 'totalValue']
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
      const count = parseInt(stat.dataValues.count) || 0;
      const value = parseFloat(stat.dataValues.totalValue) || 0;
      analyticsData.total += count;
      analyticsData.totalValue += isNaN(value) ? 0 : value;
      analyticsData[stat.status] = count;
      analyticsData[`${stat.status}Value`] = isNaN(value) ? 0 : value;
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

    // Verify contact belongs to user (if provided)
    if (req.body.contactId) {
      const contact = await Contact.findOne({
        where: {
          id: req.body.contactId,
          userId: req.user.id
        }
      });

      if (!contact) {
        return res.status(400).json({ error: 'Invalid contact or contact not found' });
      }
    }

    // Validate custom fields if provided
    if (req.body.customFields) {
      const customFields = await CustomField.findAll({
        where: { 
          userId: req.user.id,
          entityType: 'deal'
        }
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

    // Emit event for automations
    automationEmitter.emitDealCreated(req.user.id, dealWithAssociations.toJSON());

    res.status(201).json({ deal: dealWithAssociations });
  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({ error: 'Failed to create deal' });
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

      const result = await Deal.destroy({
        where: {
          id: { [Op.in]: ids },
          userId: req.user.id
        }
      });

      res.json({ 
        message: `${result} deals deleted successfully`,
        deletedCount: result 
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({ error: 'Failed to delete deals' });
    }
  }
);

// Bulk edit deals
router.post('/bulk-edit', authMiddleware,
  body('ids').isArray().notEmpty().withMessage('Deal IDs array is required'),
  body('updates').isObject().notEmpty().withMessage('Updates object is required'),
  async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { ids, updates } = req.body;

      // Validate that all deals belong to the user
      const deals = await Deal.findAll({
        where: {
          id: { [Op.in]: ids },
          userId: req.user.id
        },
        transaction
      });

      if (deals.length !== ids.length) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Some deals not found or do not belong to user' });
      }

      // Validate stage if being updated
      if (updates.stageId) {
        const stage = await Stage.findOne({
          where: {
            id: updates.stageId,
            userId: req.user.id
          }
        });

        if (!stage) {
          await transaction.rollback();
          return res.status(400).json({ error: 'Invalid stage' });
        }
      }

      // Validate custom fields if they're being updated
      if (updates.customFields) {
        const customFields = await CustomField.findAll({
          where: { 
            userId: req.user.id,
            entityType: 'deal'
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
      const allowedFields = ['name', 'value', 'status', 'stageId', 'expectedCloseDate', 'notes', 'tags', 'customFields'];
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          if (field === 'tags') {
            // Handle tag operations
            if (updates.tagOperation === 'add') {
              // Add tags to existing tags - handled separately for each deal
            } else if (updates.tagOperation === 'remove') {
              // Remove tags from existing tags - handled separately for each deal
            } else {
              // Replace tags
              updateData[field] = updates[field];
            }
          } else if (field === 'customFields') {
            // Merge custom fields with existing ones
            for (const deal of deals) {
              const existingCustomFields = deal.customFields || {};
              const mergedCustomFields = { ...existingCustomFields };
              
              Object.entries(updates.customFields).forEach(([key, value]) => {
                if (value === '' || value === null) {
                  delete mergedCustomFields[key]; // Remove empty fields
                } else {
                  mergedCustomFields[key] = value;
                }
              });

              await deal.update({ customFields: mergedCustomFields }, { transaction });
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
          // Handle tag addition separately for each deal
          for (const deal of deals) {
            const existingTags = deal.tags || [];
            const newTags = updates.tags || [];
            const mergedTags = [...new Set([...existingTags, ...newTags])];
            
            await deal.update({ tags: mergedTags }, { transaction });
            updatedCount++;
          }
        } else if (updateData.tags && updates.tagOperation === 'remove') {
          // Handle tag removal separately for each deal
          for (const deal of deals) {
            const existingTags = deal.tags || [];
            const tagsToRemove = updates.tags || [];
            const filteredTags = existingTags.filter(tag => !tagsToRemove.includes(tag));
            
            await deal.update({ tags: filteredTags }, { transaction });
            updatedCount++;
          }
        } else {
          // Standard bulk update
          const result = await Deal.update(updateData, {
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
        updatedCount = deals.length;
      }

      await transaction.commit();

      // Emit automation events for updated deals
      for (const deal of deals) {
        const updatedDeal = await Deal.findByPk(deal.id);
        automationEmitter.emitDealUpdated(
          req.user.id, 
          updatedDeal.toJSON(), 
          Object.keys(updateData)
        );
      }

      res.json({
        message: `${updatedCount} deals updated successfully`,
        updatedCount,
        totalSelected: ids.length
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Bulk edit error:', error);
      res.status(500).json({ error: 'Failed to update deals' });
    }
  }
);

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

    // Validate custom fields if provided
    if (req.body.customFields) {
      const customFields = await CustomField.findAll({
        where: { 
          userId: req.user.id,
          entityType: 'deal'
        }
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

    // Track if stage is changing
    const previousStageId = deal.stageId;
    const changedFields = Object.keys(req.body);

    await deal.update(req.body);

    // Fetch with associations
    const updatedDeal = await Deal.findByPk(deal.id, {
      include: [
        { model: Contact },
        { model: Stage }
      ]
    });

    // Emit events for automations
    if (req.body.stageId && req.body.stageId !== previousStageId) {
      const previousStage = await Stage.findByPk(previousStageId);
      automationEmitter.emitDealStageChanged(
        req.user.id, 
        updatedDeal.toJSON(), 
        previousStage?.toJSON(), 
        updatedDeal.Stage.toJSON()
      );
    } else {
      automationEmitter.emitDealUpdated(req.user.id, updatedDeal.toJSON(), changedFields);
    }

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

    const previousStageId = deal.stageId;
    
    // Check if the new stage is a closing stage and update status accordingly
    const updateData = { stageId: req.body.stageId };
    
    if (stage.name === 'Closed Won') {
      updateData.status = 'won';
      updateData.closedAt = new Date();
    } else if (stage.name === 'Closed Lost') {
      updateData.status = 'lost';
      updateData.closedAt = new Date();
    } else if (deal.status !== 'open') {
      // Moving from closed back to open
      updateData.status = 'open';
      updateData.closedAt = null;
    }
    
    await deal.update(updateData);

    // Fetch updated deal with associations
    const updatedDeal = await Deal.findByPk(deal.id, {
      include: [
        { model: Contact },
        { model: Stage }
      ]
    });

    // Emit stage change event
    const previousStage = await Stage.findByPk(previousStageId);
    automationEmitter.emitDealStageChanged(
      req.user.id,
      updatedDeal.toJSON(),
      previousStage?.toJSON(),
      updatedDeal.Stage.toJSON()
    );

    // Return the updated deal so frontend can update status
    res.json({ 
      message: 'Deal stage updated successfully',
      deal: updatedDeal
    });
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
    const suggestedMapping = autoDetectDealMapping(headers);
    
    // Get stages for this user
    const stages = await Stage.findAll({
      where: { 
        userId: req.user.id,
        isActive: true
      },
      attributes: ['id', 'name', 'order'],
      order: [['order', 'ASC']]
    });

    // Get custom fields for deals
    const customFields = await CustomField.findAll({
      where: { 
        userId: req.user.id,
        entityType: 'deal'
      },
      attributes: ['name', 'label', 'type', 'required']
    });

    res.json({
      headers,
      preview,
      suggestedMapping,
      stages: stages.map(s => ({
        id: s.id,
        name: s.name,
        order: s.order
      })),
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

// CSV Import - Process and create deals
router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { 
      fieldMapping, 
      stageMapping,
      contactStrategy = 'match',
      duplicateStrategy = 'skip',
      defaultStageId,
      requireContact = false
    } = req.body;
    
    if (!fieldMapping) {
      return res.status(400).json({ error: 'Field mapping is required' });
    }

    const mapping = JSON.parse(fieldMapping);
    
    // Debug logging
    console.log('Import parameters:', {
      contactStrategy,
      duplicateStrategy,
      requireContact,
      defaultStageId,
      fieldMapping: mapping
    });
    const stageMappingObj = stageMapping ? JSON.parse(stageMapping) : {};

    // Parse CSV
    const records = await parseCSV(req.file.buffer);
    
    // Get custom field definitions
    const customFields = await CustomField.findAll({
      where: { 
        userId: req.user.id,
        entityType: 'deal'
      }
    });

    // Get all stages for mapping
    const stages = await Stage.findAll({
      where: { userId: req.user.id }
    });

    // Build stage lookup map
    const stageLookup = {};
    stages.forEach(stage => {
      stageLookup[stage.id] = stage;
      stageLookup[stage.name.toLowerCase()] = stage;
    });

    // Cache for contact lookups
    const contactCache = {};

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Process records in batches
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const processPromises = batch.map(async (record, index) => {
        const rowIndex = i + index + 2; // +2 for header row and 1-based indexing
        
        try {
          // Map CSV fields to deal fields
          const dealData = mapCSVToDeal(record, mapping, customFields);
          
          // Add user ID
          dealData.userId = req.user.id;
          
          // Validate required fields
          if (!dealData.name) {
            results.errors.push({
              row: rowIndex,
              error: 'Deal name is required'
            });
            results.skipped++;
            return;
          }

          // Handle stage mapping
          const stageValue = dealData.stage;
          delete dealData.stage; // Remove stage field as we need stageId
          
          if (stageValue) {
            // Check if CSV value maps to a stage
            const mappedStageId = stageMappingObj[stageValue];
            if (mappedStageId) {
              dealData.stageId = mappedStageId;
            } else {
              // Try to find stage by name
              const stage = stageLookup[stageValue.toLowerCase()];
              if (stage) {
                dealData.stageId = stage.id;
              }
            }
          }
          
          // Use default stage if no stage found
          if (!dealData.stageId) {
            dealData.stageId = defaultStageId || stages[0]?.id;
          }

          if (!dealData.stageId) {
            results.errors.push({
              row: rowIndex,
              error: 'Unable to determine stage for deal'
            });
            results.skipped++;
            return;
          }

          // Handle contact association
          const contactEmail = dealData.contactEmail;
          const contactName = dealData.contactName;
          const contactFirstName = dealData.contactFirstName;
          const contactLastName = dealData.contactLastName;
          const company = dealData.company;
          
          // Debug - log what we got from mapCSVToDeal
          console.log(`Row ${rowIndex}: DealData before contact extraction:`, {
            contactEmail: dealData.contactEmail,
            contactName: dealData.contactName,
            contactFirstName: dealData.contactFirstName,
            contactLastName: dealData.contactLastName
          });
          
          delete dealData.contactEmail;
          delete dealData.contactName;
          delete dealData.contactFirstName;
          delete dealData.contactLastName;
          delete dealData.company;
          
          if (contactEmail || contactName || (contactFirstName && contactLastName)) {
            // Look for existing contact
            let contact = null;
            const cacheKey = contactEmail || contactName || `${contactFirstName} ${contactLastName}`;
            
            // Check cache first
            if (contactCache[cacheKey]) {
              contact = contactCache[cacheKey];
            } else {
              // Search for contact
              const whereClause = { userId: req.user.id };
              
              if (contactEmail) {
                // Use case-insensitive email matching
                whereClause[Op.and] = [
                  sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('email')),
                    contactEmail.toLowerCase()
                  ),
                  { userId: req.user.id }
                ];
              } else if (contactFirstName && contactLastName) {
                // Use provided first and last names
                whereClause[Op.and] = [
                  { firstName: { [Op.iLike]: contactFirstName } },
                  { lastName: { [Op.iLike]: contactLastName } }
                ];
              } else if (contactName) {
                // Try to split full name
                const nameParts = contactName.trim().split(/\s+/);
                if (nameParts.length >= 2) {
                  whereClause[Op.and] = [
                    { firstName: { [Op.iLike]: nameParts[0] } },
                    { lastName: { [Op.iLike]: nameParts[nameParts.length - 1] } }
                  ];
                } else {
                  whereClause[Op.or] = [
                    { firstName: { [Op.iLike]: contactName } },
                    { lastName: { [Op.iLike]: contactName } }
                  ];
                }
              }

              contact = await Contact.findOne({ where: whereClause });
              
              if (!contact && contactStrategy === 'create') {
                // Create new contact
                let firstName, lastName;
                
                // Prefer separate first/last name fields
                if (contactFirstName && contactLastName) {
                  firstName = contactFirstName;
                  lastName = contactLastName;
                } else if (contactName) {
                  // Fall back to splitting full name
                  const nameParts = contactName.trim().split(/\s+/);
                  firstName = nameParts[0] || 'Unknown';
                  lastName = nameParts.slice(1).join(' ') || 'Contact';
                } else {
                  firstName = 'Unknown';
                  lastName = 'Contact';
                }
                
                const contactData = {
                  userId: req.user.id,
                  firstName,
                  lastName,
                  email: contactEmail || null,
                  company: company || null
                };
                
                contact = await Contact.create(contactData);
                automationEmitter.emitContactCreated(req.user.id, contact.toJSON());
              }
              
              // Cache the result
              if (contact) {
                contactCache[cacheKey] = contact;
              }
            }

            if (contact) {
              dealData.contactId = contact.id;
            } else if (contactStrategy === 'skip') {
              results.errors.push({
                row: rowIndex,
                error: `Contact not found: ${contactEmail || contactName || 'No contact information provided'}`
              });
              results.skipped++;
              return;
            }
          } else {
            // No contact information provided at all
            results.errors.push({
              row: rowIndex,
              error: 'Contact is required for deals. Please provide Contact Email, Contact Name, or First Name + Last Name'
            });
            results.skipped++;
            return;
          }
          
          // Ensure we have a contact ID (since contacts are now required)
          if (!dealData.contactId) {
            results.errors.push({
              row: rowIndex,
              error: 'Unable to find or create contact for this deal'
            });
            results.skipped++;
            return;
          }

          // Check for duplicates
          if (duplicateStrategy !== 'create') {
            const existingDeal = await Deal.findOne({
              where: {
                name: dealData.name,
                userId: req.user.id,
                ...(dealData.contactId && { contactId: dealData.contactId })
              }
            });

            if (existingDeal) {
              if (duplicateStrategy === 'skip') {
                results.skipped++;
                return;
              } else if (duplicateStrategy === 'update') {
                await existingDeal.update(dealData);
                results.updated++;
                
                // Emit update event
                automationEmitter.emitDealUpdated(
                  req.user.id, 
                  existingDeal.toJSON(), 
                  Object.keys(dealData)
                );
                return;
              }
            }
          }

          // Validate custom fields
          if (dealData.customFields) {
            for (const field of customFields) {
              const value = dealData.customFields[field.name];
              
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
                    dealData.customFields[field.name] = parseFloat(value);
                    break;
                  case 'checkbox':
                    dealData.customFields[field.name] = 
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

          // Create deal
          const deal = await Deal.create(dealData);
          results.created++;
          
          // Emit creation event
          automationEmitter.emitDealCreated(req.user.id, deal.toJSON());
          
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
    res.status(500).json({ error: 'Failed to import deals' });
  }
});

module.exports = router;