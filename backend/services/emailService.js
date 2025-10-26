const postmark = require('postmark');
const crypto = require('crypto');
const cheerio = require('cheerio');
const { EmailSend, EmailLink, EmailSuppression, Contact } = require('../models');

class EmailService {
  constructor() {
    const apiKey = process.env.POSTMARK_API_KEY || 'POSTMARK_API_TEST';
    this.client = new postmark.ServerClient(apiKey);
    this.emailDomain = process.env.EMAIL_DOMAIN || 'notifications.crmapp.io';
    this.fromEmail = process.env.FROM_EMAIL || `noreply@${this.emailDomain}`;
    this.appUrl = process.env.APP_URL || 'http://localhost:5000';
  }

  generateTrackingId() {
    return crypto.randomBytes(16).toString('hex');
  }

  async checkSuppression(email) {
    try {
      const suppression = await EmailSuppression.findOne({
        where: { email: email.toLowerCase() }
      });
      return suppression !== null;
    } catch (error) {
      // In development, if email_suppressions table doesn't exist, assume not suppressed
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('⚠️  Email suppressions table not found - assuming email not suppressed for development');
        return false;
      }
      throw error;
    }
  }

  async wrapLinksForTracking(html, emailSendId, trackingId) {
    const $ = cheerio.load(html);
    const links = [];

    $('a').each((index, element) => {
      const href = $(element).attr('href');
      // Skip tracking for mailto, tel, anchors, and Postmark tokens
      if (href && 
          !href.startsWith('mailto:') && 
          !href.startsWith('tel:') && 
          !href.startsWith('#') &&
          !href.includes('{{{') && // Skip Postmark merge tags
          !href.includes('pm:')) { // Skip Postmark tokens
        const linkId = crypto.randomBytes(8).toString('hex');
        const trackingUrl = `${this.appUrl}/api/track/click/${trackingId}/${linkId}`;
        
        links.push({
          emailSendId,
          linkId,
          originalUrl: href
        });
        
        $(element).attr('href', trackingUrl);
      }
    });

    // Bulk insert links if any were found
    if (links.length > 0) {
      await EmailLink.bulkCreate(links);
    }

    return $.html();
  }

  addTrackingPixel(html, trackingId) {
    const pixelUrl = `${this.appUrl}/api/track/pixel/${trackingId}.gif`;
    const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;visibility:hidden;width:0;height:0;max-width:0;max-height:0;overflow:hidden;">`;
    
    // Try to add before closing body tag, otherwise append to end
    if (html.includes('</body>')) {
      return html.replace('</body>', `${pixelHtml}</body>`);
    }
    return html + pixelHtml;
  }

  replaceVariables(text, contactData) {
    if (!text || !contactData) return text;
    
    // Replace standard contact fields
    let replacedText = text
      .replace(/\{\{firstName\}\}/g, contactData.firstName || '')
      .replace(/\{\{lastName\}\}/g, contactData.lastName || '')
      .replace(/\{\{email\}\}/g, contactData.email || '')
      .replace(/\{\{phone\}\}/g, contactData.phone || '')
      .replace(/\{\{company\}\}/g, contactData.company || '')
      .replace(/\{\{position\}\}/g, contactData.position || '');
    
    // Replace custom fields
    if (contactData.customFields) {
      Object.entries(contactData.customFields).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{customFields\\.${key}\\}\\}`, 'g');
        replacedText = replacedText.replace(regex, value || '');
      });
    }
    
    return replacedText;
  }

  async sendEmail({ userId, contactId, subject, message, userName, userEmail, userFirstName, contactEmail, contactData, enableTracking = true }) {
    let emailRecord;
    
    try {
      // Check if email is suppressed
      const isSuppressed = await this.checkSuppression(contactEmail);
      if (isSuppressed) {
        throw new Error('Email address is suppressed');
      }

      // Generate tracking ID
      const trackingId = this.generateTrackingId();

      // Replace variables in subject and message if contact data is provided
      let processedSubject = subject;
      let processedMessage = message;
      
      if (contactData) {
        processedSubject = this.replaceVariables(subject, contactData);
        processedMessage = this.replaceVariables(message, contactData);
      }

      // Create email record first (contactId is optional for system emails)
      emailRecord = await EmailSend.create({
        userId,
        contactId: contactId || null, // Make contactId optional
        subject: processedSubject,
        message: processedMessage,
        status: 'sent',
        trackingId
      });

      // Process message for tracking if enabled
      let htmlBody = processedMessage;
      let textBody = processedMessage;
      
      // Convert plain text to HTML if needed
      if (!processedMessage.includes('<') || !processedMessage.includes('>')) {
        htmlBody = `<html><body>${processedMessage.replace(/\n/g, '<br>')}</body></html>`;
        textBody = processedMessage;
      } else {
        // Extract text from HTML for plain text version
        const $ = cheerio.load(processedMessage);
        textBody = $.text();
      }

      // Add simple unsubscribe footer (Postmark will replace the URL)
      const unsubscribeFooterHtml = `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #666;">
          <p>
            <a href="{{{ pm:unsubscribe_url }}}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
          </p>
        </div>
      `;
      
      const unsubscribeFooterText = `

--
Unsubscribe: {{{ pm:unsubscribe_url }}}
`;

      // Insert footer before closing body tag or append to end
      if (htmlBody.includes('</body>')) {
        htmlBody = htmlBody.replace('</body>', `${unsubscribeFooterHtml}</body>`);
      } else {
        htmlBody += unsubscribeFooterHtml;
      }
      textBody += unsubscribeFooterText;

      if (enableTracking) {
        // Wrap links for click tracking
        htmlBody = await this.wrapLinksForTracking(htmlBody, emailRecord.id, trackingId);
        
        // Add tracking pixel
        htmlBody = this.addTrackingPixel(htmlBody, trackingId);
      }

      // Prepare email data
      const emailData = {
        From: `${userName} <${userEmail}>`,
        To: contactEmail,
        Subject: processedSubject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        ReplyTo: userEmail,
        Tag: 'crm-email',
        TrackOpens: true, // Let Postmark track opens
        TrackLinks: 'HtmlAndText', // Enable Postmark link tracking for unsubscribe
        MessageStream: 'outbound',
        Metadata: {
          trackingId,
          emailSendId: emailRecord.id
        },
        // Add Postmark unsubscribe handling
        Headers: [
          {
            Name: "List-Unsubscribe",
            Value: "<{{{ pm:unsubscribe_url }}}>"
          },
          {
            Name: "List-Unsubscribe-Post",
            Value: "List-Unsubscribe=One-Click"
          }
        ]
      };

      console.log('Sending email with data:', {
        From: emailData.From,
        To: emailData.To,
        Subject: emailData.Subject,
        ReplyTo: emailData.ReplyTo,
        emailDomain: this.emailDomain,
        apiKey: process.env.POSTMARK_API_KEY ? 'Set (hidden)' : 'NOT SET - USING TEST KEY'
      });

      // Send email via Postmark
      console.log('Calling Postmark API...');
      const response = await this.client.sendEmail(emailData);
      console.log('Postmark response:', response);

      // Update email record with Postmark message ID
      await emailRecord.update({
        postmarkMessageId: response.MessageID
      });

      // Update contact's lastContacted date if contactId is provided
      if (contactId) {
        await Contact.update(
          { lastContacted: new Date() },
          { where: { id: contactId } }
        );
      }

      return {
        success: true,
        emailId: emailRecord.id,
        messageId: response.MessageID
      };

    } catch (error) {
      console.error('Error sending email:', error);
      console.error('Full error details:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        response: error.response
      });
      
      // Log Postmark-specific error details
      if (error.ErrorCode) {
        console.error('Postmark Error Code:', error.ErrorCode);
        console.error('Postmark Message:', error.Message);
      }
      
      // If we created a record but failed to send, update status
      if (emailRecord) {
        await emailRecord.update({
          status: 'failed'
        });
      }

      throw error;
    }
  }

  async getEmailHistory(contactId, userId) {
    try {
      const emails = await EmailSend.findAll({
        where: {
          contactId,
          userId
        },
        order: [['createdAt', 'DESC']],
        attributes: [
          'id',
          'subject',
          'message',
          'status',
          'sentAt',
          'openedAt',
          'bouncedAt'
        ]
      });

      return emails;
    } catch (error) {
      console.error('Error fetching email history:', error);
      throw error;
    }
  }

  async processWebhook(payload) {
    try {
      const { RecordType, MessageID } = payload;

      // Find the email record by Postmark message ID
      const emailRecord = await EmailSend.findOne({
        where: { postmarkMessageId: MessageID }
      });

      if (!emailRecord) {
        console.warn(`Email record not found for MessageID: ${MessageID}`);
        return { received: true };
      }

      // Update based on event type
      switch (RecordType) {
        case 'Open':
          await emailRecord.update({
            openedAt: new Date(payload.ReceivedAt)
          });
          break;

        case 'Bounce':
          await emailRecord.update({
            bouncedAt: new Date(payload.ReceivedAt),
            status: 'bounced'
          });
          break;

        case 'Delivery':
          await emailRecord.update({
            status: 'delivered'
          });
          break;

        default:
          console.log(`Unhandled webhook event type: ${RecordType}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();