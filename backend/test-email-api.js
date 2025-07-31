const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

// Test contact
const testContact = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-1234',
  company: 'Test Company'
};

async function registerUser() {
  try {
    console.log('1. Registering test user...');
    const response = await axios.post(`${API_BASE}/auth/register`, testUser);
    console.log('✅ User registered successfully');
    return response.data.token;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('User already exists, logging in...');
      return loginUser();
    }
    throw error;
  }
}

async function loginUser() {
  const response = await axios.post(`${API_BASE}/auth/login`, testUser);
  console.log('✅ User logged in successfully');
  return response.data.token;
}

async function createContact(token) {
  try {
    console.log('\n2. Creating test contact...');
    const response = await axios.post(`${API_BASE}/contacts`, testContact, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Contact created successfully');
    return response.data.id;
  } catch (error) {
    if (error.response?.status === 400) {
      // Contact might already exist, let's get it
      const contacts = await axios.get(`${API_BASE}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const existing = contacts.data.contacts.find(c => c.email === testContact.email);
      if (existing) {
        console.log('✅ Using existing contact');
        return existing.id;
      }
    }
    throw error;
  }
}

async function sendEmail(token, contactId) {
  console.log('\n3. Sending test email...');
  const emailData = {
    contactId,
    subject: 'Test Email from CRM',
    message: 'Hello! This is a test email from the CRM system. If you receive this, the email integration is working correctly!'
  };

  try {
    const response = await axios.post(`${API_BASE}/emails/send`, emailData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Email sent successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to send email:', error.response?.data || error.message);
    throw error;
  }
}

async function getEmailHistory(token, contactId) {
  console.log('\n4. Getting email history...');
  try {
    const response = await axios.get(`${API_BASE}/emails/contact/${contactId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Email history retrieved:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get email history:', error.response?.data || error.message);
    throw error;
  }
}

async function testWebhook(messageId) {
  console.log('\n5. Testing webhook (simulating email open)...');
  const webhookPayload = {
    RecordType: 'Open',
    MessageID: messageId,
    ReceivedAt: new Date().toISOString()
  };

  try {
    const response = await axios.post(`${API_BASE}/webhooks/postmark`, webhookPayload);
    console.log('✅ Webhook processed successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Webhook failed:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    console.log('🚀 Starting Email API Tests\n');
    
    // Get auth token
    const token = await registerUser();
    
    // Create contact
    const contactId = await createContact(token);
    
    // Send email
    const emailResult = await sendEmail(token, contactId);
    
    // Get email history
    await getEmailHistory(token, contactId);
    
    // Test webhook if we have a message ID
    if (emailResult.messageId) {
      await testWebhook(emailResult.messageId);
      
      // Get email history again to see the update
      console.log('\n6. Checking email history after webhook...');
      await getEmailHistory(token, contactId);
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the tests
runTests();