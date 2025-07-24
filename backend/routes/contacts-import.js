const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Contact, CustomField } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { parseCSV, getCSVHeaders, autoDetectMapping, mapCSVToContact } = require('../utils/csvParser');
const { Op } = require('sequelize');
const automationEmitter = require('../services/eventEmitter');

const router = express.Router();

// Store import jobs in memory (in production, use Redis or a database)
const importJobs = new Map();

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

// Start import job
router.post('/start', authMiddleware, upload.single('file'), async (req, res) => {
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
      startedAt: new Date()
    };
    
    importJobs.set(jobId, job);

    // Start processing in background
    processImportJob(job, records, mapping, duplicateStrategy).catch(error => {
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
async function processImportJob(job, records, mapping, duplicateStrategy) {
  // Get custom field definitions
  const customFields = await CustomField.findAll({
    where: { 
      userId: job.userId,
      entityType: 'contact'
    }
  });

  // Process in smaller batches to avoid timeouts
  const batchSize = 50; // Smaller batch size for better progress tracking
  
  for (let i = 0; i < records.length; i += batchSize) {
    // Check if job was cancelled
    if (job.status === 'cancelled') {
      break;
    }

    const batch = records.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (record, index) => {
      const rowIndex = i + index + 2;
      
      try {
        // Map CSV fields to contact fields
        const contactData = mapCSVToContact(record, mapping, customFields);
        
        // Add user ID
        contactData.userId = job.userId;
        
        // Validate required fields
        if (!contactData.firstName || !contactData.lastName) {
          job.errors.push({
            row: rowIndex,
            error: 'First name and last name are required'
          });
          job.skipped++;
          return;
        }

        // Check for duplicates based on email
        if (contactData.email) {
          const existingContact = await Contact.findOne({
            where: {
              email: contactData.email,
              userId: job.userId
            }
          });

          if (existingContact) {
            if (duplicateStrategy === 'skip') {
              job.skipped++;
              return;
            } else if (duplicateStrategy === 'update') {
              await existingContact.update(contactData);
              job.updated++;
              
              // Emit update event
              automationEmitter.emitContactUpdated(
                job.userId, 
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
                  contactData.customFields[field.name] = parseFloat(value);
                  break;
                case 'checkbox':
                  contactData.customFields[field.name] = 
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

        // Create contact
        const contact = await Contact.create(contactData);
        job.created++;
        
        // Emit creation event
        automationEmitter.emitContactCreated(job.userId, contact.toJSON());
        
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
  }, 3600000);
}

module.exports = router;