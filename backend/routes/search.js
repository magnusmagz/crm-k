const express = require('express');
const { Op } = require('sequelize');
const { Contact, Deal, Stage } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Unified search endpoint
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({ contacts: [], deals: [] });
    }

    const searchTerm = q.trim();

    // Search contacts - using proper Sequelize field names
    const contactsPromise = Contact.findAll({
      where: {
        userId: req.user.id,
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${searchTerm}%` } },
          { lastName: { [Op.iLike]: `%${searchTerm}%` } },
          { email: { [Op.iLike]: `%${searchTerm}%` } },
          { phone: { [Op.iLike]: `%${searchTerm}%` } },
          { company: { [Op.iLike]: `%${searchTerm}%` } },
          { notes: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      limit: parseInt(limit),
      order: [['updatedAt', 'DESC']]
    });

    // Search deals (including contact info) - using proper Sequelize field names
    const dealsPromise = Deal.findAll({
      where: {
        userId: req.user.id,
        [Op.or]: [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { notes: { [Op.iLike]: `%${searchTerm}%` } },
          { '$Contact.firstName$': { [Op.iLike]: `%${searchTerm}%` } },
          { '$Contact.lastName$': { [Op.iLike]: `%${searchTerm}%` } },
          { '$Contact.email$': { [Op.iLike]: `%${searchTerm}%` } },
          { '$Contact.company$': { [Op.iLike]: `%${searchTerm}%` } },
          { '$Contact.notes$': { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      include: [
        {
          model: Contact,
          required: false
        },
        {
          model: Stage
        }
      ],
      limit: parseInt(limit),
      order: [['updatedAt', 'DESC']]
    });

    // Execute both searches in parallel
    const [contacts, deals] = await Promise.all([contactsPromise, dealsPromise]);

    res.json({
      contacts,
      deals,
      counts: {
        contacts: contacts.length,
        deals: deals.length
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;