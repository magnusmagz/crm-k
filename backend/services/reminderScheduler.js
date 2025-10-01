/**
 * Reminder Scheduler Service
 *
 * Automatically checks for due reminders and sends push notifications
 * Runs every minute to provide near real-time reminder delivery
 */

const cron = require('node-cron');
const { Reminder } = require('../models');
const { sendToUser } = require('./pushNotificationService');
const { Op } = require('sequelize');

let schedulerRunning = false;

/**
 * Check for due reminders and send push notifications
 */
async function checkAndSendReminders() {
  try {
    const now = new Date();
    console.log(`[Reminder Scheduler] Checking for due reminders at ${now.toISOString()}`);

    // Find all due reminders that haven't been completed
    const dueReminders = await Reminder.findAll({
      where: {
        isCompleted: false,
        remindAt: {
          [Op.lte]: now
        },
        // Only send if we haven't sent in the last 5 minutes (prevent spam)
        lastNotificationSentAt: {
          [Op.or]: [
            null,
            { [Op.lte]: new Date(Date.now() - 5 * 60 * 1000) }
          ]
        }
      },
      limit: 50 // Process max 50 reminders per run
    });

    if (dueReminders.length === 0) {
      console.log('[Reminder Scheduler] No due reminders found');
      return { sent: 0, failed: 0 };
    }

    console.log(`[Reminder Scheduler] Found ${dueReminders.length} due reminder(s)`);

    let totalSent = 0;
    let totalFailed = 0;

    // Process each reminder
    for (const reminder of dueReminders) {
      try {
        // Prepare notification payload
        const payload = {
          title: reminder.title,
          body: reminder.entityName
            ? `Reminder for ${reminder.entityName}`
            : reminder.description || 'You have a reminder due',
          icon: '/logo192.png',
          badge: '/logo192.png',
          url: '/reminders',
          data: {
            reminderId: reminder.id,
            entityType: reminder.entityType,
            entityId: reminder.entityId,
            timestamp: Date.now()
          }
        };

        // Send push notification to the user
        const result = await sendToUser(reminder.userId, payload);

        // Update reminder to record that we sent the notification
        await reminder.update({
          lastNotificationSentAt: new Date()
        });

        totalSent += result.sent;
        totalFailed += result.failed;

        console.log(`[Reminder Scheduler] Sent notification for: "${reminder.title}" (User: ${reminder.userId})`);

      } catch (error) {
        console.error(`[Reminder Scheduler] Error processing reminder ${reminder.id}:`, error);
        totalFailed++;
      }
    }

    console.log(`[Reminder Scheduler] Completed: ${totalSent} sent, ${totalFailed} failed`);
    return { sent: totalSent, failed: totalFailed };

  } catch (error) {
    console.error('[Reminder Scheduler] Error in checkAndSendReminders:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Start the reminder scheduler
 * Runs every minute (cron: '* * * * *')
 */
function startScheduler() {
  if (schedulerRunning) {
    console.log('[Reminder Scheduler] Already running');
    return;
  }

  console.log('[Reminder Scheduler] Starting reminder scheduler (runs every minute)');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    await checkAndSendReminders();
  });

  // Also run immediately on startup (after 10 second delay)
  setTimeout(async () => {
    console.log('[Reminder Scheduler] Running initial check...');
    await checkAndSendReminders();
  }, 10000);

  schedulerRunning = true;
  console.log('✓ Reminder scheduler started successfully');
}

/**
 * Manually trigger a check (useful for testing)
 */
async function triggerCheck() {
  console.log('[Reminder Scheduler] Manual check triggered');
  return await checkAndSendReminders();
}

module.exports = {
  startScheduler,
  triggerCheck,
  checkAndSendReminders
};
