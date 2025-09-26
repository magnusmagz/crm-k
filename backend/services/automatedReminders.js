const { Op } = require('sequelize');
const { Contact, Reminder, User, UserProfile, Note, sequelize } = require('../models');

class AutomatedReminderService {
  /**
   * Check for untouched contacts and create reminders
   */
  async checkUntouchedContacts() {
    try {
      console.log('Starting automated reminder check for untouched contacts...');

      // Get all users first, then filter by auto reminders
      const usersWithProfiles = await User.findAll({
        include: [{
          model: UserProfile,
          as: 'profile',
          required: true
        }]
      });

      // Filter users with auto reminders enabled
      const enabledUsers = usersWithProfiles.filter(user =>
        user.profile && user.profile.enableAutoReminders === true
      );

      let totalRemindersCreated = 0;

      for (const user of enabledUsers) {
        const threshold = user.profile.reminderDaysThreshold || 5;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - threshold);

        // Find all contacts for this user
        const contacts = await Contact.findAll({
          where: {
            user_id: user.id
          },
          include: [{
            model: Note,
            as: 'contactNotes',
            attributes: ['created_at'],
            required: false,
            order: [['created_at', 'DESC']],
            limit: 1
          }],
          limit: 100 // Process max 100 contacts per user to avoid overload
        });

        // Filter contacts that haven't been touched (no recent notes)
        const untouchedContacts = contacts.filter(contact => {
          // Get the most recent note date if it exists
          const lastNote = contact.contactNotes && contact.contactNotes.length > 0
            ? contact.contactNotes[0].created_at
            : null;

          // Use the most recent note date as last touched, or creation date if no notes
          const lastTouched = lastNote || contact.created_at;

          // Check if it's been too long since last touch
          return new Date(lastTouched) < thresholdDate;
        });

        for (const contact of untouchedContacts) {
          // Check if reminder already exists for this contact in the last 24 hours
          const existingReminder = await Reminder.findOne({
            where: {
              userId: user.id,
              entityType: 'contact',
              entityId: contact.id,
              title: { [Op.like]: '%hasn\'t been contacted%' },
              createdAt: {
                [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          });

          if (!existingReminder) {
            // Calculate days since last contact (using most recent note or creation date)
            const lastNote = contact.contactNotes && contact.contactNotes.length > 0
              ? contact.contactNotes[0].created_at
              : null;
            const lastContactedDate = lastNote || contact.created_at;
            const daysSince = Math.floor((Date.now() - new Date(lastContactedDate).getTime()) / (1000 * 60 * 60 * 24));

            // Create automated reminder
            const reminder = await Reminder.create({
              userId: user.id,
              title: `${contact.firstName} ${contact.lastName} hasn't been contacted in ${daysSince} days`,
              description: `Follow up with ${contact.firstName} ${contact.lastName}. Last contact was ${daysSince} days ago.`,
              remindAt: new Date(Date.now() + 60 * 60 * 1000), // Remind in 1 hour
              entityType: 'contact',
              entityId: contact.id,
              entityName: `${contact.firstName} ${contact.lastName}`
            });

            totalRemindersCreated++;
            console.log(`Created reminder for ${contact.firstName} ${contact.lastName} (User: ${user.email})`);

            // TODO: Send email notification when email service is ready
            // await emailService.sendReminderNotification(user, contact, reminder, daysSince);
          }
        }
      }

      console.log(`Automated reminder check complete. Created ${totalRemindersCreated} reminders.`);

      // Return detailed results for potential email digest
      return {
        success: true,
        remindersCreated: totalRemindersCreated,
        usersProcessed: enabledUsers.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in automated reminder service:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AutomatedReminderService();