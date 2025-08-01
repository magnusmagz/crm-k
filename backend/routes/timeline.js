const express = require('express');
const { Contact, Deal, Note, EmailSend, EmailEvent, Stage, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get timeline for a contact
router.get('/contact/:contactId', authMiddleware, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { limit = 50, offset = 0, types } = req.query;
    
    // Verify contact belongs to user
    const contact = await Contact.findOne({
      where: {
        id: contactId,
        userId: req.user.id
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Build filter for activity types
    const typeFilter = types ? types.split(',') : ['note', 'deal', 'email', 'contact'];
    
    const activities = [];

    // Fetch notes
    if (typeFilter.includes('note')) {
      try {
        const notes = await Note.findAll({
          where: {
            contactId: contactId
          },
          attributes: ['id', 'content', 'createdAt', 'updatedAt'],
          raw: true
        });

        if (notes && Array.isArray(notes)) {
          notes.forEach(note => {
            if (note && note.id) {
              activities.push({
                id: `note_${note.id}`,
                type: 'note',
                title: 'Note added',
                description: note.content || '',
                timestamp: note.createdAt,
                data: note
              });
            }
          });
        }
      } catch (noteError) {
        console.error('Error fetching notes for timeline:', noteError);
      }
    }

    // Fetch deals and deal updates
    if (typeFilter.includes('deal')) {
      try {
        const deals = await Deal.findAll({
          where: {
            contactId: contactId,
            userId: req.user.id
          },
          attributes: ['id', 'name', 'value', 'status', 'createdAt', 'updatedAt', 'closedAt', 'stageId'],
          include: [{
            model: Stage,
            as: 'stage',
            attributes: ['name', 'color'],
            required: false
          }]
        });

        if (deals && Array.isArray(deals)) {
          deals.forEach(deal => {
            if (deal && deal.id) {
              // Deal created
              activities.push({
                id: `deal_created_${deal.id}`,
                type: 'deal',
                subtype: 'created',
                title: 'Deal created',
                description: `${deal.name || 'Untitled'} - $${deal.value || 0}`,
                timestamp: deal.createdAt,
                data: {
                  dealId: deal.id,
                  name: deal.name,
                  value: deal.value,
                  stage: deal.stage || null
                }
              });

              // Deal closed (if applicable)
              if (deal.status !== 'open' && deal.closedAt) {
                activities.push({
                  id: `deal_${deal.status}_${deal.id}`,
                  type: 'deal',
                  subtype: deal.status,
                  title: `Deal ${deal.status}`,
                  description: `${deal.name || 'Untitled'} - $${deal.value || 0}`,
                  timestamp: deal.closedAt,
                  data: {
                    dealId: deal.id,
                    name: deal.name,
                    value: deal.value,
                    status: deal.status
                  }
                });
              }
            }
          });
        }
      } catch (dealError) {
        console.error('Error fetching deals for timeline:', dealError);
      }
    }

    // Fetch emails
    if (typeFilter.includes('email')) {
      try {
        const emails = await EmailSend.findAll({
          where: {
            contactId: contactId,
            userId: req.user.id
          },
          attributes: ['id', 'subject', 'preview', 'sentAt', 'openedAt', 'clickedAt']
        });

        if (emails && Array.isArray(emails)) {
          emails.forEach(email => {
            if (email && email.id && email.sentAt) {
              // Email sent
              activities.push({
                id: `email_sent_${email.id}`,
                type: 'email',
                subtype: 'sent',
                title: 'Email sent',
                description: email.subject || 'No subject',
                preview: email.preview,
                timestamp: email.sentAt,
                data: {
                  emailId: email.id,
                  subject: email.subject
                }
              });

              // Email opened
              if (email.openedAt) {
                activities.push({
                  id: `email_opened_${email.id}`,
                  type: 'email',
                  subtype: 'opened',
                  title: 'Email opened',
                  description: email.subject || 'No subject',
                  timestamp: email.openedAt,
                  data: {
                    emailId: email.id,
                    subject: email.subject
                  }
                });
              }

              // Email clicked
              if (email.clickedAt) {
                activities.push({
                  id: `email_clicked_${email.id}`,
                  type: 'email',
                  subtype: 'clicked',
                  title: 'Email link clicked',
                  description: email.subject || 'No subject',
                  timestamp: email.clickedAt,
                  data: {
                    emailId: email.id,
                    subject: email.subject
                  }
                });
              }
            }
          });
        }
      } catch (emailError) {
        console.error('Error fetching emails for timeline:', emailError);
      }
    }

    // Contact updates
    if (typeFilter.includes('contact')) {
      // Contact created
      activities.push({
        id: `contact_created_${contact.id}`,
        type: 'contact',
        subtype: 'created',
        title: 'Contact created',
        description: `${contact.firstName} ${contact.lastName} added to contacts`,
        timestamp: contact.createdAt,
        data: {
          contactId: contact.id,
          name: `${contact.firstName} ${contact.lastName}`
        }
      });

      // Contact updated (if updated after creation)
      if (contact.updatedAt > contact.createdAt) {
        activities.push({
          id: `contact_updated_${contact.id}`,
          type: 'contact',
          subtype: 'updated',
          title: 'Contact updated',
          description: 'Contact information was updated',
          timestamp: contact.updatedAt,
          data: {
            contactId: contact.id
          }
        });
      }
    }

    // Sort activities by timestamp (newest first)
    if (activities && activities.length > 0) {
      activities.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
    }

    // Apply pagination
    const paginatedActivities = activities.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      activities: paginatedActivities || [],
      total: activities.length || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Get timeline error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// Get timeline summary for a contact
router.get('/contact/:contactId/summary', authMiddleware, async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Verify contact belongs to user
    const contact = await Contact.findOne({
      where: {
        id: contactId,
        userId: req.user.id
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get counts for each activity type
    let noteCount = 0, dealCount = 0, emailCount = 0;
    
    try {
      [noteCount, dealCount, emailCount] = await Promise.all([
        Note.count({
          where: {
            contactId: contactId
          }
        }).catch(() => 0),
        Deal.count({
          where: {
            contactId: contactId,
            userId: req.user.id
          }
        }).catch(() => 0),
        EmailSend.count({
          where: {
            contactId: contactId,
            userId: req.user.id
          }
        }).catch(() => 0)
      ]);
    } catch (countError) {
      console.error('Error getting activity counts:', countError);
    }

    // Get last activity date
    const lastActivities = await Promise.all([
      Note.findOne({
        where: { contactId },
        order: [['createdAt', 'DESC']],
        attributes: ['createdAt']
      }),
      Deal.findOne({
        where: { contactId, userId: req.user.id },
        order: [['updatedAt', 'DESC']],
        attributes: ['updatedAt']
      }),
      EmailSend.findOne({
        where: { contactId, userId: req.user.id },
        order: [['sentAt', 'DESC']],
        attributes: ['sentAt']
      })
    ]);

    const lastActivityDates = [
      lastActivities[0]?.createdAt,
      lastActivities[1]?.updatedAt,
      lastActivities[2]?.sentAt
    ].filter(Boolean);

    const lastActivity = lastActivityDates.length > 0 
      ? new Date(Math.max(...lastActivityDates.map(d => new Date(d).getTime())))
      : null;

    res.json({
      summary: {
        totalActivities: noteCount + dealCount + emailCount,
        noteCount,
        dealCount,
        emailCount,
        lastActivity,
        contactCreated: contact.createdAt
      }
    });

  } catch (error) {
    console.error('Get timeline summary error:', error);
    res.status(500).json({ error: 'Failed to get timeline summary' });
  }
});

module.exports = router;