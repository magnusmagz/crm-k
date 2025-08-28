const express = require('express');
const { body, validationResult } = require('express-validator');
const { Organization, User, Contact } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateOrganization = [
  body('name').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Organization name is required and must be less than 255 characters'),
  body('crmName').optional().trim().isLength({ max: 255 }).withMessage('CRM name must be less than 255 characters'),
  body('primaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color format'),
  body('contactEmail').optional().isEmail().withMessage('Invalid email format'),
  body('contactPhone').optional().matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),
  body('website').optional().isURL().withMessage('Invalid URL format'),
  body('address').optional().trim().isLength({ max: 255 }).withMessage('Address must be less than 255 characters'),
  body('city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  body('state').optional().isLength({ min: 2, max: 2 }).withMessage('State must be 2 characters'),
  body('zipCode').optional().matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid zip code format')
];

const validateOrganizationUpdate = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Organization name must be between 1 and 255 characters'),
  body('crmName').optional().trim().isLength({ max: 255 }).withMessage('CRM name must be less than 255 characters'),
  body('primaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color format'),
  body('contactEmail').optional().isEmail().withMessage('Invalid email format'),
  body('contactPhone').optional().matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),
  body('website').optional().isURL().withMessage('Invalid URL format'),
  body('address').optional().trim().isLength({ max: 255 }).withMessage('Address must be less than 255 characters'),
  body('city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  body('state').optional().isLength({ min: 2, max: 2 }).withMessage('State must be 2 characters'),
  body('zipCode').optional().matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid zip code format'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('settings').optional().isObject().withMessage('Settings must be an object')
];

// Middleware to check if user is admin (for organization management)
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all organizations (admin only - for future super admin use)
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, active } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    
    // Filter by search term
    if (search) {
      where.name = { [require('sequelize').Op.iLike]: `%${search}%` };
    }
    
    // Filter by active status
    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const organizations = await Organization.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id'],
          required: false
        },
        {
          model: Contact,
          as: 'contacts',
          attributes: ['id'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    // Calculate user and contact counts
    const organizationsWithCounts = organizations.rows.map(org => {
      const orgData = org.toJSON();
      orgData.userCount = orgData.users ? orgData.users.length : 0;
      orgData.contactCount = orgData.contacts ? orgData.contacts.length : 0;
      delete orgData.users;
      delete orgData.contacts;
      return orgData;
    });

    res.json({
      organizations: organizationsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: organizations.count,
        pages: Math.ceil(organizations.count / limit)
      }
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to retrieve organizations' });
  }
});

// Get current user's organization
router.get('/current', authMiddleware, async (req, res) => {
  try {
    if (!req.user.organizationId) {
      return res.status(404).json({ error: 'User is not associated with any organization' });
    }

    const organization = await Organization.findByPk(req.user.organizationId, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'email', 'isAdmin', 'isLoanOfficer'],
          required: false
        }
      ]
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const orgData = organization.toJSON();
    orgData.userCount = orgData.users ? orgData.users.length : 0;
    
    res.json({ organization: orgData });
  } catch (error) {
    console.error('Get current organization error:', error);
    res.status(500).json({ error: 'Failed to retrieve organization' });
  }
});

// Get organization by ID
router.get('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'email', 'isAdmin', 'isLoanOfficer', 'licensedStates'],
          required: false
        },
        {
          model: Contact,
          as: 'contacts',
          attributes: ['id', 'name', 'email', 'createdAt'],
          limit: 10, // Only show recent contacts
          order: [['createdAt', 'DESC']],
          required: false
        }
      ]
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const orgData = organization.toJSON();
    orgData.userCount = orgData.users ? orgData.users.length : 0;
    orgData.contactCount = orgData.contacts ? orgData.contacts.length : 0;

    res.json({ organization: orgData });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to retrieve organization' });
  }
});

// Create new organization (admin only - for future super admin use)
router.post('/', authMiddleware, requireAdmin, validateOrganization, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const organizationData = {
      name: req.body.name,
      crmName: req.body.crmName || req.body.name,
      primaryColor: req.body.primaryColor || '#6366f1',
      contactEmail: req.body.contactEmail,
      contactPhone: req.body.contactPhone,
      website: req.body.website,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      zipCode: req.body.zipCode,
      createdBy: req.user.id,
      settings: req.body.settings || {}
    };

    const organization = await Organization.create(organizationData);

    res.status(201).json({ 
      message: 'Organization created successfully',
      organization 
    });
  } catch (error) {
    console.error('Create organization error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Organization with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create organization' });
    }
  }
});

// Update organization
router.put('/:id', authMiddleware, validateOrganizationUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user has permission to update this organization
    const organizationId = req.params.id;
    if (!req.user.isAdmin && req.user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Not authorized to update this organization' });
    }

    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Build update data
    const updateData = {};
    const allowedFields = [
      'name', 'crmName', 'primaryColor', 'contactEmail', 'contactPhone', 
      'website', 'address', 'city', 'state', 'zipCode', 'settings'
    ];

    // Only super admins can change isActive status
    if (req.user.isAdmin && req.body.hasOwnProperty('isActive')) {
      allowedFields.push('isActive');
    }

    for (const field of allowedFields) {
      if (req.body.hasOwnProperty(field)) {
        updateData[field] = req.body[field];
      }
    }

    await organization.update(updateData);

    res.json({ 
      message: 'Organization updated successfully',
      organization 
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Update organization settings (organization members only)
router.patch('/:id/settings', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.params.id;
    
    // Check if user belongs to this organization and is admin
    if (req.user.organizationId !== organizationId || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to update organization settings' });
    }

    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Merge new settings with existing settings
    const currentSettings = organization.settings || {};
    const newSettings = { ...currentSettings, ...req.body.settings };

    await organization.update({ settings: newSettings });

    res.json({ 
      message: 'Organization settings updated successfully',
      settings: newSettings
    });
  } catch (error) {
    console.error('Update organization settings error:', error);
    res.status(500).json({ error: 'Failed to update organization settings' });
  }
});

// Delete/Deactivate organization (admin only - for future super admin use)
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Instead of hard delete, deactivate the organization
    await organization.update({ isActive: false });

    res.json({ message: 'Organization deactivated successfully' });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ error: 'Failed to deactivate organization' });
  }
});

// Get organization statistics
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.params.id;
    
    // Check permissions
    if (!req.user.isAdmin && req.user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Not authorized to view organization statistics' });
    }

    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get user count by role
    const userStats = await User.findAll({
      where: { organizationId },
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total'],
        [require('sequelize').fn('SUM', require('sequelize').literal('CASE WHEN "isAdmin" = true THEN 1 ELSE 0 END')), 'admins'],
        [require('sequelize').fn('SUM', require('sequelize').literal('CASE WHEN "isLoanOfficer" = true THEN 1 ELSE 0 END')), 'loanOfficers']
      ],
      raw: true
    });

    // Get contact count
    const contactStats = await Contact.findAll({
      where: { organizationId },
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "assignedTo" IS NOT NULL THEN 1 END')), 'assigned']
      ],
      raw: true
    });

    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        crmName: organization.crmName
      },
      users: {
        total: parseInt(userStats[0].total) || 0,
        admins: parseInt(userStats[0].admins) || 0,
        loanOfficers: parseInt(userStats[0].loanOfficers) || 0
      },
      contacts: {
        total: parseInt(contactStats[0].total) || 0,
        assigned: parseInt(contactStats[0].assigned) || 0,
        unassigned: (parseInt(contactStats[0].total) || 0) - (parseInt(contactStats[0].assigned) || 0)
      }
    });
  } catch (error) {
    console.error('Get organization stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve organization statistics' });
  }
});

module.exports = router;