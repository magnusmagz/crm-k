require('dotenv').config();
const axios = require('axios');

// Configuration - update these values
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
const CONTACT_ID = process.env.TEST_CONTACT_ID || '1'; // Update with a valid contact ID

// Test API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testTimeline() {
  console.log('🧪 Testing Timeline Endpoint\n');
  
  if (!AUTH_TOKEN) {
    console.error('❌ Please set TEST_AUTH_TOKEN in your .env file');
    return;
  }

  try {
    // Test 1: Get timeline for a contact
    console.log(`📊 Fetching timeline for contact ${CONTACT_ID}...`);
    
    const response = await api.get(`/timeline/contact/${CONTACT_ID}`);
    
    console.log('✅ Timeline fetched successfully!');
    console.log(`Total activities: ${response.data.total}`);
    console.log(`Activities returned: ${response.data.activities.length}`);
    
    if (response.data.activities.length > 0) {
      console.log('\nSample activities:');
      response.data.activities.slice(0, 3).forEach(activity => {
        console.log(`- [${activity.type}] ${activity.title}: ${activity.description}`);
      });
    }

    // Test 2: Get timeline summary
    console.log(`\n📊 Fetching timeline summary...`);
    
    const summaryResponse = await api.get(`/timeline/contact/${CONTACT_ID}/summary`);
    
    console.log('✅ Summary fetched successfully!');
    console.log('Summary:', summaryResponse.data.summary);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.error('Contact not found. Please check the CONTACT_ID.');
    } else if (error.response?.status === 401) {
      console.error('Authentication failed. Please check your AUTH_TOKEN.');
    }
  }
}

// Run test
testTimeline();