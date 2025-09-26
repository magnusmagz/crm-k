const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const automatedReminderService = require('../services/automatedReminders');

// Run automated reminder check - this would typically be called by a cron job
router.post('/run-automated-reminders', authMiddleware, async (req, res) => {
  try {
    // Optional: Add admin check here
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    const result = await automatedReminderService.checkUntouchedContacts();
    res.json(result);
  } catch (error) {
    console.error('Error running automated reminders:', error);
    res.status(500).json({ error: 'Failed to run automated reminders' });
  }
});

// Manual trigger for testing - creates reminders for current user only
router.post('/check-my-untouched-contacts', authMiddleware, async (req, res) => {
  try {
    const { Contact, Reminder, UserProfile } = require('../models');
    const { Op } = require('sequelize');

    // Get user's profile
    const profile = await UserProfile.findOne({
      where: { user_id: req.user.id }
    });

    const threshold = profile?.reminder_days_threshold || 5;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - threshold);

    // Find untouched contacts
    const untouchedContacts = await Contact.findAll({
      where: {
        user_id: req.user.id,
        [Op.or]: [
          { last_contacted_at: null },
          { last_contacted_at: { [Op.lt]: thresholdDate } }
        ]
      },
      limit: 10
    });

    const remindersCreated = [];

    for (const contact of untouchedContacts) {
      // Check if reminder already exists
      const existingReminder = await Reminder.findOne({
        where: {
          userId: req.user.id,
          entityType: 'contact',
          entityId: contact.id,
          title: { [Op.like]: '%hasn\'t been contacted%' },
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      if (!existingReminder) {
        const lastContactedDate = contact.last_contacted_at || contact.created_at;
        const daysSince = Math.floor((Date.now() - new Date(lastContactedDate).getTime()) / (1000 * 60 * 60 * 24));

        const reminder = await Reminder.create({
          userId: req.user.id,
          title: `${contact.firstName} ${contact.lastName} hasn't been contacted in ${daysSince} days`,
          description: `Follow up with ${contact.firstName} ${contact.lastName}. Last contact was ${daysSince} days ago.`,
          remindAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          entityType: 'contact',
          entityId: contact.id,
          entityName: `${contact.firstName} ${contact.lastName}`
        });

        remindersCreated.push(reminder);
      }
    }

    res.json({
      success: true,
      untouchedCount: untouchedContacts.length,
      remindersCreated: remindersCreated.length,
      threshold: threshold,
      reminders: remindersCreated
    });
  } catch (error) {
    console.error('Error checking untouched contacts:', error);
    res.status(500).json({ error: 'Failed to check untouched contacts' });
  }
});

module.exports = router;