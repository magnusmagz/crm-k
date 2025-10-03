const express = require('express');
const { body, validationResult } = require('express-validator');
const { Organization, User, Contact, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
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
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
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
        'id', 'name', 'crm_name', 'primary_color', 'is_active',
        'created_by', 'contact_email', 'website', 
        [require('sequelize').fn('COUNT', require('sequelize').literal('DISTINCT users.id')), 'userCount'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('DISTINCT contacts.id')), 'contactCount']
      ],
      group: ['Organization.id'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      subQuery: false
    });

    // Format organizations to use camelCase property names
    const formattedOrganizations = organizations.rows.map(org => {
      const orgData = org.dataValues || org;
      return {
        id: orgData.id,
        name: orgData.name,
        crmName: orgData.crm_name || orgData.crmName,
        primaryColor: orgData.primary_color || orgData.primaryColor,
        isActive: orgData.is_active !== undefined ? orgData.is_active : orgData.isActive,
        contactEmail: orgData.contact_email || orgData.contactEmail,
        website: orgData.website,
        userCount: parseInt(orgData.userCount) || 0,
        contactCount: parseInt(orgData.contactCount) || 0
      };
    });

    req.superAdmin?.logAction('LIST_ORGANIZATIONS', {
      search, status, page, limit, total: organizations.count.length
    });

    res.json({
      organizations: formattedOrganizations,
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
          attributes: ['id', 'email', 'is_admin', 'is_loan_officer', 'is_active', 'last_login'],
          limit: 50,
          order: [['email', 'ASC']]
        },
        {
          model: Contact,
          as: 'contacts',
          attributes: ['id', 'first_name', 'last_name', 'email', 'company', 'created_at'],
          limit: 20,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Format organization data to use camelCase and include counts
    const orgData = organization.dataValues || organization;
    const formattedOrg = {
      id: orgData.id,
      name: orgData.name,
      crm_name: orgData.crm_name || orgData.crmName,
      primary_color: orgData.primary_color || orgData.primaryColor,
      is_active: orgData.is_active !== undefined ? orgData.is_active : orgData.isActive,
      contact_email: orgData.contact_email || orgData.contactEmail,
      contact_phone: orgData.contact_phone || orgData.contactPhone,
      website: orgData.website,
      address: orgData.address,
      city: orgData.city,
      state: orgData.state,
      zip_code: orgData.zip_code || orgData.zipCode,
      created_at: orgData.created_at || orgData.createdAt,
      updated_at: orgData.updated_at || orgData.updatedAt,
      settings: orgData.settings,
      users: orgData.users || [],
      contacts: orgData.contacts || [],
      contactCount: orgData.contacts ? orgData.contacts.length : 0
    };

    req.superAdmin?.logAction('VIEW_ORGANIZATION', {
      organizationId: req.params.id,
      organizationName: organization.name
    });

    res.json({ organization: formattedOrg });

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
        crm_name: crmName || name,
        primary_color: primaryColor || '#6366f1',
        contact_email: contactEmail,
        website,
        contact_phone: phone,
        address,
        city,
        state,
        zip_code: zipCode,
        created_by: req.user.id,
        is_active: true,
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
        is_verified: false,
        organization_id: organization.id,
        is_admin: true,
        is_loan_officer: false,
        require_password_change: true,
        is_active: true
      }, { transaction });

      // Create user profile for admin
      const { UserProfile } = require('../models');
      const nameParts = adminName.trim().split(' ');
      const firstName = nameParts[0] || adminName;
      const lastName = nameParts.slice(1).join(' ') || firstName; // Use firstName as fallback if no last name

      await UserProfile.create({
        userId: adminUser.id,
        firstName: firstName,
        lastName: lastName,
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
          crmName: organization.crm_name,
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
    if (crmName !== undefined) updateData.crm_name = crmName;
    if (primaryColor !== undefined) updateData.primary_color = primaryColor;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (contactEmail !== undefined) updateData.contact_email = contactEmail;
    if (website !== undefined) updateData.website = website;
    if (contactPhone !== undefined) updateData.contact_phone = contactPhone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zip_code = zipCode;
    if (settings !== undefined) updateData.settings = { ...organization.settings, ...settings };

    console.log('Updating organization with data:', updateData);
    const [rowsUpdated] = await sequelize.query(
      `UPDATE organizations SET ${Object.keys(updateData).map((key, i) => `${key} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
      {
        bind: [req.params.id, ...Object.values(updateData)],
        type: QueryTypes.UPDATE
      }
    );

    console.log('Direct SQL update result:', rowsUpdated);

    // Reload to get fresh data
    await organization.reload();
    console.log('Organization after reload:', {
      id: organization.id,
      name: organization.name,
      crm_name: organization.crm_name,
      primary_color: organization.primary_color,
      primaryColor: organization.primaryColor
    });

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

// POST /api/super-admin/organizations/:id/users - Create user for organization
router.post('/organizations/:id/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('isAdmin').optional().isBoolean(),
  body('isLoanOfficer').optional().isBoolean(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const organization = await Organization.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const { email, password, isAdmin = false, isLoanOfficer = false, isActive = true } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user
    const user = await User.create({
      email,
      password, // Will be hashed by the User model's beforeCreate hook
      organization_id: organization.id,
      is_admin: isAdmin,
      is_loan_officer: isLoanOfficer,
      is_active: isActive
    });

    // Create user profile
    const { UserProfile } = require('../models');
    const nameParts = email.split('@')[0].split('.');
    const firstName = nameParts[0] || email.split('@')[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    await UserProfile.create({
      userId: user.id,
      firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
      lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
      companyName: organization.name
    });

    req.superAdmin?.logAction('CREATE_USER', {
      userId: user.id,
      email: user.email,
      organizationId: organization.id,
      organizationName: organization.name
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
        is_loan_officer: user.is_loan_officer,
        is_active: user.is_active
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
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
    await organization.update({ is_active: false });

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
      where.is_admin = true;
    } else if (role === 'super_admin') {
      where.is_super_admin = true;
    } else if (role === 'loan_officer') {
      where.is_loan_officer = true;
    }
    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    }

    const users = await User.findAndCountAll({
      where,
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'crmName', 'primaryColor', 'isActive']
        },
        {
          model: require('../models').UserProfile,
          as: 'profile',
          attributes: ['firstName', 'lastName']
        }
      ],
      attributes: ['id', 'email', 'is_admin', 'is_loan_officer', 'is_super_admin', 'is_active', 'last_login', 'organization_id', 'created_at'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    // Calculate stats for all users (not just current page)
    const statsWhere = {};
    if (organizationId) {
      statsWhere.organization_id = organizationId;
    }

    const [totalUsers, activeUsers, adminUsers, superAdminUsers] = await Promise.all([
      User.count({ where: statsWhere }),
      User.count({ where: { ...statsWhere, is_active: true } }),
      User.count({ where: { ...statsWhere, is_admin: true } }),
      User.count({ where: { ...statsWhere, is_super_admin: true } })
    ]);

    // Format users to include firstName and lastName from profile
    const formattedUsers = users.rows.map(user => {
      // Get the raw data values for proper field access
      const userData = user.dataValues || user;
      const profileData = user.profile?.dataValues || user.profile || {};
      const orgData = user.organization?.dataValues || user.organization || {};

      return {
        id: userData.id,
        email: userData.email,
        firstName: profileData.firstName || profileData.first_name || '',
        lastName: profileData.lastName || profileData.last_name || '',
        isAdmin: userData.is_admin === true || userData.is_admin === 't' || userData.isAdmin === true,
        isLoanOfficer: userData.is_loan_officer === true || userData.is_loan_officer === 't' || userData.isLoanOfficer === true,
        isSuperAdmin: userData.is_super_admin === true || userData.is_super_admin === 't' || userData.isSuperAdmin === true,
        isActive: userData.is_active === true || userData.is_active === 't' || userData.isActive === true,
        lastLogin: userData.last_login || userData.lastLogin,
        organizationId: userData.organization_id || userData.organizationId,
        createdAt: userData.created_at || userData.createdAt,
        organization: orgData
      };
    });

    req.superAdmin?.logAction('LIST_USERS', {
      search, organizationId, role, status, page, limit, total: users.count
    });

    res.json({
      users: formattedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.count,
        pages: Math.ceil(users.count / limit)
      },
      stats: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        admins: adminUsers,
        superAdmins: superAdminUsers
      }
    });

  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// PUT /api/super-admin/users/:id - Update user
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow modifying super admins
    if ((user.isSuperAdmin || user.is_super_admin) && req.user.id !== user.id) {
      return res.status(403).json({ error: 'Cannot modify super admin users' });
    }

    const { isActive, isAdmin, isLoanOfficer, requirePasswordChange } = req.body;

    const updateData = {};
    if (isActive !== undefined) updateData.is_active = isActive;
    if (isAdmin !== undefined) updateData.is_admin = isAdmin;
    if (isLoanOfficer !== undefined) updateData.is_loan_officer = isLoanOfficer;
    if (requirePasswordChange !== undefined) updateData.require_password_change = requirePasswordChange;

    await user.update(updateData);

    req.superAdmin?.logAction('UPDATE_USER', {
      userId: req.params.id,
      userEmail: user.email,
      organizationName: user.organization?.name,
      changes: Object.keys(updateData)
    });

    // Reload user to get updated values
    await user.reload();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive !== undefined ? user.isActive : user.is_active,
        isAdmin: user.isAdmin !== undefined ? user.isAdmin : user.is_admin,
        isLoanOfficer: user.isLoanOfficer !== undefined ? user.isLoanOfficer : user.is_loan_officer,
        isSuperAdmin: user.isSuperAdmin !== undefined ? user.isSuperAdmin : user.is_super_admin
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
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
      attributes: ['id', 'email', 'is_admin', 'is_super_admin'],
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
      Organization.count({ where: { is_active: true } }),
      User.count({ where: { is_active: true } }),
      Contact.count()
    ]);

    // Get user breakdown by role
    const [adminCount, loanOfficerCount, superAdminCount] = await Promise.all([
      User.count({ where: { is_admin: true, is_active: true } }),
      User.count({ where: { is_loan_officer: true, is_active: true } }),
      User.count({ where: { is_super_admin: true, is_active: true } })
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
        where: { created_at: { [require('sequelize').Op.gte]: thirtyDaysAgo } }
      }),
      Contact.count({ 
        where: { created_at: { [require('sequelize').Op.gte]: thirtyDaysAgo } }
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
      Organization.count({ where: { is_active: true } }),
      User.count(),
      User.count({ where: { is_active: true } }),
      Contact.count()
    ]);

    // Get recent organizations (top 5) with user count
    const recentOrgs = await Organization.findAll({
      attributes: ['id', 'name', 'crm_name', 'is_active'],
      order: [['name', 'ASC']],
      limit: 5
    });

    // Format organizations with user count for frontend
    const recentOrganizations = await Promise.all(recentOrgs.map(async (org) => {
      const userCount = await User.count({ where: { organization_id: org.id } });
      // Get the raw data values
      const orgData = org.dataValues || org;
      return {
        id: orgData.id,
        name: orgData.name,
        crmName: orgData.crm_name || orgData.crmName || orgData.name,
        isActive: orgData.is_active === true || orgData.is_active === 't' || orgData.isActive === true,
        userCount: userCount
      };
    }));

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
        isSuperAdmin: req.user.is_super_admin
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;