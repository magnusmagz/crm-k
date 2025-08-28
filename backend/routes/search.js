const express = require('express');
const { Op } = require('sequelize');
const { Contact, Deal, Stage, Note } = require('../models');
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

    // Search contacts - including notes from Notes table
    const contactsPromise = Contact.findAll({
      where: {
        userId: req.user.id,
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${searchTerm}%` } },
          { lastName: { [Op.iLike]: `%${searchTerm}%` } },
          { email: { [Op.iLike]: `%${searchTerm}%` } },
          { phone: { [Op.iLike]: `%${searchTerm}%` } },
          { company: { [Op.iLike]: `%${searchTerm}%` } },
          { notes: { [Op.iLike]: `%${searchTerm}%` } }, // Legacy notes field
          { '$contactNotes.content$': { [Op.iLike]: `%${searchTerm}%` } } // Search in Notes table
        ]
      },
      include: [
        {
          model: Note,
          as: 'contactNotes',
          required: false
        }
      ],
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
          { '$Contact.first_name$': { [Op.iLike]: `%${searchTerm}%` } },
          { '$Contact.last_name$': { [Op.iLike]: `%${searchTerm}%` } },
          { '$Contact.email$': { [Op.iLike]: `%${searchTerm}%` } },
          { '$Contact.company$': { [Op.iLike]: `%${searchTerm}%` } },
          { '$Contact.notes$': { [Op.iLike]: `%${searchTerm}%` } }, // Legacy notes field
          { '$Contact.contactNotes.content$': { [Op.iLike]: `%${searchTerm}%` } } // Search in Notes table
        ]
      },
      include: [
        {
          model: Contact,
          required: false,
          include: [
            {
              model: Note,
              as: 'contactNotes',
              required: false
            }
          ]
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

    // Debug logging - temporary
    console.log('=== SEARCH DEBUG ===');
    console.log('Search term:', searchTerm);
    console.log('Contacts found:', contacts.length);
    if (contacts.length > 0) {
      console.log('First contact:', {
        id: contacts[0].id,
        name: `${contacts[0].firstName} ${contacts[0].lastName}`,
        notes: contacts[0].notes,
        notesLength: contacts[0].notes?.length
      });
    }
    console.log('===================');

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