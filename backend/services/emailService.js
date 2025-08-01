const postmark = require('postmark');
const crypto = require('crypto');
const cheerio = require('cheerio');
const { EmailSend, EmailLink, EmailSuppression, UserProfile } = require('../models');

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
    const title = fields.title.value || profile.title;
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
      
      // Use field order if available
      const fieldOrder = signature.fieldOrder || ['name', 'title', 'email', 'phone', 'company', 'address'];
      const fieldValues = {
        name,
        title,
        email,
        phone,
        company,
        address: fields.address.value
      };
      
      // Render top section fields (name, title, email, phone)
      const topFields = fieldOrder.filter(f => ['name', 'title', 'email', 'phone'].includes(f));
      topFields.forEach(fieldName => {
        const field = fields[fieldName];
        const value = fieldValues[fieldName];
        
        if (field && field.show && value) {
          if (fieldName === 'name') {
            html += `<div style="font-weight: bold; color: ${primaryColor}; margin-bottom: 5px;">${value}</div>`;
          } else if (fieldName === 'title') {
            html += `<div style="color: #666; margin-bottom: 10px;">${value}</div>`;
          } else if (fieldName === 'email') {
            html += `<div style="margin-bottom: 3px;"><a href="mailto:${value}" style="color: ${primaryColor}; text-decoration: none;">${value}</a></div>`;
          } else if (fieldName === 'phone') {
            html += `<div style="margin-bottom: 10px;"><a href="tel:${value}" style="color: #333; text-decoration: none;">${value}</a></div>`;
          }
        }
      });
      
      // Company info with logo
      const bottomFields = fieldOrder.filter(f => ['company', 'address'].includes(f));
      if (signature.includeLogo || bottomFields.some(f => fields[f] && fields[f].show && fieldValues[f])) {
        html += '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e5e5;">';
        
        if (signature.includeLogo && signature.logoUrl) {
          html += `<img src="${signature.logoUrl}" alt="Company Logo" style="max-height: 40px; margin-bottom: 5px;">`;
        }
        
        bottomFields.forEach(fieldName => {
          const field = fields[fieldName];
          const value = fieldValues[fieldName];
          
          if (field && field.show && value) {
            if (fieldName === 'company') {
              html += `<div style="font-weight: bold; margin-bottom: 3px;">${value}</div>`;
            } else if (fieldName === 'address') {
              html += `<div style="color: #666; font-size: 0.9em;">${value}</div>`;
            }
          }
        });
        
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
    } else if (layout === 'classic') {
      // Classic layout - vertical stacked format
      if (fields.name.show && name) {
        html += `<div style="font-weight: bold; font-size: 1.1em; margin-bottom: 2px;">${name}</div>`;
      }
      if (fields.title.show && title) {
        html += `<div style="color: #666; margin-bottom: 8px;">${title}</div>`;
      }
      
      if (fields.company.show && company) {
        html += `<div style="font-weight: bold; margin-bottom: 8px;">${company}</div>`;
      }
      
      // Contact details
      if (fields.email.show && email) {
        html += `<div style="margin-bottom: 2px;">Email: <a href="mailto:${email}" style="color: ${primaryColor}; text-decoration: none;">${email}</a></div>`;
      }
      if (fields.phone.show && phone) {
        html += `<div style="margin-bottom: 2px;">Phone: <a href="tel:${phone}" style="color: #333; text-decoration: none;">${phone}</a></div>`;
      }
      if (fields.address.show && fields.address.value) {
        html += `<div style="margin-bottom: 8px;">Address: ${fields.address.value}</div>`;
      }
      
      // Logo at bottom
      if (signature.includeLogo && signature.logoUrl) {
        html += `<div style="margin-top: 12px;"><img src="${signature.logoUrl}" alt="Company Logo" style="max-height: 50px;"></div>`;
      }
      
      // Social links
      if (signature.includeSocial) {
        const activeSocial = Object.entries(social).filter(([_, data]) => data.show && data.url);
        if (activeSocial.length > 0) {
          html += '<div style="margin-top: 12px;">';
          activeSocial.forEach(([platform, data], index) => {
            if (index > 0) html += ' | ';
            html += `<a href="${data.url}" style="color: ${primaryColor}; text-decoration: none;">${platform.charAt(0).toUpperCase() + platform.slice(1)}</a>`;
          });
          html += '</div>';
        }
      }
    } else if (layout === 'minimal') {
      // Minimal layout - compact single line format
      let parts = [];
      
      if (fields.name.show && name) {
        parts.push(`<span style="font-weight: bold;">${name}</span>`);
      }
      if (fields.title.show && title) {
        parts.push(title);
      }
      if (fields.company.show && company) {
        parts.push(company);
      }
      
      if (parts.length > 0) {
        html += `<div style="margin-bottom: 5px;">${parts.join(' • ')}</div>`;
      }
      
      parts = [];
      if (fields.email.show && email) {
        parts.push(`<a href="mailto:${email}" style="color: ${primaryColor}; text-decoration: none;">${email}</a>`);
      }
      if (fields.phone.show && phone) {
        parts.push(`<a href="tel:${phone}" style="color: #333; text-decoration: none;">${phone}</a>`);
      }
      
      if (parts.length > 0) {
        html += `<div style="font-size: 0.9em;">${parts.join(' • ')}</div>`;
      }
      
      // Minimal social links
      if (signature.includeSocial) {
        const activeSocial = Object.entries(social).filter(([_, data]) => data.show && data.url);
        if (activeSocial.length > 0) {
          html += '<div style="margin-top: 8px; font-size: 0.85em;">';
          activeSocial.forEach(([platform, data], index) => {
            if (index > 0) html += ' • ';
            html += `<a href="${data.url}" style="color: ${primaryColor}; text-decoration: none;">${platform.charAt(0).toUpperCase() + platform.slice(1)}</a>`;
          });
          html += '</div>';
        }
      }
    } else if (layout === 'professional') {
      // Professional layout - comprehensive table-based design
      html = `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: white;">`;
      html += '<tr><td style="padding: 20px;">';
      html += '<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>';
      
      // Profile Photo column
      if (signature.includePhoto && signature.photoUrl) {
        html += `<td style="width: 120px; vertical-align: top; padding-right: 20px;">`;
        html += `<img src="${signature.photoUrl}" alt="Profile Photo" width="120" height="120" style="border-radius: 60px; display: block; border: 3px solid ${primaryColor};">`;
        html += '</td>';
      }
      
      // Main Content column
      html += '<td style="vertical-align: top;">';
      
      // Name, Title, and Company header
      html += '<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>';
      html += '<td style="vertical-align: top;">';
      
      if (fields.name.show && name) {
        html += `<div style="margin: 0 0 5px 0; font-size: 28px; font-weight: bold; color: #2c3e50; font-family: Georgia, serif; line-height: 32px;">${name}</div>`;
      }
      if (fields.title.show && title) {
        html += `<div style="margin: 0 0 5px 0; font-size: 16px; color: #7f8c8d; font-weight: 500; line-height: 20px;">${title}</div>`;
      }
      if (fields.company.show && company) {
        const department = fields.department?.show && fields.department?.value ? ` | ${fields.department.value}` : '';
        html += `<div style="margin: 0 0 15px 0; font-size: 14px; color: #95a5a6; line-height: 18px;">${company}${department}</div>`;
      }
      
      html += '</td>';
      
      // Company Logo
      if (signature.includeLogo && signature.logoUrl) {
        html += '<td style="text-align: right; vertical-align: top; width: 100px;">';
        html += `<img src="${signature.logoUrl}" alt="Company Logo" width="80" style="display: block; height: auto; max-height: 60px;">`;
        html += '</td>';
      }
      
      html += '</tr></table>';
      
      // Contact Information with icons
      html += '<table cellpadding="0" cellspacing="0" border="0" width="100%">';
      
      if (fields.phone.show && phone) {
        html += '<tr><td style="padding: 2px 0; vertical-align: middle;">';
        html += '<table cellpadding="0" cellspacing="0" border="0"><tr>';
        html += `<td style="width: 24px; vertical-align: middle;"><div style="width: 16px; height: 16px; background-color: #3498db; border-radius: 8px; text-align: center; line-height: 16px; color: white; font-size: 10px; margin-right: 8px;">📞</div></td>`;
        html += `<td style="vertical-align: middle;"><a href="tel:${phone}" style="color: #2c3e50; text-decoration: none; font-size: 14px;">${phone}</a></td>`;
        html += '</tr></table></td></tr>';
      }
      
      if (fields.email.show && email) {
        html += '<tr><td style="padding: 2px 0; vertical-align: middle;">';
        html += '<table cellpadding="0" cellspacing="0" border="0"><tr>';
        html += `<td style="width: 24px; vertical-align: middle;"><div style="width: 16px; height: 16px; background-color: #e74c3c; border-radius: 8px; text-align: center; line-height: 16px; color: white; font-size: 10px; margin-right: 8px;">✉</div></td>`;
        html += `<td style="vertical-align: middle;"><a href="mailto:${email}" style="color: #2c3e50; text-decoration: none; font-size: 14px;">${email}</a></td>`;
        html += '</tr></table></td></tr>';
      }
      
      // Website (if available)
      const website = profile.website;
      if (website) {
        html += '<tr><td style="padding: 2px 0; vertical-align: middle;">';
        html += '<table cellpadding="0" cellspacing="0" border="0"><tr>';
        html += `<td style="width: 24px; vertical-align: middle;"><div style="width: 16px; height: 16px; background-color: #9b59b6; border-radius: 8px; text-align: center; line-height: 16px; color: white; font-size: 10px; margin-right: 8px;">🌐</div></td>`;
        html += `<td style="vertical-align: middle;"><a href="${website.startsWith('http') ? website : 'https://' + website}" style="color: #2c3e50; text-decoration: none; font-size: 14px;">${website.replace(/^https?:\/\//, '')}</a></td>`;
        html += '</tr></table></td></tr>';
      }
      
      if (fields.address.show && fields.address.value) {
        html += '<tr><td style="padding: 2px 0 15px 0; vertical-align: middle;">';
        html += '<table cellpadding="0" cellspacing="0" border="0"><tr>';
        html += `<td style="width: 24px; vertical-align: middle;"><div style="width: 16px; height: 16px; background-color: #f39c12; border-radius: 8px; text-align: center; line-height: 16px; color: white; font-size: 10px; margin-right: 8px;">📍</div></td>`;
        html += `<td style="vertical-align: middle;"><span style="color: #7f8c8d; font-size: 14px;">${fields.address.value}</span></td>`;
        html += '</tr></table></td></tr>';
      }
      
      html += '</table>';
      
      // Social Media Icons
      if (signature.includeSocial) {
        const activeSocial = Object.entries(social).filter(([_, data]) => data.show && data.url);
        if (activeSocial.length > 0) {
          html += '<table cellpadding="0" cellspacing="0" border="0"><tr>';
          activeSocial.forEach(([platform, data]) => {
            let bgColor = '#0077b5'; // default LinkedIn
            let icon = 'in';
            if (platform === 'twitter') { bgColor = '#1da1f2'; icon = '🐦'; }
            else if (platform === 'facebook') { bgColor = '#4267b2'; icon = 'f'; }
            else if (platform === 'instagram') { bgColor = '#e4405f'; icon = '📷'; }
            else if (platform === 'website') { bgColor = '#34495e'; icon = '🌐'; }
            
            html += '<td style="padding-right: 8px;">';
            html += `<a href="${data.url}" style="text-decoration: none;">`;
            html += `<div style="width: 32px; height: 32px; background-color: ${bgColor}; border-radius: 6px; text-align: center; line-height: 32px; color: white; font-weight: bold; font-size: 14px;">${icon}</div>`;
            html += '</a></td>';
          });
          html += '</tr></table>';
        }
      }
      
      html += '</td>'; // End main content column
      html += '</tr></table></td></tr>';
      
      // Optional separator line
      if (style.dividerStyle === 'line') {
        html += '<tr><td style="padding: 0 20px;">';
        html += '<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>';
        html += `<td style="height: 3px; background-color: ${primaryColor};"></td>`;
        html += '</tr></table></td></tr>';
      }
      
      html += '</table>';
      
      return html; // Return early for professional layout
    }
    
    html += '</div>';
    
    return html;
  }

  generateSignatureText(signature, profile) {
    const { fields, social } = signature;
    
    // Fill in default values from profile if not set in signature
    const name = fields.name.value || `${profile.firstName} ${profile.lastName}`.trim();
    const title = fields.title.value || profile.title;
    const email = fields.email.value || profile.email;
    const phone = fields.phone.value || profile.phone;
    const company = fields.company.value || profile.companyName;
    
    let text = '';
    
    if (fields.name.show && name) {
      text += `${name}\n`;
    }
    if (fields.title.show && title) {
      text += `${title}\n`;
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

  async sendEmail({ userId, contactId, subject, message, userName, userEmail, userFirstName, contactEmail, enableTracking = true }) {
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
        From: `${userName} <${userFirstName}@${this.emailDomain}>`,
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

      console.log('Sending email with data:', {
        From: emailData.From,
        To: emailData.To,
        Subject: emailData.Subject,
        ReplyTo: emailData.ReplyTo,
        emailDomain: this.emailDomain
      });

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