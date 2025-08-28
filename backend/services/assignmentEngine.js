const { Contact, User, UserProfile, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

class AssignmentEngine {
  /**
   * Process incoming lead and assign based on round-robin rules
   */
  async processIncomingLead(contact, organizationId) {
    try {
      console.log(`🎯 Processing lead assignment for ${contact.firstName} ${contact.lastName}`);
      
      // Get active rule for this organization
      const [rule] = await sequelize.query(`
        SELECT * FROM assignment_rules 
        WHERE "organizationId" = :orgId 
        AND "isActive" = true
        ORDER BY priority DESC
        LIMIT 1
      `, {
        type: sequelize.QueryTypes.SELECT,
        replacements: { orgId: organizationId }
      });

      if (!rule) {
        console.log('No active assignment rules found');
        return null;
      }

      // Check if contact matches rule conditions
      if (!this.matchesConditions(contact, rule.conditions)) {
        console.log('Contact does not match rule conditions');
        return null;
      }

      // Get next officer in rotation
      const officer = await this.getNextOfficerInRotation(rule.id, contact.state, rule.requireStateMatch);
      
      if (!officer) {
        console.log('No eligible officers available');
        return null;
      }

      // Assign the contact
      const assignment = await this.assignContactToOfficer(contact, officer, rule.id);
      
      console.log(`✅ Assigned to ${officer.email}`);
      return assignment;
    } catch (error) {
      console.error('Assignment engine error:', error);
      throw error;
    }
  }

  /**
   * Check if contact matches rule conditions
   */
  matchesConditions(contact, conditions) {
    if (!conditions) return true;
    
    const parsedConditions = typeof conditions === 'string' ? JSON.parse(conditions) : conditions;
    
    // Check contact type
    if (parsedConditions.contactType && parsedConditions.contactType !== 'all') {
      if (contact.contactType !== parsedConditions.contactType) {
        return false;
      }
    }

    // Check source
    if (parsedConditions.source && parsedConditions.source !== 'all') {
      if (contact.source !== parsedConditions.source) {
        return false;
      }
    }

    // Check state
    if (parsedConditions.state && parsedConditions.state !== 'all') {
      if (contact.state !== parsedConditions.state) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get next officer in round-robin rotation
   */
  async getNextOfficerInRotation(ruleId, contactState, requireStateMatch) {
    try {
      // Build query based on state matching requirement
      let stateCondition = '';
      let replacements = { ruleId };

      if (requireStateMatch && contactState) {
        // Check both old licensedStates and new state_licenses
        stateCondition = `AND (
          :state = ANY(u."licensedStates") 
          OR EXISTS (
            SELECT 1 FROM user_profiles p 
            WHERE p.user_id = u.id 
            AND p.state_licenses @> :stateLicense::jsonb
          )
        )`;
        replacements.state = contactState;
        replacements.stateLicense = JSON.stringify([{state: contactState}]);
      }

      // Get officers in queue ordered by assignment count and last assignment time
      const officers = await sequelize.query(`
        SELECT 
          u.id, u.email, u."isLoanOfficer", 
          COALESCE(u."licensedStates", ARRAY[]::VARCHAR[]) as "licensedStates",
          p.state_licenses as "stateLicenses",
          q."assignmentCount", q."lastAssignedAt"
        FROM round_robin_queues q
        JOIN users u ON q."userId" = u.id
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE q."ruleId" = :ruleId
        AND q."isActive" = true
        AND u."isLoanOfficer" = true
        ${stateCondition}
        ORDER BY 
          q."assignmentCount" ASC,
          q."lastAssignedAt" ASC NULLS FIRST
        LIMIT 1
      `, {
        type: sequelize.QueryTypes.SELECT,
        replacements
      });

      if (officers.length === 0) {
        return null;
      }

      const officer = officers[0];

      // Update the queue
      await sequelize.query(`
        UPDATE round_robin_queues
        SET 
          "assignmentCount" = "assignmentCount" + 1,
          "lastAssignedAt" = NOW(),
          "updatedAt" = NOW()
        WHERE "ruleId" = :ruleId AND "userId" = :userId
      `, {
        replacements: {
          ruleId,
          userId: officer.id
        }
      });

      return officer;
    } catch (error) {
      console.error('Error getting next officer:', error);
      throw error;
    }
  }

  /**
   * Assign contact to officer and create assignment record
   */
  async assignContactToOfficer(contact, officer, ruleId) {
    try {
      // Update contact
      await contact.update({
        assignedTo: officer.id,
        assignedAt: new Date()
      });

      // Create assignment record
      const assignmentId = uuidv4();
      await sequelize.query(`
        INSERT INTO assignments (
          id, "contactId", "assignedTo", "assignedBy",
          "assignedAt", status, notes, "createdAt", "updatedAt"
        )
        VALUES (
          :id, :contactId, :assignedTo, :assignedBy,
          NOW(), 'pending', :notes, NOW(), NOW()
        )
      `, {
        replacements: {
          id: assignmentId,
          contactId: contact.id,
          assignedTo: officer.id,
          assignedBy: null, // System assignment
          notes: `Auto-assigned via round-robin rule`
        }
      });

      return {
        assignmentId,
        contactId: contact.id,
        officerId: officer.id,
        officerEmail: officer.email
      };
    } catch (error) {
      console.error('Error assigning contact:', error);
      throw error;
    }
  }

  /**
   * Manually assign contact to specific officer
   */
  async manualAssign(contactId, officerId, assignedBy) {
    try {
      const contact = await Contact.findByPk(contactId);
      if (!contact) {
        throw new Error('Contact not found');
      }

      const officer = await User.findByPk(officerId);
      if (!officer) {
        throw new Error('Officer not found');
      }

      // Update contact
      await contact.update({
        assignedTo: officerId,
        assignedAt: new Date()
      });

      // Create assignment record
      const assignmentId = uuidv4();
      await sequelize.query(`
        INSERT INTO assignments (
          id, "contactId", "assignedTo", "assignedBy",
          "assignedAt", status, notes, "createdAt", "updatedAt"
        )
        VALUES (
          :id, :contactId, :assignedTo, :assignedBy,
          NOW(), 'pending', :notes, NOW(), NOW()
        )
      `, {
        replacements: {
          id: assignmentId,
          contactId: contactId,
          assignedTo: officerId,
          assignedBy: assignedBy,
          notes: 'Manual assignment by admin'
        }
      });

      return {
        assignmentId,
        contact,
        officer
      };
    } catch (error) {
      console.error('Error in manual assignment:', error);
      throw error;
    }
  }

  /**
   * Get assignment statistics for dashboard
   */
  async getAssignmentStats(organizationId) {
    try {
      const stats = await sequelize.query(`
        SELECT 
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT CASE WHEN DATE(a."assignedAt") = CURRENT_DATE THEN a.id END) as today_assignments,
          COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_assignments,
          COUNT(DISTINCT CASE WHEN a.status = 'contacted' THEN a.id END) as contacted_assignments,
          COUNT(DISTINCT u.id) as active_officers,
          AVG(CASE 
            WHEN a.status = 'contacted' 
            THEN EXTRACT(EPOCH FROM (a."updatedAt" - a."assignedAt"))/60 
          END) as avg_response_time_minutes
        FROM assignments a
        JOIN users u ON a."assignedTo" = u.id
        JOIN contacts c ON a."contactId" = c.id
        WHERE c."organizationId" = :orgId
        AND a."assignedAt" >= CURRENT_DATE - INTERVAL '30 days'
      `, {
        type: sequelize.QueryTypes.SELECT,
        replacements: { orgId: organizationId }
      });

      // Get officer performance
      const officerStats = await sequelize.query(`
        SELECT 
          u.id,
          u.email,
          COALESCE(p.first_name, SPLIT_PART(u.email, '@', 1)) as "firstName",
          COALESCE(p.last_name, '') as "lastName",
          COUNT(a.id) as "total_assigned",
          COUNT(CASE WHEN a.status = 'contacted' THEN 1 END) as "contacted",
          COUNT(CASE WHEN DATE(a."assignedAt") = CURRENT_DATE THEN 1 END) as "assigned_today"
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        LEFT JOIN assignments a ON u.id = a."assignedTo"
        WHERE u."organizationId" = :orgId
        AND u."isLoanOfficer" = true
        GROUP BY u.id, u.email, p.first_name, p.last_name
        ORDER BY "total_assigned" DESC
      `, {
        type: sequelize.QueryTypes.SELECT,
        replacements: { orgId: organizationId }
      });

      return {
        summary: stats[0] || {
          total_assignments: 0,
          today_assignments: 0,
          pending_assignments: 0,
          contacted_assignments: 0,
          active_officers: 0,
          avg_response_time_minutes: 0
        },
        officers: officerStats || []
      };
    } catch (error) {
      console.error('Error getting assignment stats:', error);
      throw error;
    }
  }

  /**
   * Get unassigned contacts for manual assignment
   */
  async getUnassignedContacts(organizationId) {
    try {
      // Get all users in the organization to fetch their contacts
      const users = await User.findAll({
        where: { organizationId },
        attributes: ['id']
      });
      
      const userIds = users.map(u => u.id);
      
      const contacts = await Contact.findAll({
        where: {
          userId: { [sequelize.Op.in]: userIds },
          assignedTo: null
        },
        order: [['createdAt', 'DESC']],
        limit: 100
      });

      return contacts;
    } catch (error) {
      console.error('Error fetching unassigned contacts:', error);
      throw error;
    }
  }

  /**
   * Reset round-robin counters (admin function)
   */
  async resetRoundRobinCounters(ruleId) {
    try {
      await sequelize.query(`
        UPDATE round_robin_queues
        SET 
          "assignmentCount" = 0,
          "lastAssignedAt" = NULL,
          "updatedAt" = NOW()
        WHERE "ruleId" = :ruleId
      `, {
        replacements: { ruleId }
      });

      console.log('Round-robin counters reset successfully');
      return true;
    } catch (error) {
      console.error('Error resetting counters:', error);
      throw error;
    }
  }
}

module.exports = new AssignmentEngine();