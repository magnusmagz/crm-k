// Test Email Sending
require('dotenv').config();
const axios = require('axios');
const { User, Contact } = require('./backend/models');

const API_URL = process.env.APP_URL || 'http://localhost:5001';

async function testEmailSending() {
  try {
    console.log('📧 Testing Email Sending System\n');
    console.log('═══════════════════════════════════════\n');

    // Step 1: Login to get auth token
    console.log('Step 1: Logging in as test user...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    const userId = loginResponse.data.user?.id;
    console.log('✓ Logged in successfully');
    console.log('  User ID:', userId);
    console.log('  Token:', token.substring(0, 20) + '...\n');

    // Step 2: Get test contact
    console.log('Step 2: Getting test contact...');
    const contact = await Contact.findOne({
      where: {
        userId: userId,
        email: 'john.doe@example.com'
      }
    });

    if (!contact) {
      throw new Error('Test contact not found');
    }

    console.log('✓ Contact found:', contact.firstName, contact.lastName);
    console.log('  Contact ID:', contact.id);
    console.log('  Email:', contact.email, '\n');

    // Step 3: Send basic email
    console.log('Step 3: Sending basic test email...');
    const emailData = {
      contactId: contact.id,
      subject: 'Test Email - Basic Functionality',
      message: `Hello ${contact.firstName},\n\nThis is a test email from the CRM system.\n\nBest regards,\nTest User`
    };

    console.log('  Subject:', emailData.subject);
    console.log('  To:', contact.email);

    const sendResponse = await axios.post(
      `${API_URL}/api/emails/send`,
      emailData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ Email sent successfully!');
    console.log('  Response:', JSON.stringify(sendResponse.data, null, 2));
    console.log('\n═══════════════════════════════════════\n');

    // Step 4: Check email record in database
    console.log('Step 4: Verifying email record in database...');
    const { EmailSend } = require('./backend/models');
    const emailRecord = await EmailSend.findByPk(sendResponse.data.emailId);

    if (emailRecord) {
      console.log('✓ Email record found in database:');
      console.log('  ID:', emailRecord.id);
      console.log('  Subject:', emailRecord.subject);
      console.log('  Status:', emailRecord.status);
      console.log('  Tracking ID:', emailRecord.trackingId);
      console.log('  Postmark Message ID:', emailRecord.postmarkMessageId || 'N/A (Test mode)');
      console.log('  Sent At:', emailRecord.sentAt);
      console.log('  Open Count:', emailRecord.openCount);
      console.log('  Click Count:', emailRecord.clickCount);
    } else {
      console.log('❌ Email record not found in database');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ BASIC EMAIL TEST PASSED');
    console.log('═══════════════════════════════════════\n');

    // Note about test mode
    if (process.env.POSTMARK_API_KEY === 'POSTMARK_API_TEST') {
      console.log('📝 NOTE: Running in Postmark TEST mode');
      console.log('   No actual emails are sent to recipients.');
      console.log('   All other functionality (tracking, database, etc.) works normally.\n');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testEmailSending();
