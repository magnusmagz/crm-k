const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get all templates for organization
router.get('/', authMiddleware, async (req, res) => {
  try {
    const templates = await sequelize.query(
      `SELECT 
        id, 
        name, 
        subject, 
        category, 
        is_active,
        created_by,
        created_at,
        updated_at
      FROM email_templates
      WHERE organization_id = :orgId
      ORDER BY created_at DESC`,
      {
        replacements: { orgId: req.user.organizationId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [template] = await sequelize.query(
      `SELECT * FROM email_templates
      WHERE id = :id AND organization_id = :orgId`,
      {
        replacements: { 
          id: req.params.id,
          orgId: req.user.organizationId 
        },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create new template
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, subject, design_json, html_output, category } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    
    const templateId = uuidv4();
    
    await sequelize.query(
      `INSERT INTO email_templates
      (id, organization_id, name, subject, design_json, html_output, category, created_by, updated_by)
      VALUES (:id, :orgId, :name, :subject, :design_json, :html_output, :category, :userId, :userId)`,
      {
        replacements: {
          id: templateId,
          orgId: req.user.organizationId,
          name,
          subject: subject || '',
          design_json: JSON.stringify(design_json || {}),
          html_output: html_output || '',
          category: category || 'general',
          userId: req.user.id
        }
      }
    );
    
    const [newTemplate] = await sequelize.query(
      `SELECT * FROM email_templates WHERE id = :id`,
      {
        replacements: { id: templateId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, subject, design_json, html_output, category, is_active } = req.body;
    
    // Verify template belongs to organization
    const [existing] = await sequelize.query(
      `SELECT id FROM email_templates
      WHERE id = :id AND organization_id = :orgId`,
      {
        replacements: { 
          id: req.params.id,
          orgId: req.user.organizationId 
        },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Build update query dynamically
    const updates = [];
    const replacements = {
      id: req.params.id,
      userId: req.user.id
    };
    
    if (name !== undefined) {
      updates.push('name = :name');
      replacements.name = name;
    }
    if (subject !== undefined) {
      updates.push('subject = :subject');
      replacements.subject = subject;
    }
    if (design_json !== undefined) {
      updates.push('design_json = :design_json');
      replacements.design_json = JSON.stringify(design_json);
    }
    if (html_output !== undefined) {
      updates.push('html_output = :html_output');
      replacements.html_output = html_output;
    }
    if (category !== undefined) {
      updates.push('category = :category');
      replacements.category = category;
    }
    if (is_active !== undefined) {
      updates.push('is_active = :is_active');
      replacements.is_active = is_active;
    }
    
    if (updates.length > 0) {
      updates.push('updated_by = :userId');
      updates.push('updated_at = NOW()');
      
      await sequelize.query(
        `UPDATE email_templates 
        SET ${updates.join(', ')}
        WHERE id = :id`,
        { replacements }
      );
    }
    
    const [updatedTemplate] = await sequelize.query(
      `SELECT * FROM email_templates WHERE id = :id`,
      {
        replacements: { id: req.params.id },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check if template is used in any campaigns
    const [campaignCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM email_campaigns 
      WHERE template_id = :templateId`,
      {
        replacements: { templateId: req.params.id },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (parseInt(campaignCount.count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete template that is used in campaigns' 
      });
    }
    
    const result = await sequelize.query(
      `DELETE FROM email_templates
      WHERE id = :id AND organization_id = :orgId`,
      {
        replacements: { 
          id: req.params.id,
          orgId: req.user.organizationId 
        }
      }
    );
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Duplicate template
router.post('/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const [original] = await sequelize.query(
      `SELECT * FROM email_templates
      WHERE id = :id AND organization_id = :orgId`,
      {
        replacements: { 
          id: req.params.id,
          orgId: req.user.organizationId 
        },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!original) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const newId = uuidv4();
    const newName = `${original.name} (Copy)`;
    
    await sequelize.query(
      `INSERT INTO email_templates
      (id, organization_id, name, subject, design_json, html_output, category, created_by, updated_by)
      VALUES (:id, :orgId, :name, :subject, :design_json, :html_output, :category, :userId, :userId)`,
      {
        replacements: {
          id: newId,
          orgId: req.user.organizationId,
          name: newName,
          subject: original.subject,
          design_json: original.design_json,
          html_output: original.html_output,
          category: original.category,
          userId: req.user.id
        }
      }
    );
    
    const [newTemplate] = await sequelize.query(
      `SELECT * FROM email_templates WHERE id = :id`,
      {
        replacements: { id: newId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

module.exports = router;