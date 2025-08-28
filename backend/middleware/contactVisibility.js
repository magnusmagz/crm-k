// Middleware to handle contact visibility based on user role
const { Contact, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Contact Visibility Rules:
 * - Admin (isAdmin = true): Can see ALL contacts in the organization
 * - Regular users (isAdmin = null/false): Can only see contacts assigned to them
 */

const applyContactVisibility = async (req, res, next) => {
  try {
    // Get user from auth middleware (already attached to req.userId)
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'email', 'isAdmin', 'organizationId']
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach visibility filter to request for use in routes
    if (user.isAdmin === true) {
      // Admin can see all contacts in their organization
      req.contactFilter = {
        organizationId: user.organizationId
      };
      req.userRole = 'admin';
    } else {
      // Regular users can only see contacts assigned to them
      req.contactFilter = {
        assignedTo: user.id,
        organizationId: user.organizationId
      };
      req.userRole = 'user';
    }

    // Attach user info for reference
    req.currentUser = {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      organizationId: user.organizationId
    };

    next();
  } catch (error) {
    console.error('Contact visibility middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if user can modify a specific contact
const canModifyContact = async (req, res, next) => {
  try {
    const contactId = req.params.id || req.params.contactId;
    const user = req.currentUser || await User.findByPk(req.userId, {
      attributes: ['id', 'isAdmin', 'organizationId']
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const contact = await Contact.findByPk(contactId, {
      attributes: ['id', 'assignedTo', 'organizationId']
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if contact belongs to user's organization
    if (contact.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Admin can modify any contact in their org
    if (user.isAdmin === true) {
      return next();
    }

    // Regular users can only modify contacts assigned to them
    if (contact.assignedTo !== user.id) {
      return res.status(403).json({ error: 'You can only modify contacts assigned to you' });
    }

    next();
  } catch (error) {
    console.error('Modify contact permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware for assigning contacts (admin only)
const canAssignContacts = async (req, res, next) => {
  try {
    const user = req.currentUser || await User.findByPk(req.userId, {
      attributes: ['id', 'isAdmin']
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isAdmin !== true) {
      return res.status(403).json({ error: 'Only administrators can assign contacts' });
    }

    next();
  } catch (error) {
    console.error('Assign contact permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  applyContactVisibility,
  canModifyContact,
  canAssignContacts
};