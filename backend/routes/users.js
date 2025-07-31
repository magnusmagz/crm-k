const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, UserProfile } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateProfileUpdate = [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('companyName').optional().trim(),
  body('phone').optional({ checkFalsy: true }).matches(/^[\d\s\-\+\(\)]+$/),
  body('website').optional({ checkFalsy: true }).isURL(),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional({ checkFalsy: true }).matches(/^\d{5}(-\d{4})?$/),
  body('primaryColor').optional({ checkFalsy: true }).matches(/^#[0-9A-Fa-f]{6}$/i).withMessage('Invalid hex color format'),
  body('crmName').optional({ checkFalsy: true }).trim().isLength({ min: 1, max: 50 }).withMessage('CRM name must be between 1 and 50 characters')
];

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, validateProfileUpdate, async (req, res) => {
  try {
    console.log('Profile update request received:', {
      userId: req.user?.id,
      body: req.body,
      headers: req.headers
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const profile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      console.log('Profile not found for user:', req.user.id);
      return res.status(404).json({ error: 'Profile not found' });
    }

    const allowedFields = ['firstName', 'lastName', 'companyName', 'phone', 'website', 'address', 'profilePhoto', 'companyLogo', 'primaryColor', 'crmName', 'emailSignature'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    console.log('Updates to be applied:', updates);

    await profile.update(updates);

    console.log('Profile updated successfully:', profile.toJSON());

    res.json({ 
      message: 'Profile updated successfully',
      profile 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Change password
router.put('/change-password', 
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findByPk(req.user.id);
      
      if (!(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      await user.update({ password: newPassword });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// Delete account
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    // Delete user and all associated data
    await User.destroy({
      where: { id: req.user.id }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Get email signature
router.get('/email-signature', authMiddleware, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      where: { userId: req.user.id },
      attributes: ['emailSignature']
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ emailSignature: profile.emailSignature });
  } catch (error) {
    console.error('Get email signature error:', error);
    res.status(500).json({ error: 'Failed to get email signature' });
  }
});

// Update email signature
router.put('/email-signature', authMiddleware, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Validate email signature structure
    const { emailSignature } = req.body;
    if (emailSignature && typeof emailSignature !== 'object') {
      return res.status(400).json({ error: 'Invalid email signature format' });
    }

    await profile.update({ emailSignature });

    res.json({ 
      message: 'Email signature updated successfully',
      emailSignature: profile.emailSignature 
    });
  } catch (error) {
    console.error('Update email signature error:', error);
    res.status(500).json({ error: 'Failed to update email signature' });
  }
});

// Generate email signature HTML
router.post('/email-signature/generate', authMiddleware, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const signature = profile.emailSignature;
    if (!signature || !signature.enabled) {
      return res.json({ html: '', text: '' });
    }

    // Generate HTML based on signature configuration
    const html = generateEmailSignatureHTML(signature, profile);
    const text = generateEmailSignatureText(signature, profile);

    res.json({ html, text });
  } catch (error) {
    console.error('Generate email signature error:', error);
    res.status(500).json({ error: 'Failed to generate email signature' });
  }
});

// Helper function to generate HTML signature
function generateEmailSignatureHTML(signature, profile) {
  const { fields, style, social, layout } = signature;
  const { primaryColor, fontFamily, fontSize, spacing } = style;

  let html = `<div style="font-family: ${fontFamily}; font-size: ${fontSize}; color: #333; line-height: 1.5;">`;
  
  // Add layout-specific HTML based on the chosen layout
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
    if (fields.name.show && fields.name.value) {
      html += `<div style="font-weight: bold; color: ${primaryColor}; margin-bottom: 5px;">${fields.name.value}</div>`;
    }
    if (fields.title.show && fields.title.value) {
      html += `<div style="color: #666; margin-bottom: 10px;">${fields.title.value}</div>`;
    }
    
    // Contact info
    if (fields.email.show && fields.email.value) {
      html += `<div style="margin-bottom: 3px;"><a href="mailto:${fields.email.value}" style="color: ${primaryColor}; text-decoration: none;">${fields.email.value}</a></div>`;
    }
    if (fields.phone.show && fields.phone.value) {
      html += `<div style="margin-bottom: 10px;"><a href="tel:${fields.phone.value}" style="color: #333; text-decoration: none;">${fields.phone.value}</a></div>`;
    }
    
    // Company info with logo
    if (signature.includeLogo || fields.company.show || fields.address.show) {
      html += '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e5e5;">';
      
      if (signature.includeLogo && signature.logoUrl) {
        html += `<img src="${signature.logoUrl}" alt="Company Logo" style="max-height: 40px; margin-bottom: 5px;">`;
      }
      
      if (fields.company.show && fields.company.value) {
        html += `<div style="font-weight: bold; margin-bottom: 3px;">${fields.company.value}</div>`;
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

// Helper function to generate plain text signature
function generateEmailSignatureText(signature, profile) {
  const { fields, social } = signature;
  let text = '';
  
  if (fields.name.show && fields.name.value) {
    text += `${fields.name.value}\n`;
  }
  if (fields.title.show && fields.title.value) {
    text += `${fields.title.value}\n`;
  }
  text += '\n';
  
  if (fields.email.show && fields.email.value) {
    text += `Email: ${fields.email.value}\n`;
  }
  if (fields.phone.show && fields.phone.value) {
    text += `Phone: ${fields.phone.value}\n`;
  }
  text += '\n';
  
  if (fields.company.show && fields.company.value) {
    text += `${fields.company.value}\n`;
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

module.exports = router;