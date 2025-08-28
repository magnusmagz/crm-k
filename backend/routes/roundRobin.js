const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { canAssignContacts } = require('../middleware/contactVisibility');
const assignmentEngine = require('../services/assignmentEngine');
const { sequelize, User, Contact } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Round-Robin API Routes
 * All routes require authentication
 */

// Get assignment dashboard stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const stats = await assignmentEngine.getAssignmentStats(user.organizationId);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get unassigned contacts (admin only)
router.get('/unassigned', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if admin
    if (user.isAdmin !== true) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const contacts = await assignmentEngine.getUnassignedContacts(user.organizationId);
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching unassigned contacts:', error);
    res.status(500).json({ error: 'Failed to fetch unassigned contacts' });
  }
});

// Manually assign contacts (admin only)
router.post('/assign', authMiddleware, async (req, res) => {
  try {
    const { contactIds, officerId } = req.body;
    const user = req.user;
    
    // Check if admin
    if (user.isAdmin !== true) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds array required' });
    }

    if (!officerId) {
      return res.status(400).json({ error: 'officerId required' });
    }

    // Verify officer exists and is in same org
    const officer = await User.findOne({
      where: {
        id: officerId,
        organizationId: user.organizationId,
        isLoanOfficer: true
      }
    });

    if (!officer) {
      return res.status(404).json({ error: 'Officer not found' });
    }

    const results = [];
    for (const contactId of contactIds) {
      try {
        const result = await assignmentEngine.manualAssign(
          contactId,
          officerId,
          req.user.id
        );
        results.push({ success: true, contactId, ...result });
      } catch (err) {
        results.push({ success: false, contactId, error: err.message });
      }
    }

    res.json({
      message: `Assigned ${results.filter(r => r.success).length} of ${contactIds.length} contacts`,
      results
    });
  } catch (error) {
    console.error('Error in manual assignment:', error);
    res.status(500).json({ error: 'Failed to assign contacts' });
  }
});

// Get assignment history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0,
      officerId = null,
      dateFrom = null,
      dateTo = null 
    } = req.query;
    
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let whereClause = 'WHERE c."organizationId" = :orgId';
    const replacements = { 
      orgId: user.organizationId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    // Non-admins can only see their own assignments
    if (user.isAdmin !== true) {
      whereClause += ' AND a."assignedTo" = :userId';
      replacements.userId = req.user.id;
    } else if (officerId) {
      whereClause += ' AND a."assignedTo" = :officerId';
      replacements.officerId = officerId;
    }

    if (dateFrom) {
      whereClause += ' AND a."assignedAt" >= :dateFrom';
      replacements.dateFrom = dateFrom;
    }

    if (dateTo) {
      whereClause += ' AND a."assignedAt" <= :dateTo';
      replacements.dateTo = dateTo;
    }

    const history = await sequelize.query(`
      SELECT 
        a.id,
        a."contactId",
        a."assignedTo",
        a."assignedBy",
        a."assignedAt",
        a.status,
        a.notes,
        c."first_name" as "firstName",
        c."last_name" as "lastName",
        c.email as contact_email,
        c.phone,
        c.source,
        c.state,
        u.email as officer_email,
        assigner.email as assigner_email
      FROM assignments a
      JOIN contacts c ON a."contactId" = c.id
      JOIN users u ON a."assignedTo" = u.id
      LEFT JOIN users assigner ON a."assignedBy" = assigner.id
      ${whereClause}
      ORDER BY a."assignedAt" DESC
      LIMIT :limit OFFSET :offset
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements
    });

    // Get total count
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM assignments a
      JOIN contacts c ON a."contactId" = c.id
      ${whereClause}
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements
    });

    res.json({
      history,
      total: parseInt(countResult.total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching assignment history:', error);
    res.status(500).json({ error: 'Failed to fetch assignment history' });
  }
});

// Get assignment rules (admin only)
router.get('/rules', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.isAdmin !== true) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const rules = await sequelize.query(`
      SELECT 
        r.*,
        COUNT(DISTINCT q."userId") as officer_count
      FROM assignment_rules r
      LEFT JOIN round_robin_queues q ON r.id = q."ruleId"
      WHERE r."organizationId" = :orgId
      GROUP BY r.id
      ORDER BY r.priority DESC, r."createdAt" DESC
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { orgId: user.organizationId }
    });

    res.json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// Create new assignment rule (admin only)
router.post('/rules', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.isAdmin !== true) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      name,
      conditions = {},
      priority = 100,
      assignmentMethod = 'round_robin',
      requireStateMatch = false,
      officerIds = []
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Rule name required' });
    }

    const ruleId = uuidv4();

    // Create rule
    await sequelize.query(`
      INSERT INTO assignment_rules (
        id, "organizationId", name, conditions, "isActive",
        priority, "assignmentMethod", "requireStateMatch", 
        "createdAt", "updatedAt"
      )
      VALUES (
        :id, :orgId, :name, :conditions, true,
        :priority, :assignmentMethod, :requireStateMatch,
        NOW(), NOW()
      )
    `, {
      replacements: {
        id: ruleId,
        orgId: user.organizationId,
        name,
        conditions: JSON.stringify(conditions),
        priority,
        assignmentMethod,
        requireStateMatch
      }
    });

    // Add officers to queue
    if (officerIds.length > 0) {
      for (const officerId of officerIds) {
        await sequelize.query(`
          INSERT INTO round_robin_queues (
            id, "ruleId", "userId", "assignmentCount", 
            "isActive", "createdAt", "updatedAt"
          )
          VALUES (
            :id, :ruleId, :userId, 0, true, NOW(), NOW()
          )
        `, {
          replacements: {
            id: uuidv4(),
            ruleId,
            userId: officerId
          }
        });
      }
    }

    res.json({
      message: 'Rule created successfully',
      ruleId
    });
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// Toggle rule active status (admin only)
router.put('/rules/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.isAdmin !== true) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await sequelize.query(`
      UPDATE assignment_rules
      SET 
        "isActive" = NOT "isActive",
        "updatedAt" = NOW()
      WHERE id = :ruleId
      AND "organizationId" = :orgId
    `, {
      replacements: {
        ruleId: req.params.id,
        orgId: user.organizationId
      }
    });

    res.json({ message: 'Rule status toggled' });
  } catch (error) {
    console.error('Error toggling rule:', error);
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

// Get data for manual assignment page (unassigned contacts + officers)
router.get('/manual-assignment', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if admin
    if (user.isAdmin !== true) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get unassigned contacts
    const contacts = await assignmentEngine.getUnassignedContacts(user.organizationId);
    
    // Get available officers
    const officers = await sequelize.query(`
      SELECT 
        u.id,
        u.email,
        u."licensedStates",
        COALESCE(p.first_name, SPLIT_PART(u.email, '@', 1)) as "firstName",
        COALESCE(p.last_name, '') as "lastName",
        COUNT(DISTINCT c.id) as active_contacts,
        COUNT(DISTINCT a.id) as total_assignments
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN contacts c ON u.id = c."assignedTo"
      LEFT JOIN assignments a ON u.id = a."assignedTo"
      WHERE u."organizationId" = :orgId
      AND u."isLoanOfficer" = true
      GROUP BY u.id, u.email, u."licensedStates", p.first_name, p.last_name
      ORDER BY u.email
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { orgId: user.organizationId }
    });

    res.json({
      contacts,
      officers
    });
  } catch (error) {
    console.error('Error fetching manual assignment data:', error);
    res.status(500).json({ error: 'Failed to fetch assignment data' });
  }
});

// Get available officers for assignment
router.get('/officers', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    const officers = await sequelize.query(`
      SELECT 
        u.id,
        u.email,
        u."licensedStates",
        COALESCE(p.first_name, SPLIT_PART(u.email, '@', 1)) as "firstName",
        COALESCE(p.last_name, '') as "lastName",
        COUNT(DISTINCT c.id) as active_contacts,
        COUNT(DISTINCT a.id) as total_assignments
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN contacts c ON u.id = c."assignedTo"
      LEFT JOIN assignments a ON u.id = a."assignedTo"
      WHERE u."organizationId" = :orgId
      AND u."isLoanOfficer" = true
      GROUP BY u.id, u.email, u."licensedStates", p.first_name, p.last_name
      ORDER BY u.email
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { orgId: user.organizationId }
    });

    res.json(officers);
  } catch (error) {
    console.error('Error fetching officers:', error);
    res.status(500).json({ error: 'Failed to fetch officers' });
  }
});

// Reset round-robin counters (admin only)
router.post('/rules/:id/reset', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.isAdmin !== true) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await assignmentEngine.resetRoundRobinCounters(req.params.id);
    
    res.json({ message: 'Counters reset successfully' });
  } catch (error) {
    console.error('Error resetting counters:', error);
    res.status(500).json({ error: 'Failed to reset counters' });
  }
});

module.exports = router;