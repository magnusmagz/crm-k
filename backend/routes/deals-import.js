const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Deal, CustomField, Contact, Stage, Pipeline, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { parseCSV, getCSVHeaders, autoDetectDealMapping, mapCSVToDeal } = require('../utils/csvParser');
const { generateDealSkippedReport } = require('../utils/csvExporter');
const { Op } = require('sequelize');
const automationEmitter = require('../services/eventEmitter');

const router = express.Router();

// Store import jobs in memory (in production, use Redis or a database)
const importJobs = new Map();

// Store skipped records for each job
const skippedRecords = new Map();

// CSV Import - Parse headers and preview
router.post('/preview', authMiddleware, upload.single('file'), async (req, res) => {
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
    
    // Get custom fields for this user
    const customFields = await CustomField.findAll({
      where: { 
        userId: req.user.id,
        entityType: 'deal'
      },
      attributes: ['name', 'label', 'type', 'required']
    });

    // Get stages for this user
    const stages = await Stage.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'name', 'order'],
      order: [['order', 'ASC']]
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
      stages: stages || [],
      totalRows: allRecords.length
    });
  } catch (error) {
    console.error('CSV preview error:', error);
    res.status(500).json({ error: 'Failed to parse CSV file' });
  }
});

// Start import job
router.post('/start', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { 
      fieldMapping, 
      duplicateStrategy = 'skip', 
      contactStrategy = 'create',
      requireContact = false,
      stageMapping = {},
      defaultStageId
    } = req.body;
    
    if (!fieldMapping) {
      return res.status(400).json({ error: 'Field mapping is required' });
    }

    const mapping = JSON.parse(fieldMapping);
    const stageMappingObj = typeof stageMapping === 'string' ? JSON.parse(stageMapping) : stageMapping;

    // Parse CSV
    const records = await parseCSV(req.file.buffer);
    
    // Create import job
    const jobId = uuidv4();
    const job = {
      id: jobId,
      userId: req.user.id,
      status: 'processing',
      totalRecords: records.length,
      processedRecords: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      startedAt: new Date(),
      // Store import config for processing
      config: {
        mapping,
        duplicateStrategy,
        contactStrategy,
        requireContact,
        stageMapping: stageMappingObj,
        defaultStageId
      }
    };
    
    importJobs.set(jobId, job);

    // Start processing in background
    processImportJob(job, records).catch(error => {
      console.error('Import job error:', error);
      job.status = 'failed';
      job.error = error.message;
    });

    // Return job ID immediately
    res.json({ 
      jobId,
      totalRecords: records.length,
      message: 'Import started'
    });
  } catch (error) {
    console.error('Start import error:', error);
    res.status(500).json({ error: 'Failed to start import' });
  }
});

// Get import job status
router.get('/status/:jobId', authMiddleware, async (req, res) => {
  const job = importJobs.get(req.params.jobId);
  
  if (!job || job.userId !== req.user.id) {
    return res.status(404).json({ error: 'Import job not found' });
  }

  const response = {
    id: job.id,
    status: job.status,
    totalRecords: job.totalRecords,
    processedRecords: job.processedRecords,
    created: job.created,
    updated: job.updated,
    skipped: job.skipped,
    errors: job.errors.slice(0, 100), // Limit errors in response
    errorCount: job.errors.length,
    progress: job.totalRecords > 0 ? (job.processedRecords / job.totalRecords) * 100 : 0
  };

  if (job.completedAt) {
    response.completedAt = job.completedAt;
    response.duration = (job.completedAt - job.startedAt) / 1000; // seconds
  }

  res.json(response);
});

// Process import job
async function processImportJob(job, records) {
  const { mapping, duplicateStrategy, contactStrategy, requireContact, stageMapping, defaultStageId } = job.config;
  
  // Initialize skipped records array for this job
  const jobSkippedRecords = [];
  skippedRecords.set(job.id, jobSkippedRecords);

  // Get custom field definitions
  const customFields = await CustomField.findAll({
    where: { 
      userId: job.userId,
      entityType: 'deal'
    }
  });

  // Get stages for this user
  const stages = await Stage.findAll({
    where: { userId: job.userId },
    order: [['order', 'ASC']]
  });

  if (!stages || stages.length === 0) {
    throw new Error('No stages found for user');
  }
  
  // Create stage lookup
  const stageLookup = {};
  stages.forEach(stage => {
    stageLookup[stage.name.toLowerCase()] = stage;
  });

  // Cache for contact lookups
  const contactCache = {};

  // Process in smaller batches to avoid timeouts
  const batchSize = 30; // Smaller batch size for deals due to contact lookups
  
  for (let i = 0; i < records.length; i += batchSize) {
    // Check if job was cancelled
    if (job.status === 'cancelled') {
      break;
    }

    const batch = records.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (record, index) => {
      const rowIndex = i + index + 2;
      
      try {
        // Map CSV fields to deal fields
        const dealData = mapCSVToDeal(record, mapping, customFields);
        
        // Add user ID
        dealData.userId = job.userId;
        
        // Validate required fields
        if (!dealData.name) {
          const error = 'Deal name is required';
          job.errors.push({
            row: rowIndex,
            error: error
          });
          job.skipped++;
          jobSkippedRecords.push({
            row: rowIndex,
            data: dealData,
            reason: error
          });
          return;
        }

        // Handle stage mapping
        const stageValue = dealData.stage;
        delete dealData.stage; // Remove stage field as we need stageId
        
        if (stageValue) {
          // Check if CSV value maps to a stage
          const mappedStageId = stageMapping[stageValue];
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
          job.errors.push({
            row: rowIndex,
            error: 'Unable to determine stage for deal'
          });
          job.skipped++;
          return;
        }

        // Handle contact association
        const contactEmail = dealData.contactEmail;
        const contactName = dealData.contactName;
        const contactFirstName = dealData.contactFirstName;
        const contactLastName = dealData.contactLastName;
        const company = dealData.company;
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
            const whereClause = { userId: job.userId };
            
            if (contactEmail) {
              // Use case-insensitive email matching
              whereClause[Op.and] = [
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.col('email')),
                  contactEmail.toLowerCase()
                ),
                { userId: job.userId }
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
                userId: job.userId,
                firstName,
                lastName,
                email: contactEmail || null,
                company: company || null
              };
              
              contact = await Contact.create(contactData);
              automationEmitter.emitContactCreated(job.userId, contact.toJSON());
            }
            
            // Cache the result
            if (contact) {
              contactCache[cacheKey] = contact;
            }
          }

          if (contact) {
            dealData.contactId = contact.id;
          } else if (contactStrategy === 'skip') {
            job.errors.push({
              row: rowIndex,
              error: `Contact not found: ${contactEmail || contactName || 'No contact information provided'}`
            });
            job.skipped++;
            return;
          }
        } else {
          // No contact information provided at all
          job.errors.push({
            row: rowIndex,
            error: 'Contact is required for deals. Please provide Contact Email, Contact Name, or First Name + Last Name'
          });
          job.skipped++;
          return;
        }
        
        // Ensure we have a contact ID (since contacts are now required)
        if (!dealData.contactId) {
          job.errors.push({
            row: rowIndex,
            error: 'Unable to find or create contact for this deal'
          });
          job.skipped++;
          return;
        }

        // Check for duplicates
        if (duplicateStrategy !== 'create') {
          const existingDeal = await Deal.findOne({
            where: {
              name: dealData.name,
              userId: job.userId,
              ...(dealData.contactId && { contactId: dealData.contactId })
            }
          });

          if (existingDeal) {
            if (duplicateStrategy === 'skip') {
              job.skipped++;
              jobSkippedRecords.push({
                row: rowIndex,
                data: dealData,
                reason: `Deal "${dealData.name}" already exists for this contact`
              });
              return;
            } else if (duplicateStrategy === 'update') {
              await existingDeal.update(dealData);
              job.updated++;
              
              // Emit update event
              automationEmitter.emitDealUpdated(
                job.userId, 
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
              job.errors.push({
                row: rowIndex,
                error: `Custom field '${field.label}' is required`
              });
              job.skipped++;
              return;
            }

            // Type validation
            if (value) {
              switch (field.type) {
                case 'number':
                  if (isNaN(value)) {
                    job.errors.push({
                      row: rowIndex,
                      error: `Custom field '${field.label}' must be a number`
                    });
                    job.skipped++;
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
                    job.errors.push({
                      row: rowIndex,
                      error: `Custom field '${field.label}' must be a valid date`
                    });
                    job.skipped++;
                    return;
                  }
                  break;
              }
            }
          }
        }

        // Create deal
        const deal = await Deal.create(dealData);
        job.created++;
        
        // Emit creation event
        automationEmitter.emitDealCreated(job.userId, deal.toJSON());
        
      } catch (error) {
        console.error(`Error processing row ${rowIndex}:`, error);
        job.errors.push({
          row: rowIndex,
          error: error.message || 'Unknown error'
        });
        job.skipped++;
      } finally {
        job.processedRecords++;
      }
    }));
  }

  // Mark job as completed
  job.status = 'completed';
  job.completedAt = new Date();
  
  // Clean up job after 1 hour
  setTimeout(() => {
    importJobs.delete(job.id);
    skippedRecords.delete(job.id);
  }, 3600000);
}

// Download skipped records report
router.get('/skipped/:jobId', authMiddleware, async (req, res) => {
  try {
    const job = importJobs.get(req.params.jobId);
    
    if (!job || job.userId !== req.user.id) {
      return res.status(404).json({ error: 'Import job not found' });
    }
    
    const jobSkippedRecords = skippedRecords.get(req.params.jobId) || [];
    
    if (jobSkippedRecords.length === 0) {
      return res.status(404).json({ error: 'No skipped records found' });
    }
    
    const csv = generateDealSkippedReport(jobSkippedRecords);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="skipped-deals-${req.params.jobId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Download skipped records error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;