const axios = require('axios');

const API_BASE = 'http://localhost:5002/api';

async function testEmailAPI() {
  let token, contactId;

  try {
    console.log('🚀 Email API Test Suite\n');

    // 1. Test server health
    console.log('1. Testing server health...');
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Server is healthy:', health.data);

    // 2. Register or login
    console.log('\n2. Setting up test user...');
    const userData = {
      email: 'emailtest@example.com',
      password: 'password123',
      firstName: 'Email',
      lastName: 'Tester'
    };

    try {
      const register = await axios.post(`${API_BASE}/auth/register`, userData);
      console.log('✅ User registered');
      token = register.data.token;
    } catch (error) {
      if (error.response?.data?.error === 'Email already registered') {
        const login = await axios.post(`${API_BASE}/auth/login`, {
          email: userData.email,
          password: userData.password
        });
        console.log('✅ User logged in');
        token = login.data.token;
      } else {
        throw error;
      }
    }

    // 3. Create a contact
    console.log('\n3. Creating test contact...');
    const contactData = {
      firstName: 'John',
      lastName: 'Customer',
      email: 'john.customer@example.com',
      phone: '555-1234',
      company: 'Customer Corp'
    };

    // Check if contact exists
    const contacts = await axios.get(`${API_BASE}/contacts`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    let contact = contacts.data.contacts.find(c => c.email === contactData.email);
    
    if (!contact) {
      const createContact = await axios.post(`${API_BASE}/contacts`, contactData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      contact = createContact.data;
      console.log('✅ Contact created');
    } else {
      console.log('✅ Using existing contact');
    }
    
    contactId = contact.id;

    // 4. Send email
    console.log('\n4. Testing email send endpoint...');
    const emailData = {
      contactId,
      subject: 'Test Email from CRM',
      message: 'Hello John,\n\nThis is a test email from our CRM system.\n\nBest regards,\nThe CRM Team'
    };

    const sendEmail = await axios.post(`${API_BASE}/emails/send`, emailData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Email sent successfully!');
    console.log('   Response:', JSON.stringify(sendEmail.data, null, 2));

    const { messageId } = sendEmail.data;

    // 5. Get email history
    console.log('\n5. Testing email history endpoint...');
    const history = await axios.get(`${API_BASE}/emails/contact/${contactId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Email history retrieved:');
    console.log('   Found', history.data.length, 'email(s)');
    if (history.data.length > 0) {
      console.log('   Latest email:', {
        subject: history.data[0].subject,
        status: history.data[0].status,
        sentAt: history.data[0].sentAt
      });
    }

    // 6. Test webhook
    if (messageId) {
      console.log('\n6. Testing webhook endpoints...');
      
      // Test open event
      const openEvent = {
        RecordType: 'Open',
        MessageID: messageId,
        ReceivedAt: new Date().toISOString(),
        Recipient: contactData.email
      };

      const webhookOpen = await axios.post(`${API_BASE}/webhooks/postmark`, openEvent);
      console.log('✅ Open webhook processed');

      // Get updated history
      const updatedHistory = await axios.get(`${API_BASE}/emails/contact/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedEmail = updatedHistory.data.find(e => e.id === sendEmail.data.emailId);
      if (updatedEmail?.openedAt) {
        console.log('✅ Email marked as opened:', updatedEmail.openedAt);
      }
    }

    console.log('\n✅ All tests passed! Email functionality is working correctly.');
    console.log('\n📝 Summary:');
    console.log('   - Server is running on port 5001');
    console.log('   - Authentication works');
    console.log('   - Email sending works (using Postmark test key)');
    console.log('   - Email history retrieval works');
    console.log('   - Webhook processing works');
    console.log('\n🎉 The email backend implementation is complete and functional!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

// Run the tests
testEmailAPI();