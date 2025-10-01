/**
 * Migration: Add lastNotificationSentAt to reminders table
 *
 * This field tracks when we last sent a push notification for this reminder
 * to prevent duplicate/spam notifications
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('reminders', 'last_notification_sent_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of when push notification was last sent for this reminder'
    });

    console.log('✓ Added last_notification_sent_at column to reminders table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('reminders', 'last_notification_sent_at');
    console.log('✓ Removed last_notification_sent_at column from reminders table');
  }
};
