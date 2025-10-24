// Test Email Variable Replacement
require('dotenv').config();
const axios = require('axios');
const { Contact, EmailSend } = require('./backend/models');

const API_URL = process.env.APP_URL || 'http://localhost:5001';

async function testVariableReplacement() {
  try {
    console.log('📧 Testing Email Variable Replacement\n');
    console.log('═══════════════════════════════════════\n');

    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    const userId = loginResponse.data.user?.id;
    console.log('✓ Logged in\n');

    // Step 2: Get contact
    console.log('Step 2: Getting contact...');
    const contact = await Contact.findOne({
      where: {
        userId: userId,
        email: 'jane.smith@example.com'
      }
    });

    console.log('✓ Contact found:', contact.firstName, contact.lastName);
    console.log('  Company:', contact.company);
    console.log('  Position:', contact.position, '\n');

    // Step 3: Send email with variables
    console.log('Step 3: Sending email with variables...');
    const emailData = {
      contactId: contact.id,
      subject: 'Hello {{firstName}} from {{company}}!',
      message: `
Hi {{firstName}} {{lastName}},

I hope this email finds you well at {{company}}.

I wanted to reach out regarding your role as {{position}}.

Best regards,
Test User
`.trim()
    };

    console.log('\nTemplate Subject:', emailData.subject);
    console.log('Template Message:');
    console.log(emailData.message);
    console.log('\n→ Sending...\n');

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

    console.log('✅ Email sent successfully!\n');

    // Step 4: Verify variable replacement
    console.log('Step 4: Verifying variable replacement in database...');
    const emailRecord = await EmailSend.findByPk(sendResponse.data.emailId);

    if (emailRecord) {
      console.log('\n✓ Email record found');
      console.log('\nProcessed Subject:');
      console.log('  ', emailRecord.subject);
      console.log('\nProcessed Message:');
      console.log('  ', emailRecord.message.replace(/\n/g, '\n   '));

      // Check if variables were replaced
      const subjectHasVariables = emailRecord.subject.includes('{{');
      const messageHasVariables = emailRecord.message.includes('{{');

      console.log('\n═══════════════════════════════════════');
      console.log('VERIFICATION:');
      console.log('═══════════════════════════════════════');
      console.log('Subject contains {{variables}}:', subjectHasVariables ? '❌ NOT REPLACED' : '✅ REPLACED');
      console.log('Message contains {{variables}}:', messageHasVariables ? '❌ NOT REPLACED' : '✅ REPLACED');

      // Check expected values
      const expectedInSubject = [contact.firstName, contact.company];
      const expectedInMessage = [contact.firstName, contact.lastName, contact.company, contact.position];

      console.log('\nExpected values in subject:');
      expectedInSubject.forEach(val => {
        const found = emailRecord.subject.includes(val);
        console.log(`  "${val}":`, found ? '✅ Found' : '❌ Missing');
      });

      console.log('\nExpected values in message:');
      expectedInMessage.forEach(val => {
        const found = emailRecord.message.includes(val);
        console.log(`  "${val}":`, found ? '✅ Found' : '❌ Missing');
      });

      console.log('\n═══════════════════════════════════════');

      if (!subjectHasVariables && !messageHasVariables) {
        console.log('✅ VARIABLE REPLACEMENT TEST PASSED');
      } else {
        console.log('❌ VARIABLE REPLACEMENT TEST FAILED');
      }
      console.log('═══════════════════════════════════════\n');
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

testVariableReplacement();
