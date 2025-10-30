const express = require('express');
const { Op } = require('sequelize');
const { sequelize, EmailSend, EmailEvent, EmailLink, Contact, EmailSuppression, Note } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get email analytics overview
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.createdAt = { [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, [Op.lte]: new Date(endDate) };
    }
    
    // Get total emails sent
    const totalSent = await EmailSend.count({
      where: { userId, ...dateFilter }
    });
    
    // Get delivery stats
    const deliveryStats = await EmailSend.findAll({
      where: { userId, ...dateFilter },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    // Get engagement stats
    const engagementStats = await EmailSend.findOne({
      where: { userId, ...dateFilter },
      attributes: [
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN opened_at IS NOT NULL THEN 1 END')), 'totalOpened'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN clicked_at IS NOT NULL THEN 1 END')), 'totalClicked'],
        [sequelize.fn('AVG', sequelize.col('open_count')), 'avgOpenCount'],
        [sequelize.fn('AVG', sequelize.col('click_count')), 'avgClickCount']
      ]
    });
    
    // Get bounce and complaint stats
    const bounceStats = await EmailEvent.count({
      where: {
        eventType: 'bounce',
        createdAt: dateFilter.createdAt || {}
      },
      include: [{
        model: EmailSend,
        where: { userId },
        attributes: []
      }]
    });
    
    const complaintStats = await EmailEvent.count({
      where: {
        eventType: 'spam_complaint',
        createdAt: dateFilter.createdAt || {}
      },
      include: [{
        model: EmailSend,
        where: { userId },
        attributes: []
      }]
    });
    
    // Get unsubscribe stats
    const unsubscribeFilter = { userId };
    if (dateFilter.createdAt) {
      unsubscribeFilter.createdAt = dateFilter.createdAt;
    }
    
    const unsubscribeStats = await EmailSuppression.findAll({
      where: unsubscribeFilter,
      attributes: [
        'reason',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['reason']
    });
    
    const totalUnsubscribes = await EmailSuppression.count({
      where: unsubscribeFilter
    });
    
    // Calculate rates
    const openRate = totalSent > 0 ? (engagementStats.dataValues.totalOpened / totalSent * 100).toFixed(2) : 0;
    const clickRate = totalSent > 0 ? (engagementStats.dataValues.totalClicked / totalSent * 100).toFixed(2) : 0;
    const bounceRate = totalSent > 0 ? (bounceStats / totalSent * 100).toFixed(2) : 0;
    const complaintRate = totalSent > 0 ? (complaintStats / totalSent * 100).toFixed(2) : 0;
    const unsubscribeRate = totalSent > 0 ? (totalUnsubscribes / totalSent * 100).toFixed(2) : 0;
    
    res.json({
      totalSent,
      deliveryStats: deliveryStats.reduce((acc, stat) => {
        acc[stat.status] = stat.dataValues.count;
        return acc;
      }, {}),
      engagement: {
        totalOpened: engagementStats.dataValues.totalOpened || 0,
        totalClicked: engagementStats.dataValues.totalClicked || 0,
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        avgOpenCount: parseFloat(engagementStats.dataValues.avgOpenCount || 0).toFixed(2),
        avgClickCount: parseFloat(engagementStats.dataValues.avgClickCount || 0).toFixed(2)
      },
      quality: {
        bounceCount: bounceStats,
        bounceRate: parseFloat(bounceRate),
        complaintCount: complaintStats,
        complaintRate: parseFloat(complaintRate)
      },
      unsubscribes: {
        totalUnsubscribes,
        unsubscribeRate: parseFloat(unsubscribeRate),
        byReason: unsubscribeStats.reduce((acc, stat) => {
          acc[stat.reason] = parseInt(stat.dataValues.count);
          return acc;
        }, {})
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

// Get contact-specific email analytics
router.get('/contact/:contactId', authMiddleware, async (req, res) => {
  try {
    const { contactId } = req.params;
    const userId = req.user.id;
    
    // Verify contact belongs to user
    const contact = await Contact.findOne({
      where: { id: contactId, userId }
    });
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    // Get all emails sent to this contact
    const emails = await EmailSend.findAll({
      where: { contactId, userId },
      attributes: [
        'id',
        'subject',
        'status',
        'createdAt',
        'openedAt',
        'clickedAt',
        'openCount',
        'clickCount',
        'bouncedAt',
        'unsubscribedAt'
      ],
      include: [{
        model: EmailEvent,
        as: 'events',
        attributes: ['eventType', 'occurredAt']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    // Calculate engagement score (0-100)
    const totalEmails = emails.length;
    const openedEmails = emails.filter(e => e.openedAt).length;
    const clickedEmails = emails.filter(e => e.clickedAt).length;
    
    let engagementScore = 0;
    if (totalEmails > 0) {
      const openWeight = 0.4;
      const clickWeight = 0.6;
      engagementScore = Math.round(
        ((openedEmails / totalEmails) * openWeight + 
         (clickedEmails / totalEmails) * clickWeight) * 100
      );
    }
    
    res.json({
      contact: {
        id: contact.id,
        email: contact.email,
        name: `${contact.firstName} ${contact.lastName}`.trim()
      },
      summary: {
        totalEmails,
        openedEmails,
        clickedEmails,
        engagementScore,
        lastEmailSent: emails[0]?.createdAt || null,
        unsubscribed: emails.some(e => e.unsubscribedAt)
      },
      emails: emails.map(email => ({
        id: email.id,
        subject: email.subject,
        status: email.status,
        sentAt: email.createdAt,
        engagement: {
          opened: !!email.openedAt,
          clicked: !!email.clickedAt,
          openCount: email.openCount,
          clickCount: email.clickCount
        },
        events: email.events.map(e => ({
          type: e.eventType,
          occurredAt: e.occurredAt
        }))
      }))
    });
    
  } catch (error) {
    console.error('Error fetching contact analytics:', error);
    res.status(500).json({ message: 'Error fetching contact analytics' });
  }
});

// Get campaign performance over time
router.get('/campaign-performance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '7d' } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    let groupBy = 'day';
    
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        groupBy = 'hour';
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        groupBy = 'day';
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        groupBy = 'day';
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        groupBy = 'week';
        break;
    }
    
    // Get time series data
    const timeSeriesData = await sequelize.query(`
      SELECT 
        DATE_TRUNC('${groupBy}', created_at) as period,
        COUNT(*) as sent,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked,
        COUNT(CASE WHEN bounced_at IS NOT NULL THEN 1 END) as bounced
      FROM email_sends
      WHERE user_id = :userId
        AND created_at >= :startDate
        AND created_at <= :endDate
      GROUP BY DATE_TRUNC('${groupBy}', created_at)
      ORDER BY period ASC
    `, {
      replacements: { userId, startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json({
      period,
      startDate,
      endDate,
      data: timeSeriesData.map(row => ({
        period: row.period,
        sent: parseInt(row.sent),
        opened: parseInt(row.opened),
        clicked: parseInt(row.clicked),
        bounced: parseInt(row.bounced),
        openRate: row.sent > 0 ? parseFloat((row.opened / row.sent * 100).toFixed(2)) : 0,
        clickRate: row.sent > 0 ? parseFloat((row.clicked / row.sent * 100).toFixed(2)) : 0
      }))
    });
    
  } catch (error) {
    console.error('Error fetching campaign performance:', error);
    res.status(500).json({ message: 'Error fetching campaign performance' });
  }
});

// Get link click analytics
router.get('/links', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;
    
    // Get most clicked links
    const topLinks = await EmailLink.findAll({
      attributes: [
        'originalUrl',
        [sequelize.fn('SUM', sequelize.col('clickCount')), 'totalClicks'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'emailCount']
      ],
      include: [{
        model: EmailSend,
        attributes: [],
        where: { userId }
      }],
      group: ['originalUrl'],
      order: [[sequelize.literal('totalClicks'), 'DESC']],
      limit: parseInt(limit)
    });
    
    res.json({
      links: topLinks.map(link => ({
        url: link.originalUrl,
        totalClicks: parseInt(link.dataValues.totalClicks),
        emailCount: parseInt(link.dataValues.emailCount),
        avgClicksPerEmail: parseFloat((link.dataValues.totalClicks / link.dataValues.emailCount).toFixed(2))
      }))
    });
    
  } catch (error) {
    console.error('Error fetching link analytics:', error);
    res.status(500).json({ message: 'Error fetching link analytics' });
  }
});

// Get unsubscribe analytics
router.get('/unsubscribes', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit = 50 } = req.query;
    
    // Build date filter
    const whereClause = { userId };
    if (startDate) {
      whereClause.createdAt = { [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: new Date(endDate) };
    }
    
    // Get unsubscribe stats by reason
    const reasonStats = await EmailSuppression.findAll({
      where: whereClause,
      attributes: [
        'reason',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['reason'],
      order: [[sequelize.literal('count'), 'DESC']]
    });
    
    // Get unsubscribe trend over time
    const trendData = await sequelize.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as unsubscribes,
        reason
      FROM email_suppressions
      WHERE user_id = :userId
        ${startDate ? 'AND created_at >= :startDate' : ''}
        ${endDate ? 'AND created_at <= :endDate' : ''}
      GROUP BY DATE_TRUNC('day', created_at), reason
      ORDER BY date ASC
    `, {
      replacements: { 
        userId, 
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) })
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get recent unsubscribes with contact info
    const recentUnsubscribes = await EmailSuppression.findAll({
      where: whereClause,
      attributes: ['id', 'email', 'reason', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });
    
    // Get total count
    const totalUnsubscribes = await EmailSuppression.count({
      where: whereClause
    });
    
    res.json({
      summary: {
        totalUnsubscribes,
        byReason: reasonStats.reduce((acc, stat) => {
          acc[stat.reason] = parseInt(stat.dataValues.count);
          return acc;
        }, {})
      },
      trend: trendData.map(row => ({
        date: row.date,
        unsubscribes: parseInt(row.unsubscribes),
        reason: row.reason
      })),
      recent: recentUnsubscribes.map(unsub => ({
        id: unsub.id,
        email: unsub.email,
        reason: unsub.reason,
        unsubscribedAt: unsub.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error fetching unsubscribe analytics:', error);
    res.status(500).json({ message: 'Error fetching unsubscribe analytics' });
  }
});

// Get dashboard metrics
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's weekly activity goal
    const { User } = require('../models');
    const user = await User.findByPk(userId, {
      attributes: ['weeklyActivityGoal']
    });
    const weeklyGoal = user?.weeklyActivityGoal || 50;

    // Get total contacts
    const totalContacts = await Contact.count({
      where: { userId }
    });

    // Get contact growth over last 30 days (grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const contactGrowth = await sequelize.query(`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM contacts
      WHERE user_id = :userId
        AND created_at >= :startDate
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `, {
      replacements: { userId, startDate: thirtyDaysAgo },
      type: sequelize.QueryTypes.SELECT
    });

    // Get activities this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const activitiesThisWeek = await Note.count({
      where: {
        userId,
        createdAt: { [Op.gte]: oneWeekAgo }
      }
    });

    // Get activity breakdown (parse activities array from notes)
    const activityBreakdown = await sequelize.query(`
      SELECT
        activity::text as activity,
        COUNT(*) as count
      FROM notes,
      LATERAL jsonb_array_elements_text(activities::jsonb) as activity
      WHERE user_id = :userId
        AND created_at >= :startDate
      GROUP BY activity
      ORDER BY count DESC
    `, {
      replacements: { userId, startDate: oneWeekAgo },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      contacts: {
        total: totalContacts,
        growth: contactGrowth.map(row => ({
          date: row.date,
          count: parseInt(row.count)
        }))
      },
      activities: {
        thisWeek: activitiesThisWeek,
        weeklyGoal: weeklyGoal,
        breakdown: activityBreakdown.map(row => ({
          type: row.activity,
          count: parseInt(row.count)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ message: 'Error fetching dashboard analytics' });
  }
});

// Get detailed activity reports
router.get('/activities', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, activityType } = req.query;

    // Build date filter
    const dateFilter = { userId };
    if (startDate) {
      dateFilter.createdAt = { [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, [Op.lte]: new Date(endDate) };
    }

    // Get total activity counts by type
    let activityQuery = `
      SELECT
        activity::text as activity,
        COUNT(*) as count
      FROM notes,
      LATERAL jsonb_array_elements_text(activities::jsonb) as activity
      WHERE user_id = :userId
    `;

    const replacements = { userId };

    if (startDate) {
      activityQuery += ' AND created_at >= :startDate';
      replacements.startDate = new Date(startDate);
    }
    if (endDate) {
      activityQuery += ' AND created_at <= :endDate';
      replacements.endDate = new Date(endDate);
    }
    if (activityType) {
      activityQuery += ' AND activity = :activityType';
      replacements.activityType = activityType;
    }

    activityQuery += ' GROUP BY activity ORDER BY count DESC';

    const activityCounts = await sequelize.query(activityQuery, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // Get activity timeline (daily breakdown)
    let timelineQuery = `
      SELECT
        DATE_TRUNC('day', n.created_at) as date,
        activity::text as activity,
        COUNT(*) as count
      FROM notes n,
      LATERAL jsonb_array_elements_text(n.activities::jsonb) as activity
      WHERE n.user_id = :userId
    `;

    if (startDate) {
      timelineQuery += ' AND n.created_at >= :startDate';
    }
    if (endDate) {
      timelineQuery += ' AND n.created_at <= :endDate';
    }
    if (activityType) {
      timelineQuery += ' AND activity = :activityType';
    }

    timelineQuery += ' GROUP BY DATE_TRUNC(\'day\', n.created_at), activity ORDER BY date ASC, activity';

    const timeline = await sequelize.query(timelineQuery, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // Get top contacts by activity
    let topContactsQuery = `
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        COUNT(DISTINCT n.id) as activity_count,
        array_agg(DISTINCT activity::text) as activities
      FROM notes n
      JOIN contacts c ON n.contact_id = c.id
      CROSS JOIN LATERAL jsonb_array_elements_text(n.activities::jsonb) as activity
      WHERE n.user_id = :userId
        AND n.contact_id IS NOT NULL
    `;

    if (startDate) {
      topContactsQuery += ' AND n.created_at >= :startDate';
    }
    if (endDate) {
      topContactsQuery += ' AND n.created_at <= :endDate';
    }
    if (activityType) {
      topContactsQuery += ' AND activity = :activityType';
    }

    topContactsQuery += ' GROUP BY c.id, c.first_name, c.last_name, c.email ORDER BY activity_count DESC LIMIT 10';

    const topContacts = await sequelize.query(topContactsQuery, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // Get recent activities with contact info
    const recentActivities = await Note.findAll({
      where: dateFilter,
      include: [{
        model: Contact,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: ['id', 'content', 'activities', 'createdAt', 'contactId']
    });

    // Calculate total activities
    const totalActivities = activityCounts.reduce((sum, item) => sum + parseInt(item.count), 0);

    res.json({
      summary: {
        totalActivities,
        byType: activityCounts.map(row => ({
          type: row.activity,
          count: parseInt(row.count),
          percentage: totalActivities > 0 ? ((parseInt(row.count) / totalActivities) * 100).toFixed(1) : 0
        }))
      },
      timeline: timeline.map(row => ({
        date: row.date,
        activityType: row.activity,
        count: parseInt(row.count)
      })),
      topContacts: topContacts.map(row => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`.trim() || row.email,
        email: row.email,
        activityCount: parseInt(row.activity_count),
        activities: row.activities
      })),
      recent: recentActivities.map(note => ({
        id: note.id,
        content: note.content,
        activities: note.activities,
        createdAt: note.createdAt,
        contact: note.Contact ? {
          id: note.Contact.id,
          name: `${note.Contact.firstName} ${note.Contact.lastName}`.trim() || note.Contact.email,
          email: note.Contact.email
        } : null
      }))
    });

  } catch (error) {
    console.error('Error fetching activity reports:', error);
    res.status(500).json({ message: 'Error fetching activity reports' });
  }
});

// Update weekly activity goal
router.put('/weekly-goal', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal } = req.body;

    // Validate goal
    if (!goal || typeof goal !== 'number' || goal < 1 || goal > 1000) {
      return res.status(400).json({ message: 'Goal must be a number between 1 and 1000' });
    }

    // Update user's goal
    const { User } = require('../models');
    await User.update(
      { weeklyActivityGoal: goal },
      { where: { id: userId } }
    );

    res.json({
      message: 'Weekly activity goal updated successfully',
      weeklyGoal: goal
    });

  } catch (error) {
    console.error('Error updating weekly activity goal:', error);
    res.status(500).json({ message: 'Error updating goal' });
  }
});

module.exports = router;