require('dotenv').config();
const { User, Contact, UserProfile } = require('./models');
const emailService = require('./services/emailService');

async function testEmailSending() {
  console.log('🔍 Email Debug Test Starting...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log('- POSTMARK_API_KEY:', process.env.POSTMARK_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('- EMAIL_DOMAIN:', process.env.EMAIL_DOMAIN || 'Not set (using default)');
  console.log('- FROM_EMAIL:', process.env.FROM_EMAIL || 'Not set (using default)');
  console.log('- APP_URL:', process.env.APP_URL || 'Not set (using default)');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('');

  try {
    // Test 1: Find a test user
    console.log('🧪 Test 1: Finding test user...');
    const user = await User.findOne({
      include: [{ model: UserProfile, as: 'profile' }]
    });
    
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`- User ID: ${user.id}`);
    console.log(`- Profile exists: ${user.profile ? 'Yes' : 'No'}`);
    if (user.profile) {
      console.log(`- Name: ${user.profile.firstName} ${user.profile.lastName}`);
    }
    console.log('');

    // Test 2: Find a test contact
    console.log('🧪 Test 2: Finding test contact...');
    
    // First, let's see what contacts exist
    const allContacts = await Contact.findAll({
      where: { userId: user.id },
      attributes: ['id', 'firstName', 'lastName', 'email']
    });
    
    console.log(`Found ${allContacts.length} total contacts for this user`);
    if (allContacts.length > 0) {
      console.log('Sample contacts:');
      allContacts.slice(0, 3).forEach(c => {
        console.log(`  - ${c.firstName} ${c.lastName}: ${c.email || 'NO EMAIL'}`);
      });
    }
    
    const contact = await Contact.findOne({
      where: { 
        userId: user.id,
        email: { [require('sequelize').Op.ne]: null }
      }
    });
    
    if (!contact) {
      console.log('❌ No contacts with email found for this user');
      
      // Let's check any contact with email in the system
      const anyContact = await Contact.findOne({
        where: { 
          email: { [require('sequelize').Op.ne]: null }
        }
      });
      
      if (anyContact) {
        console.log(`\n💡 Found a contact with email in the system: ${anyContact.email}`);
        console.log('But it belongs to a different user.');
      }
      
      return;
    }
    
    console.log(`✅ Found contact: ${contact.email}`);
    console.log(`- Contact ID: ${contact.id}`);
    console.log(`- Name: ${contact.firstName} ${contact.lastName}`);
    console.log('');

    // Test 3: Prepare email data
    console.log('🧪 Test 3: Preparing email data...');
    const firstName = user.profile?.firstName || user.email.split('@')[0];
    const fullName = user.profile ? 
      `${user.profile.firstName} ${user.profile.lastName}`.trim() : 
      user.email.split('@')[0];
    
    const emailData = {
      userId: user.id,
      contactId: contact.id,
      subject: 'Test Email from CRM',
      message: '<p>This is a test email to verify the email system is working correctly.</p>',
      userName: fullName,
      userEmail: user.email,
      userFirstName: firstName.toLowerCase(),
      contactEmail: contact.email,
      enableTracking: true
    };
    
    console.log('📧 Email data prepared:');
    console.log(`- From: ${fullName} <${firstName.toLowerCase()}@${process.env.EMAIL_DOMAIN || 'notifications.crmapp.io'}>`);
    console.log(`- To: ${contact.email}`);
    console.log(`- Subject: ${emailData.subject}`);
    console.log('');

    // Test 4: Attempt to send email
    console.log('🧪 Test 4: Attempting to send email...');
    console.log('⏳ Sending...');
    
    const result = await emailService.sendEmail(emailData);
    
    console.log('✅ Email sent successfully!');
    console.log(`- Email ID: ${result.emailId}`);
    console.log(`- Postmark Message ID: ${result.messageId}`);
    console.log('');
    
    console.log('🎉 All tests passed! Email system is working.');
    
  } catch (error) {
    console.log('❌ Error occurred:');
    console.log(`- Error type: ${error.constructor.name}`);
    console.log(`- Error message: ${error.message}`);
    
    if (error.stack) {
      console.log('\n📚 Stack trace:');
      console.log(error.stack);
    }
    
    if (error.response) {
      console.log('\n📬 Postmark response:');
      console.log(JSON.stringify(error.response, null, 2));
    }
    
    if (error.code) {
      console.log(`\n🔍 Error code: ${error.code}`);
    }
    
    // Specific error handling
    if (error.message.includes('Validation')) {
      console.log('\n⚠️  This appears to be a validation error. Check your model constraints.');
    } else if (error.message.includes('POSTMARK')) {
      console.log('\n⚠️  This appears to be a Postmark API error. Check your API key and sender configuration.');
    } else if (error.message.includes('suppressed')) {
      console.log('\n⚠️  The recipient email is suppressed. They may have unsubscribed.');
    }
  }
  
  process.exit(0);
}

// Run the test
testEmailSending();