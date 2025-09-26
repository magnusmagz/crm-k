const { Op } = require('sequelize');
const { Contact, Reminder, User, UserProfile } = require('../models');

class AutomatedReminderService {
  /**
   * Check for untouched contacts and create reminders
   */
  async checkUntouchedContacts() {
    try {
      console.log('Starting automated reminder check for untouched contacts...');

      // Get all users with auto reminders enabled
      const usersWithProfiles = await User.findAll({
        include: [{
          model: UserProfile,
          as: 'profile',
          where: {
            enable_auto_reminders: true
          }
        }]
      });

      let totalRemindersCreated = 0;

      for (const user of usersWithProfiles) {
        const threshold = user.profile.reminder_days_threshold || 5;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - threshold);

        // Find untouched contacts for this user
        const untouchedContacts = await Contact.findAll({
          where: {
            user_id: user.id,
            [Op.or]: [
              { last_contacted_at: null },
              { last_contacted_at: { [Op.lt]: thresholdDate } }
            ]
          },
          limit: 50 // Process max 50 contacts per user to avoid overload
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
            // Calculate days since last contact
            const lastContactedDate = contact.last_contacted_at || contact.created_at;
            const daysSince = Math.floor((Date.now() - new Date(lastContactedDate).getTime()) / (1000 * 60 * 60 * 24));

            // Create automated reminder
            await Reminder.create({
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
          }
        }
      }

      console.log(`Automated reminder check complete. Created ${totalRemindersCreated} reminders.`);
      return { success: true, remindersCreated: totalRemindersCreated };
    } catch (error) {
      console.error('Error in automated reminder service:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update last_contacted_at when a contact is touched
   */
  async touchContact(contactId, userId) {
    try {
      await Contact.update(
        { last_contacted_at: new Date() },
        {
          where: {
            id: contactId,
            user_id: userId
          }
        }
      );
      return { success: true };
    } catch (error) {
      console.error('Error updating contact touch:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch update contact touch times for multiple contacts
   */
  async touchContacts(contactIds, userId) {
    try {
      await Contact.update(
        { last_contacted_at: new Date() },
        {
          where: {
            id: { [Op.in]: contactIds },
            user_id: userId
          }
        }
      );
      return { success: true };
    } catch (error) {
      console.error('Error batch updating contact touches:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AutomatedReminderService();