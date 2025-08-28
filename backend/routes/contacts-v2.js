const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Contact, CustomField, Deal, Note, EmailSuppression, User, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { applyContactVisibility, canModifyContact, canAssignContacts } = require('../middleware/contactVisibility');
const { Op } = require('sequelize');
const automationEmitter = require('../services/eventEmitter');

const router = express.Router();

// Validation middleware
const validateContact = [
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
  body('email').optional({ nullable: true, checkFalsy: false }).isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('phone').optional({ nullable: true, checkFalsy: true }).matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),
  body('company').optional({ nullable: true, checkFalsy: false }).trim(),
  body('position').optional({ nullable: true, checkFalsy: false }).trim(),
  body('state').optional({ nullable: true, checkFalsy: false }).trim(),
  body('source').optional({ nullable: true, checkFalsy: false }).trim(),
  body('contactType').optional({ nullable: true, checkFalsy: false }).trim(),
  body('tags').optional({ nullable: true, checkFalsy: false }).isArray().withMessage('Tags must be an array'),
  body('notes').optional({ nullable: true, checkFalsy: false }).trim(),
  body('customFields').optional({ nullable: true, checkFalsy: false }).isObject().withMessage('Custom fields must be an object')
];

// ================================
// STATIC ROUTES (must come first)
// ================================

// Get all contacts based on user permissions
router.get('/', authMiddleware, applyContactVisibility, async (req, res) => {
  try {
    const {
      search,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      limit = 50,
      offset = 0,
      assigned = null // Filter for assigned/unassigned contacts
    } = req.query;

    // Start with visibility filter from middleware
    const where = { ...req.contactFilter };

    // Add assignment filter if requested
    if (assigned === 'true') {
      where.assignedTo = { [Op.not]: null };
    } else if (assigned === 'false') {
      where.assignedTo = null;
    }

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

    // Get contacts with assignment info
    const contacts = await Contact.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'assignedUser',
        attributes: ['id', 'email'],
        required: false
      }],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Get deal stats if needed
    const contactIds = contacts.rows.map(c => c.id);
    const dealStats = await Deal.findAll({
      where: { 
        contactId: contactIds
      },
      attributes: [
        'contactId',
        [Deal.sequelize.fn('COUNT', Deal.sequelize.col('id')), 'dealCount'],
        [Deal.sequelize.fn('COALESCE', Deal.sequelize.fn('SUM', Deal.sequelize.col('value')), 0), 'totalValue']
      ],
      group: ['contactId'],
      raw: true
    });
    
    // Create a map for quick lookup
    const dealStatsMap = dealStats.reduce((map, stat) => {
      map[stat.contactId] = {
        dealCount: parseInt(stat.dealCount) || 0,
        totalValue: parseFloat(stat.totalValue) || 0
      };
      return map;
    }, {});
    
    // Merge deal stats with contacts
    const contactsWithStats = contacts.rows.map(contact => ({
      ...contact.toJSON(),
      dealStats: dealStatsMap[contact.id] || { dealCount: 0, totalValue: 0 }
    }));

    res.json({
      contacts: contactsWithStats,
      total: contacts.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      userRole: req.userRole // Include user role for frontend
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get unassigned contacts (admin only)
router.get('/unassigned', authMiddleware, applyContactVisibility, async (req, res) => {
  try {
    // Only admins can see unassigned contacts
    if (req.currentUser.isAdmin !== true) {
      return res.status(403).json({ error: 'Only administrators can view unassigned contacts' });
    }

    const unassignedContacts = await Contact.findAll({
      where: {
        organizationId: req.currentUser.organizationId,
        assignedTo: null
      },
      order: [['createdAt', 'DESC']]
    });

    res.json(unassignedContacts);
  } catch (error) {
    console.error('Error fetching unassigned contacts:', error);
    res.status(500).json({ error: 'Failed to fetch unassigned contacts' });
  }
});

// Create a new contact
router.post('/', authMiddleware, applyContactVisibility, validateContact, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const contactData = {
      ...req.body,
      userId: req.userId, // Original owner
      organizationId: req.currentUser.organizationId,
      assignedTo: req.userId, // Auto-assign to creator initially
      assignedAt: new Date()
    };

    // Remove undefined values
    Object.keys(contactData).forEach(key => 
      contactData[key] === undefined && delete contactData[key]
    );

    const newContact = await Contact.create(contactData);

    // Handle custom fields if provided
    if (req.body.customFields) {
      const customFields = await CustomField.findAll({
        where: { 
          user_id: req.user.id,
          entity_type: 'contact'
        }
      });

      for (const [fieldName, fieldValue] of Object.entries(req.body.customFields)) {
        const field = customFields.find(f => f.name === fieldName);
        if (field) {
          const customFieldData = {
            ...newContact.customFields || {},
            [fieldName]: fieldValue
          };
          await newContact.update({ customFields: customFieldData });
        }
      }
    }

    // If it's a lead and we have round-robin rules, trigger assignment
    if (contactData.contactType === 'lead') {
      // Try round-robin assignment
      const assignmentEngine = require('../services/assignmentEngine');
      try {
        const assignment = await assignmentEngine.processIncomingLead(
          newContact,
          req.currentUser.organizationId
        );
        
        if (assignment) {
          // Reload contact with assigned user info
          await newContact.reload({
            include: [{
              model: User,
              as: 'assignedUser',
              attributes: ['id', 'email']
            }]
          });
        }
      } catch (err) {
        console.error('Round-robin assignment failed:', err);
        // Continue without assignment
      }
      
      automationEmitter.emit('contact:created', { 
        contact: newContact.toJSON(),
        userId: req.userId 
      });
    }

    res.status(201).json(newContact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Assign contact to user (admin only)
router.post('/:id/assign', authMiddleware, canAssignContacts, async (req, res) => {
  try {
    const { assignTo } = req.body;
    
    if (!assignTo) {
      return res.status(400).json({ error: 'assignTo user ID is required' });
    }

    // Verify the target user exists and is in the same organization
    const targetUser = await User.findOne({
      where: {
        id: assignTo,
        organizationId: req.currentUser.organizationId
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found in your organization' });
    }

    // Update the contact
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        organizationId: req.currentUser.organizationId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await contact.update({
      assignedTo: assignTo,
      assignedAt: new Date()
    });

    // Log the assignment
    await sequelize.query(`
      INSERT INTO assignments (
        id, "contactId", "assignedTo", "assignedBy", 
        "assignedAt", status, "createdAt", "updatedAt"
      )
      VALUES (
        :id, :contactId, :assignedTo, :assignedBy,
        NOW(), 'pending', NOW(), NOW()
      )
    `, {
      replacements: {
        id: require('uuid').v4(),
        contactId: contact.id,
        assignedTo: assignTo,
        assignedBy: req.userId
      }
    });

    res.json({ 
      message: 'Contact assigned successfully',
      contact: await contact.reload({
        include: [{
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'email']
        }]
      })
    });
  } catch (error) {
    console.error('Error assigning contact:', error);
    res.status(500).json({ error: 'Failed to assign contact' });
  }
});

// Get specific contact (with visibility check)
router.get('/:id', authMiddleware, applyContactVisibility, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        ...req.contactFilter // Apply visibility filter
      },
      include: [{
        model: User,
        as: 'assignedUser',
        attributes: ['id', 'email'],
        required: false
      }]
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found or access denied' });
    }

    // Get deals for this contact
    const deals = await Deal.findAll({
      where: { contactId: contact.id }
    });

    res.json({
      ...contact.toJSON(),
      deals
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Update contact (with permission check)
router.put('/:id', authMiddleware, applyContactVisibility, canModifyContact, validateContact, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        ...req.contactFilter
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Don't allow changing assignment through regular update
    const updateData = { ...req.body };
    delete updateData.assignedTo;
    delete updateData.organizationId;
    delete updateData.userId;

    await contact.update(updateData);

    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact (with permission check)
router.delete('/:id', authMiddleware, applyContactVisibility, canModifyContact, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        ...req.contactFilter
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await contact.destroy();
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

module.exports = router;