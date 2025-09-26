const automatedReminderService = require('../services/automatedReminders');

/**
 * Middleware to automatically update contact touch time on certain activities
 */
const touchContactMiddleware = (activityType = 'generic') => {
  return async (req, res, next) => {
    // Save original send function
    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.json to touch contact after successful response
    res.json = function(data) {
      // Only touch on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const contactId = req.params.id || req.params.contactId || req.body?.contactId;
        const userId = req.user?.id;

        if (contactId && userId) {
          // Touch contact asynchronously (don't block response)
          automatedReminderService.touchContact(contactId, userId)
            .then(() => console.log(`Contact ${contactId} touched via ${activityType}`))
            .catch(err => console.error('Failed to touch contact:', err));
        }

        // For bulk operations
        const contactIds = req.body?.contactIds;
        if (contactIds && Array.isArray(contactIds) && userId) {
          automatedReminderService.touchContacts(contactIds, userId)
            .then(() => console.log(`${contactIds.length} contacts touched via ${activityType}`))
            .catch(err => console.error('Failed to touch contacts:', err));
        }
      }

      // Call original json function
      return originalJson.call(this, data);
    };

    // Override res.send for non-JSON responses
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const contactId = req.params.id || req.params.contactId || req.body?.contactId;
        const userId = req.user?.id;

        if (contactId && userId) {
          automatedReminderService.touchContact(contactId, userId)
            .then(() => console.log(`Contact ${contactId} touched via ${activityType}`))
            .catch(err => console.error('Failed to touch contact:', err));
        }
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

module.exports = { touchContactMiddleware };