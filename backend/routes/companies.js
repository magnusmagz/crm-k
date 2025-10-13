const express = require('express');
const { body, validationResult } = require('express-validator');
const { Company, Contact, Deal, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Validation middleware for creating/updating companies
const validateCompany = [
  body('name').notEmpty().trim().withMessage('Company name is required'),
  body('address').optional({ nullable: true, checkFalsy: true }).trim(),
  body('address2').optional({ nullable: true, checkFalsy: true }).trim(),
  body('city').optional({ nullable: true, checkFalsy: true }).trim(),
  body('state').optional({ nullable: true, checkFalsy: true }).trim(),
  body('zip').optional({ nullable: true, checkFalsy: true }).trim(),
  body('website').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Invalid URL format'),
  body('license').optional({ nullable: true, checkFalsy: true }).trim(),
  body('linkedinPage').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Invalid URL format'),
  body('companyLink1').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Invalid URL format'),
  body('companyLink2').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Invalid URL format'),
  body('companyLink3').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Invalid URL format'),
  body('companyLink4').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Invalid URL format'),
  body('companyLink5').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Invalid URL format'),
  body('notes').optional({ nullable: true, checkFalsy: true }).trim(),
  body('customFields').optional({ nullable: true, checkFalsy: false }).isObject().withMessage('Custom fields must be an object')
];

// Get all companies for the user with filtering
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      search,
      sortBy = 'name',
      sortOrder = 'ASC',
      limit = 50,
      offset = 0
    } = req.query;

    const where = { userId: req.user.id };

    // Search functionality
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { state: { [Op.iLike]: `%${search}%` } },
        { website: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Validate and normalize sort parameters
    const allowedSortFields = ['name', 'city', 'state', 'createdAt', 'updatedAt'];
    const normalizedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    const normalizedSortOrder = (sortOrder || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const companies = await Company.findAndCountAll({
      where,
      order: [[normalizedSortBy, normalizedSortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get contact and deal counts for each company
    const companyIds = companies.rows.map(c => c.id);

    const contactCounts = await Contact.count({
      where: {
        companyId: companyIds,
        userId: req.user.id
      },
      group: ['company_id']
    });

    const dealStats = await Deal.findAll({
      where: {
        companyId: companyIds,
        userId: req.user.id
      },
      attributes: [
        'companyId',
        [Deal.sequelize.fn('COUNT', Deal.sequelize.col('id')), 'dealCount'],
        [Deal.sequelize.fn('COALESCE', Deal.sequelize.fn('SUM', Deal.sequelize.col('value')), 0), 'totalValue']
      ],
      group: ['companyId'],
      raw: true
    });

    // Create maps for quick lookup
    const contactCountMap = {};
    if (Array.isArray(contactCounts)) {
      contactCounts.forEach(item => {
        contactCountMap[item.company_id] = item.count;
      });
    }

    const dealStatsMap = dealStats.reduce((map, stat) => {
      map[stat.companyId] = {
        dealCount: parseInt(stat.dealCount) || 0,
        totalValue: parseFloat(stat.totalValue) || 0
      };
      return map;
    }, {});

    // Add counts to companies
    const companiesWithStats = companies.rows.map(company => ({
      ...company.toJSON(),
      contactCount: contactCountMap[company.id] || 0,
      dealCount: dealStatsMap[company.id]?.dealCount || 0,
      totalDealValue: dealStatsMap[company.id]?.totalValue || 0
    }));

    res.json({
      companies: companiesWithStats,
      total: companies.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Failed to get companies' });
  }
});

// Get single company
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const company = await Company.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get related contacts and deals
    const contacts = await Contact.findAll({
      where: {
        companyId: company.id,
        userId: req.user.id
      },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    const deals = await Deal.findAll({
      where: {
        companyId: company.id,
        userId: req.user.id
      },
      include: [
        { model: Contact, as: 'Contact' }
      ],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    // Get stats
    const contactCount = await Contact.count({
      where: { companyId: company.id, userId: req.user.id }
    });

    const dealStats = await Deal.findOne({
      where: { companyId: company.id, userId: req.user.id },
      attributes: [
        [Deal.sequelize.fn('COUNT', Deal.sequelize.col('id')), 'dealCount'],
        [Deal.sequelize.fn('COALESCE', Deal.sequelize.fn('SUM', Deal.sequelize.col('value')), 0), 'totalValue']
      ],
      raw: true
    });

    res.json({
      company: {
        ...company.toJSON(),
        contactCount,
        dealCount: parseInt(dealStats?.dealCount) || 0,
        totalDealValue: parseFloat(dealStats?.totalValue) || 0
      },
      contacts,
      deals
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to get company' });
  }
});

// Create new company
router.post('/', authMiddleware, validateCompany, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const company = await Company.create({
      ...req.body,
      userId: req.user.id,
      organizationId: req.user.organizationId
    });

    res.status(201).json({
      message: 'Company created successfully',
      company
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Update company
router.put('/:id', authMiddleware, validateCompany, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const company = await Company.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    await company.update(req.body);

    res.json({
      message: 'Company updated successfully',
      company
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Delete company
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const company = await Company.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if company has associated contacts or deals
    const contactCount = await Contact.count({
      where: { companyId: company.id }
    });

    const dealCount = await Deal.count({
      where: { companyId: company.id }
    });

    if (contactCount > 0 || dealCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete company with associated contacts or deals',
        contactCount,
        dealCount
      });
    }

    await company.destroy();

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// Bulk delete companies
router.post('/bulk-delete', authMiddleware,
  body('ids').isArray().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { ids } = req.body;

      // Check for associated contacts or deals
      const contactCount = await Contact.count({
        where: { companyId: { [Op.in]: ids } }
      });

      const dealCount = await Deal.count({
        where: { companyId: { [Op.in]: ids } }
      });

      if (contactCount > 0 || dealCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete companies with associated contacts or deals',
          contactCount,
          dealCount
        });
      }

      const result = await Company.destroy({
        where: {
          id: { [Op.in]: ids },
          userId: req.user.id
        }
      });

      res.json({
        message: `${result} companies deleted successfully`,
        deletedCount: result
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({ error: 'Failed to delete companies' });
    }
  }
);

module.exports = router;
