const express = require('express');
const { body, validationResult } = require('express-validator');
const { Organization, User, Contact } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { requireSuperAdmin, loadSuperAdminContext } = require('../middleware/superAdmin');

const router = express.Router();

// Apply auth and super admin middleware to all routes
router.use(authMiddleware);
router.use(requireSuperAdmin);
router.use(loadSuperAdminContext);

// Validation middleware for organization creation
const validateOrganizationCreation = [
  body('name').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Organization name is required'),
  body('crmName').optional().trim().isLength({ max: 255 }).withMessage('CRM name must be less than 255 characters'),
  body('primaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color format'),
  body('adminEmail').isEmail().withMessage('Valid admin email is required'),
  body('adminName').notEmpty().trim().withMessage('Admin name is required'),
  body('contactEmail').optional().isEmail().withMessage('Invalid contact email'),
  body('website').optional().isURL().withMessage('Invalid website URL')
];

// ===============================
// ORGANIZATIONS MANAGEMENT
// ===============================

// GET /api/super-admin/organizations - List all organizations
router.get('/organizations', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, sortBy = 'name', sortOrder = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (search) {
      where.name = { [require('sequelize').Op.iLike]: `%${search}%` };
    }
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Get organizations with user and contact counts
    const organizations = await Organization.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'users',
          attributes: [],
          required: false
        },
        {
          model: Contact,
          as: 'contacts', 
          attributes: [],
          required: false
        }
      ],
      attributes: [
        'id', 'name', 'crmName', 'primaryColor', 'isActive',
        'createdBy', 'contactEmail', 'website', 
        [require('sequelize').fn('COUNT', require('sequelize').literal('DISTINCT users.id')), 'userCount'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('DISTINCT contacts.id')), 'contactCount']
      ],
      group: ['Organization.id'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      subQuery: false
    });

    req.superAdmin?.logAction('LIST_ORGANIZATIONS', {
      search, status, page, limit, total: organizations.count.length
    });

    res.json({
      organizations: organizations.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: organizations.count.length,
        pages: Math.ceil(organizations.count.length / limit)
      }
    });

  } catch (error) {
    console.error('List organizations error:', error);
    res.status(500).json({ error: 'Failed to retrieve organizations' });
  }
});

// GET /api/super-admin/organizations/:id - Get organization details
router.get('/organizations/:id', async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'email', 'isAdmin', 'isLoanOfficer', 'isActive', 'lastLogin'],
          limit: 50,
          order: [['email', 'ASC']]
        },
        {
          model: Contact,
          as: 'contacts',
          attributes: ['id', 'firstName', 'lastName', 'email', 'company', 'createdAt'],
          limit: 20,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    req.superAdmin?.logAction('VIEW_ORGANIZATION', {
      organizationId: req.params.id,
      organizationName: organization.name
    });

    res.json({ organization });

  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to retrieve organization' });
  }
});

// POST /api/super-admin/organizations - Create new organization
router.post('/organizations', validateOrganizationCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, crmName, primaryColor, adminEmail, adminName, contactEmail, website, phone, address, city, state, zipCode } = req.body;

    // Check if organization with this name already exists
    const existingOrg = await Organization.findOne({ where: { name } });
    if (existingOrg) {
      return res.status(400).json({ error: 'Organization with this name already exists' });
    }

    // Check if admin user already exists
    const existingUser = await User.findOne({ where: { email: adminEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Start transaction
    const transaction = await require('../models').sequelize.transaction();

    try {
      // Create organization
      const organization = await Organization.create({
        name,
        crmName: crmName || name,
        primaryColor: primaryColor || '#6366f1',
        contactEmail,
        website,
        contactPhone: phone,
        address,
        city,
        state,
        zipCode,
        createdBy: req.user.id,
        isActive: true,
        settings: {
          allowUserRegistration: false,
          requireEmailVerification: true,
          defaultUserRole: 'user',
          maxUsers: null,
          features: {
            roundRobin: true,
            emailTemplates: true,
            customFields: true,
            recruiting: true
          }
        }
      }, { transaction });

      // Create admin user for the organization
      const adminUser = await User.create({
        email: adminEmail,
        password: 'TempPassword123!', // TODO: Generate secure temp password and send email
        isVerified: false,
        organizationId: organization.id,
        isAdmin: true,
        isLoanOfficer: false,
        requirePasswordChange: true,
        isActive: true
      }, { transaction });

      // Create user profile for admin
      const { UserProfile } = require('../models');
      await UserProfile.create({
        userId: adminUser.id,
        firstName: adminName.split(' ')[0] || adminName,
        lastName: adminName.split(' ').slice(1).join(' ') || '',
        companyName: name
      }, { transaction });

      await transaction.commit();

      req.superAdmin?.logAction('CREATE_ORGANIZATION', {
        organizationId: organization.id,
        organizationName: organization.name,
        adminEmail: adminEmail
      });

      res.status(201).json({
        message: 'Organization created successfully',
        organization: {
          id: organization.id,
          name: organization.name,
          crmName: organization.crmName,
          adminEmail: adminEmail
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Create organization error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Organization or user already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create organization' });
    }
  }
});

// PUT /api/super-admin/organizations/:id - Update organization
router.put('/organizations/:id', async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const { name, crmName, primaryColor, isActive, contactEmail, website, contactPhone, address, city, state, zipCode, settings } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (crmName !== undefined) updateData.crmName = crmName;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (website !== undefined) updateData.website = website;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (settings !== undefined) updateData.settings = { ...organization.settings, ...settings };

    await organization.update(updateData);

    req.superAdmin?.logAction('UPDATE_ORGANIZATION', {
      organizationId: req.params.id,
      organizationName: organization.name,
      changes: Object.keys(updateData)
    });

    res.json({
      message: 'Organization updated successfully',
      organization
    });

  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// DELETE /api/super-admin/organizations/:id - Deactivate organization
router.delete('/organizations/:id', async (req, res) => {
  try {
    const organization = await Organization.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Instead of hard delete, deactivate the organization
    await organization.update({ isActive: false });

    req.superAdmin?.logAction('DEACTIVATE_ORGANIZATION', {
      organizationId: req.params.id,
      organizationName: organization.name
    });

    res.json({ message: 'Organization deactivated successfully' });

  } catch (error) {
    console.error('Deactivate organization error:', error);
    res.status(500).json({ error: 'Failed to deactivate organization' });
  }
});

// ===============================
// GLOBAL USER MANAGEMENT  
// ===============================

// GET /api/super-admin/users - List all users across organizations
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, organizationId, role, status, sortBy = 'email', sortOrder = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (search) {
      where.email = { [require('sequelize').Op.iLike]: `%${search}%` };
    }
    if (organizationId) {
      where.organizationId = organizationId;
    }
    if (role === 'admin') {
      where.isAdmin = true;
    } else if (role === 'super_admin') {
      where.isSuperAdmin = true;
    } else if (role === 'loan_officer') {
      where.isLoanOfficer = true;
    }
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const users = await User.findAndCountAll({
      where,
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'crmName']
        }
      ],
      attributes: ['id', 'email', 'isAdmin', 'isLoanOfficer', 'isSuperAdmin', 'isActive', 'lastLogin', 'organizationId'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    req.superAdmin?.logAction('LIST_USERS', {
      search, organizationId, role, status, page, limit, total: users.count
    });

    res.json({
      users: users.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.count,
        pages: Math.ceil(users.count / limit)
      }
    });

  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// GET /api/super-admin/users/search - Search users
router.get('/users/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ users: [] });
    }

    const users = await User.findAll({
      where: {
        email: { [require('sequelize').Op.iLike]: `%${q.trim()}%` }
      },
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['name']
        }
      ],
      attributes: ['id', 'email', 'isAdmin', 'isSuperAdmin'],
      limit: parseInt(limit),
      order: [['email', 'ASC']]
    });

    res.json({ users });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// ===============================
// PLATFORM ANALYTICS
// ===============================

// GET /api/super-admin/analytics - Platform-wide metrics
router.get('/analytics', async (req, res) => {
  try {
    // Get basic counts
    const [orgCount, userCount, contactCount] = await Promise.all([
      Organization.count({ where: { isActive: true } }),
      User.count({ where: { isActive: true } }),
      Contact.count()
    ]);

    // Get user breakdown by role
    const [adminCount, loanOfficerCount, superAdminCount] = await Promise.all([
      User.count({ where: { isAdmin: true, isActive: true } }),
      User.count({ where: { isLoanOfficer: true, isActive: true } }),
      User.count({ where: { isSuperAdmin: true, isActive: true } })
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentOrgs, recentUsers, recentContacts] = await Promise.all([
      Organization.count({ 
        // Note: This assumes timestamps are added later
        // where: { createdAt: { [require('sequelize').Op.gte]: thirtyDaysAgo } }
      }),
      User.count({ 
        where: { createdAt: { [require('sequelize').Op.gte]: thirtyDaysAgo } }
      }),
      Contact.count({ 
        where: { createdAt: { [require('sequelize').Op.gte]: thirtyDaysAgo } }
      })
    ]);

    req.superAdmin?.logAction('VIEW_ANALYTICS');

    res.json({
      totals: {
        organizations: orgCount,
        users: userCount,
        contacts: contactCount
      },
      users: {
        total: userCount,
        admins: adminCount,
        loanOfficers: loanOfficerCount,
        superAdmins: superAdminCount,
        regular: userCount - adminCount - loanOfficerCount - superAdminCount
      },
      activity: {
        period: 'Last 30 days',
        newOrganizations: recentOrgs,
        newUsers: recentUsers,
        newContacts: recentContacts
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

// ===============================
// SUPER ADMIN DASHBOARD
// ===============================

// GET /api/super-admin/dashboard - Dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    // Get quick stats for dashboard
    const [
      totalOrgs,
      activeOrgs,
      totalUsers,
      activeUsers,
      totalContacts
    ] = await Promise.all([
      Organization.count(),
      Organization.count({ where: { isActive: true } }),
      User.count(),
      User.count({ where: { isActive: true } }),
      Contact.count()
    ]);

    // Get recent organizations (top 5) - simplified without user count for now
    const recentOrganizations = await Organization.findAll({
      attributes: ['id', 'name', 'crmName', 'isActive'],
      order: [['name', 'ASC']],
      limit: 5
    });
    
    // Add user count manually for each organization
    for (const org of recentOrganizations) {
      const userCount = await User.count({ where: { organizationId: org.id } });
      org.dataValues.userCount = userCount;
    }

    req.superAdmin?.logAction('VIEW_DASHBOARD');

    res.json({
      stats: {
        organizations: {
          total: totalOrgs,
          active: activeOrgs,
          inactive: totalOrgs - activeOrgs
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        contacts: {
          total: totalContacts
        }
      },
      recentOrganizations,
      user: {
        email: req.user.email,
        isSuperAdmin: req.user.isSuperAdmin
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;