const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { Note, Contact, User, UserProfile } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get notes for a contact
router.get('/contact/:contactId', authMiddleware, [
  param('contactId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactId } = req.params;
    const userId = req.user.id;

    // Verify contact belongs to user
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get all notes for this contact
    const notes = await Note.findAll({
      where: { contactId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email'],
        include: [{
          model: UserProfile,
          as: 'profile',
          attributes: ['firstName', 'lastName']
        }]
      }],
      order: [
        ['isPinned', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Create a note
router.post('/', authMiddleware, [
  body('contactId').isUUID(),
  body('content').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactId, content } = req.body;
    const userId = req.user.id;

    // Verify contact belongs to user
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Create the note
    const note = await Note.create({
      userId,
      contactId,
      content
    });

    // Fetch the created note with user info
    const createdNote = await Note.findByPk(note.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email'],
        include: [{
          model: UserProfile,
          as: 'profile',
          attributes: ['firstName', 'lastName']
        }]
      }]
    });

    res.status(201).json(createdNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update a note
router.put('/:id', authMiddleware, [
  param('id').isUUID(),
  body('content').optional().trim(),
  body('isPinned').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Find the note and verify ownership
    const note = await Note.findOne({
      where: { id, userId }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Update the note
    await note.update(updates);

    // Fetch updated note with user info
    const updatedNote = await Note.findByPk(note.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email'],
        include: [{
          model: UserProfile,
          as: 'profile',
          attributes: ['firstName', 'lastName']
        }]
      }]
    });

    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a note
router.delete('/:id', authMiddleware, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Find the note and verify ownership
    const note = await Note.findOne({
      where: { id, userId }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Delete the note
    await note.destroy();

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;