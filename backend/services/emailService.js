const postmark = require('postmark');
const crypto = require('crypto');
const cheerio = require('cheerio');
const { EmailSend, EmailLink, EmailSuppression, UserProfile } = require('../models');

class EmailService {
  constructor() {
    const apiKey = process.env.POSTMARK_API_KEY || 'POSTMARK_API_TEST';
    this.client = new postmark.ServerClient(apiKey);
    this.emailDomain = process.env.EMAIL_DOMAIN || 'notifications.crmapp.io';
    this.appUrl = process.env.APP_URL || 'http://localhost:5000';
  }

  generateTrackingId() {
    return crypto.randomBytes(16).toString('hex');
  }

  async checkSuppression(email) {
    const suppression = await EmailSuppression.findOne({
      where: { email: email.toLowerCase() }
    });
    return suppression !== null;
  }

  async wrapLinksForTracking(html, emailSendId, trackingId) {
    const $ = cheerio.load(html);
    const links = [];

    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
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

  async appendEmailSignature(html, text, userId) {
    try {
      // Get user profile with email signature
      const profile = await UserProfile.findOne({
        where: { userId },
        attributes: ['emailSignature', 'firstName', 'lastName', 'companyName', 'phone', 'website']
      });

      if (!profile || !profile.emailSignature || !profile.emailSignature.enabled) {
        return { html, text };
      }

      const signature = profile.emailSignature;
      
      // Generate signature HTML
      let signatureHtml = this.generateSignatureHTML(signature, profile);
      let signatureText = this.generateSignatureText(signature, profile);

      // Append signature to HTML email
      if (html && signatureHtml) {
        // Add some spacing before signature
        const signatureWithSpacing = `<br><br>${signatureHtml}`;
        
        // If HTML has </body> tag, insert before it, otherwise append
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${signatureWithSpacing}</body>`);
        } else {
          html += signatureWithSpacing;
        }
      }

      // Append signature to plain text
      if (text && signatureText) {
        text += `\n\n${signatureText}`;
      }

      return { html, text };
    } catch (error) {
      console.error('Error appending email signature:', error);
      // Return original content if signature fails
      return { html, text };
    }
  }

  generateSignatureHTML(signature, profile) {
    const { fields, style, social, layout } = signature;
    const { primaryColor, fontFamily, fontSize } = style;

    // Fill in default values from profile if not set in signature
    const name = fields.name.value || `${profile.firstName} ${profile.lastName}`.trim();
    const email = fields.email.value || profile.email;
    const phone = fields.phone.value || profile.phone;
    const company = fields.company.value || profile.companyName;

    let html = `<div style="font-family: ${fontFamily}; font-size: ${fontSize}; color: #333; line-height: 1.5;">`;
    
    if (layout === 'modern') {
      html += `<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${fontFamily};">`;
      html += '<tr>';
      
      // Photo column if enabled
      if (signature.includePhoto && signature.photoUrl) {
        html += `<td style="padding-right: 15px; vertical-align: top;">`;
        html += `<img src="${signature.photoUrl}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%;">`;
        html += '</td>';
      }
      
      // Info column
      html += '<td style="vertical-align: top;">';
      
      // Name and title
      if (fields.name.show && name) {
        html += `<div style="font-weight: bold; color: ${primaryColor}; margin-bottom: 5px;">${name}</div>`;
      }
      if (fields.title.show && fields.title.value) {
        html += `<div style="color: #666; margin-bottom: 10px;">${fields.title.value}</div>`;
      }
      
      // Contact info
      if (fields.email.show && email) {
        html += `<div style="margin-bottom: 3px;"><a href="mailto:${email}" style="color: ${primaryColor}; text-decoration: none;">${email}</a></div>`;
      }
      if (fields.phone.show && phone) {
        html += `<div style="margin-bottom: 10px;"><a href="tel:${phone}" style="color: #333; text-decoration: none;">${phone}</a></div>`;
      }
      
      // Company info with logo
      if (signature.includeLogo || fields.company.show || fields.address.show) {
        html += '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e5e5;">';
        
        if (signature.includeLogo && signature.logoUrl) {
          html += `<img src="${signature.logoUrl}" alt="Company Logo" style="max-height: 40px; margin-bottom: 5px;">`;
        }
        
        if (fields.company.show && company) {
          html += `<div style="font-weight: bold; margin-bottom: 3px;">${company}</div>`;
        }
        
        if (fields.address.show && fields.address.value) {
          html += `<div style="color: #666; font-size: 0.9em;">${fields.address.value}</div>`;
        }
        
        html += '</div>';
      }
      
      // Social links
      if (signature.includeSocial) {
        const activeSocial = Object.entries(social).filter(([_, data]) => data.show && data.url);
        if (activeSocial.length > 0) {
          html += '<div style="margin-top: 10px;">';
          activeSocial.forEach(([platform, data], index) => {
            if (index > 0) html += ' | ';
            html += `<a href="${data.url}" style="color: ${primaryColor}; text-decoration: none;">${platform.charAt(0).toUpperCase() + platform.slice(1)}</a>`;
          });
          html += '</div>';
        }
      }
      
      html += '</td>';
      html += '</tr>';
      html += '</table>';
    }
    
    html += '</div>';
    
    return html;
  }

  generateSignatureText(signature, profile) {
    const { fields, social } = signature;
    
    // Fill in default values from profile if not set in signature
    const name = fields.name.value || `${profile.firstName} ${profile.lastName}`.trim();
    const email = fields.email.value || profile.email;
    const phone = fields.phone.value || profile.phone;
    const company = fields.company.value || profile.companyName;
    
    let text = '';
    
    if (fields.name.show && name) {
      text += `${name}\n`;
    }
    if (fields.title.show && fields.title.value) {
      text += `${fields.title.value}\n`;
    }
    text += '\n';
    
    if (fields.email.show && email) {
      text += `Email: ${email}\n`;
    }
    if (fields.phone.show && phone) {
      text += `Phone: ${phone}\n`;
    }
    text += '\n';
    
    if (fields.company.show && company) {
      text += `${company}\n`;
    }
    if (fields.address.show && fields.address.value) {
      text += `${fields.address.value}\n`;
    }
    
    // Social links
    if (signature.includeSocial) {
      const activeSocial = Object.entries(social).filter(([_, data]) => data.show && data.url);
      if (activeSocial.length > 0) {
        text += '\n';
        activeSocial.forEach(([platform, data]) => {
          text += `${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${data.url}\n`;
        });
      }
    }
    
    return text;
  }

  async sendEmail({ userId, contactId, subject, message, userName, userEmail, contactEmail, enableTracking = true }) {
    let emailRecord;
    
    try {
      // Check if email is suppressed
      const isSuppressed = await this.checkSuppression(contactEmail);
      if (isSuppressed) {
        throw new Error('Email address is suppressed');
      }

      // Generate tracking ID
      const trackingId = this.generateTrackingId();

      // Create email record first
      emailRecord = await EmailSend.create({
        userId,
        contactId,
        subject,
        message,
        status: 'sent',
        trackingId
      });

      // Process message for tracking if enabled
      let processedMessage = message;
      let htmlBody = message;
      let textBody = message;
      
      // Convert plain text to HTML if needed
      if (!message.includes('<') || !message.includes('>')) {
        htmlBody = `<html><body>${message.replace(/\n/g, '<br>')}</body></html>`;
        textBody = message;
      } else {
        // Extract text from HTML for plain text version
        const $ = cheerio.load(message);
        textBody = $.text();
      }

      // Append email signature
      const signatureResult = await this.appendEmailSignature(htmlBody, textBody, userId);
      htmlBody = signatureResult.html;
      textBody = signatureResult.text;

      if (enableTracking) {
        // Wrap links for click tracking
        htmlBody = await this.wrapLinksForTracking(htmlBody, emailRecord.id, trackingId);
        
        // Add tracking pixel
        htmlBody = this.addTrackingPixel(htmlBody, trackingId);
      }

      // Prepare email data
      const emailData = {
        From: `${userName} <noreply@${this.emailDomain}>`,
        To: contactEmail,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        ReplyTo: userEmail,
        Tag: 'crm-email',
        TrackOpens: false, // We're using our own tracking
        TrackLinks: 'None',
        MessageStream: 'outbound',
        Metadata: {
          trackingId,
          emailSendId: emailRecord.id
        }
      };

      // Send email via Postmark
      const response = await this.client.sendEmail(emailData);

      // Update email record with Postmark message ID
      await emailRecord.update({
        postmarkMessageId: response.MessageID
      });

      return {
        success: true,
        emailId: emailRecord.id,
        messageId: response.MessageID
      };

    } catch (error) {
      console.error('Error sending email:', error);
      
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
          ['sentAt', 'sentAt'],
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