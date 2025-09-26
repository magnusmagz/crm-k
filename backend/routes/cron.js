const express = require('express');
const router = express.Router();
const automatedReminderService = require('../services/automatedReminders');

// Daily cron job endpoint - to be called by Heroku Scheduler or similar
// This endpoint should be secured with a secret token in production
router.get('/daily-reminder-check', async (req, res) => {
  try {
    // Simple security check - in production, use a proper secret
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    const providedSecret = req.headers['x-cron-secret'] || req.query.secret;

    if (providedSecret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Starting daily automated reminder check...');
    const result = await automatedReminderService.checkUntouchedContacts();

    console.log(`Daily reminder check complete: ${result.remindersCreated} reminders created`);
    res.json({
      success: true,
      message: `Daily check complete. Created ${result.remindersCreated} reminders.`,
      ...result
    });
  } catch (error) {
    console.error('Daily reminder check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run daily reminder check',
      message: error.message
    });
  }
});

// Health check for cron monitoring
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'cron-jobs',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;