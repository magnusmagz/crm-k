const express = require('express');
const { Op } = require('sequelize');
const { sequelize, EmailSend, EmailEvent, EmailLink, Contact } = require('../models');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

// Get email analytics overview
router.get('/overview', authenticate, async (req, res) => {
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
    
    // Calculate rates
    const openRate = totalSent > 0 ? (engagementStats.dataValues.totalOpened / totalSent * 100).toFixed(2) : 0;
    const clickRate = totalSent > 0 ? (engagementStats.dataValues.totalClicked / totalSent * 100).toFixed(2) : 0;
    const bounceRate = totalSent > 0 ? (bounceStats / totalSent * 100).toFixed(2) : 0;
    const complaintRate = totalSent > 0 ? (complaintStats / totalSent * 100).toFixed(2) : 0;
    
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
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

// Get contact-specific email analytics
router.get('/contact/:contactId', authenticate, async (req, res) => {
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
router.get('/campaign-performance', authenticate, async (req, res) => {
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
router.get('/links', authenticate, async (req, res) => {
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

module.exports = router;