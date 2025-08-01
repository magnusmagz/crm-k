const express = require('express');
const { EmailSend, EmailEvent, EmailSuppression } = require('../models');

const router = express.Router();

// Postmark webhook handler
router.post('/postmark', async (req, res) => {
  try {
    // Postmark can send single event or array of events
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const event of events) {
      try {
        const { RecordType, MessageID, Metadata } = event;
        
        // Find email send by Postmark message ID or tracking ID from metadata
        let emailSend;
        if (MessageID) {
          emailSend = await EmailSend.findOne({ 
            where: { postmarkMessageId: MessageID } 
          });
        } else if (Metadata?.trackingId) {
          emailSend = await EmailSend.findOne({ 
            where: { trackingId: Metadata.trackingId } 
          });
        }
        
        if (!emailSend) {
          console.warn(`Email record not found for event: ${RecordType}, MessageID: ${MessageID}`);
          continue;
        }
        
        // Process different event types
        switch (RecordType) {
          case 'Delivery':
            await emailSend.update({ status: 'delivered' });
            await EmailEvent.create({
              emailSendId: emailSend.id,
              eventType: 'delivery',
              eventData: event,
              occurredAt: new Date(event.DeliveredAt)
            });
            break;
            
          case 'Bounce':
            await emailSend.update({ 
              status: 'bounced',
              bouncedAt: new Date(event.BouncedAt)
            });
            
            await EmailEvent.create({
              emailSendId: emailSend.id,
              eventType: 'bounce',
              eventData: {
                type: event.Type,
                typeCode: event.TypeCode,
                description: event.Description,
                details: event.Details,
                tag: event.Tag,
                messageStream: event.MessageStream
              },
              occurredAt: new Date(event.BouncedAt)
            });
            
            // Add hard bounces to suppression list
            if (event.Type === 'HardBounce') {
              await EmailSuppression.findOrCreate({
                where: { email: event.Email.toLowerCase() },
                defaults: {
                  email: event.Email.toLowerCase(),
                  reason: 'hard_bounce'
                }
              });
            }
            break;
            
          case 'SpamComplaint':
            await EmailEvent.create({
              emailSendId: emailSend.id,
              eventType: 'spam_complaint',
              eventData: event,
              occurredAt: new Date(event.BouncedAt)
            });
            
            // Add to suppression list
            await EmailSuppression.findOrCreate({
              where: { email: event.Email.toLowerCase() },
              defaults: {
                email: event.Email.toLowerCase(),
                reason: 'spam_complaint'
              }
            });
            break;
            
          case 'Open':
            // Postmark's own open tracking (if enabled)
            if (!emailSend.openedAt) {
              await emailSend.update({ 
                openedAt: new Date(event.ReceivedAt),
                lastOpenedAt: new Date(event.ReceivedAt),
                openCount: (emailSend.openCount || 0) + 1
              });
            }
            
            await EmailEvent.create({
              emailSendId: emailSend.id,
              eventType: 'open',
              eventData: {
                client: event.Client,
                os: event.OS,
                platform: event.Platform,
                userAgent: event.UserAgent,
                geo: event.Geo
              },
              ipAddress: event.Geo?.IP,
              userAgent: event.UserAgent,
              occurredAt: new Date(event.ReceivedAt)
            });
            break;
            
          case 'Click':
            // Postmark's own click tracking (if enabled)
            if (!emailSend.clickedAt) {
              await emailSend.update({ 
                clickedAt: new Date(event.ReceivedAt),
                clickCount: (emailSend.clickCount || 0) + 1
              });
            }
            
            await EmailEvent.create({
              emailSendId: emailSend.id,
              eventType: 'click',
              eventData: {
                link: event.OriginalLink,
                client: event.Client,
                os: event.OS,
                platform: event.Platform,
                userAgent: event.UserAgent,
                geo: event.Geo
              },
              ipAddress: event.Geo?.IP,
              userAgent: event.UserAgent,
              occurredAt: new Date(event.ReceivedAt)
            });
            break;
            
          case 'SubscriptionChange':
            // Handle unsubscribes through Postmark
            console.log('SubscriptionChange event:', {
              Email: event.Email,
              SuppressionReason: event.SuppressionReason,
              SuppressionInactive: event.SuppressionInactive
            });
            
            if (event.SuppressionInactive === false) {
              // Reactivated - remove from suppression list
              await EmailSuppression.destroy({
                where: { email: event.Email.toLowerCase() }
              });
              console.log(`Removed ${event.Email} from suppression list (reactivated)`);
            } else {
              // Suppressed - add to our list
              let reason = 'manual';
              if (event.SuppressionReason === 'Customer') reason = 'unsubscribe';
              if (event.SuppressionReason === 'SpamComplaint') reason = 'spam_complaint';
              if (event.SuppressionReason === 'HardBounce') reason = 'hard_bounce';
              
              await EmailSuppression.findOrCreate({
                where: { email: event.Email.toLowerCase() },
                defaults: {
                  email: event.Email.toLowerCase(),
                  reason: reason,
                  userId: emailSend ? emailSend.userId : null
                }
              });
              
              // Update email send record if we have it
              if (emailSend && reason === 'unsubscribe') {
                await emailSend.update({
                  unsubscribedAt: new Date()
                });
              }
              
              // Log the event
              if (emailSend) {
                await EmailEvent.create({
                  emailSendId: emailSend.id,
                  eventType: 'unsubscribe',
                  eventData: event,
                  occurredAt: new Date()
                });
              }
              
              console.log(`Added ${event.Email} to suppression list (${reason})`);
            }
            break;
            
          default:
            console.log(`Unhandled Postmark event type: ${RecordType}`);
        }
        
      } catch (error) {
        console.error('Error processing individual webhook event:', error);
      }
    }
    
    // Always return success to Postmark
    res.json({ received: true });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return 200 to prevent Postmark from retrying
    res.json({ received: true });
  }
});

module.exports = router;