const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

console.log('🔍 Duplicate Feature Debug Tests');
console.log('================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Auth Token: ${AUTH_TOKEN ? '✓ Set' : '✗ Missing'}`);
console.log('');

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test 1: Check if routes are properly registered
async function testRouteOrder() {
  console.log('Test 1: Route Order Check');
  console.log('-------------------------');
  
  try {
    // Test that /api/contacts/duplicates doesn't get caught by /:id
    console.log('Testing /api/contacts/duplicates endpoint...');
    const response = await api.get('/api/contacts/duplicates?search=test');
    console.log('✗ UNEXPECTED: Got successful response when we expected validation error');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      if (error.response.status === 400 && error.response.data.error === 'Search query must be at least 2 characters') {
        console.log('✓ CORRECT: Got expected validation error (search too short)');
      } else if (error.response.status === 500) {
        console.log('✗ ERROR 500: Server error - likely route misconfiguration');
        console.log('Error message:', error.response.data);
      } else {
        console.log(`✗ Unexpected error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
    } else {
      console.log('✗ Network error:', error.message);
    }
  }
  console.log('');
}

// Test 2: Test duplicate search with valid query
async function testDuplicateSearch() {
  console.log('Test 2: Duplicate Search');
  console.log('------------------------');
  
  const searchQueries = ['john', 'test@email.com', 'doe'];
  
  for (const query of searchQueries) {
    try {
      console.log(`Searching for: "${query}"`);
      const response = await api.get(`/api/contacts/duplicates?search=${encodeURIComponent(query)}`);
      console.log(`✓ Success! Found ${response.data.contacts.length} contacts`);
      
      if (response.data.contacts.length > 0) {
        console.log('Sample result:', {
          name: `${response.data.contacts[0].firstName} ${response.data.contacts[0].lastName}`,
          email: response.data.contacts[0].email,
          dealCount: response.data.contacts[0].dealCount
        });
      }
    } catch (error) {
      if (error.response) {
        console.log(`✗ Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else {
        console.log('✗ Network error:', error.message);
      }
    }
    console.log('');
  }
}

// Test 3: Check actual route registration
async function testActualRoutes() {
  console.log('Test 3: Route Registration Check');
  console.log('--------------------------------');
  
  // Test various endpoints to see which ones work
  const endpoints = [
    { path: '/api/contacts', expected: 'Contact list' },
    { path: '/api/contacts/tags/all', expected: 'Tags list' },
    { path: '/api/contacts/duplicates?search=test', expected: 'Duplicates search' },
    { path: '/api/contacts/export', expected: 'Export endpoint' },
    { path: '/api/contacts/123e4567-e89b-12d3-a456-426614174000', expected: 'Single contact (UUID)' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.path} (${endpoint.expected})...`);
      const response = await api.get(endpoint.path);
      console.log(`✓ Success: Got ${response.status} response`);
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data.error || error.response.data.message || JSON.stringify(error.response.data);
        
        if (status === 404) {
          console.log(`✓ 404: Expected for non-existent resource`);
        } else if (status === 400) {
          console.log(`✓ 400: Validation error - ${message}`);
        } else if (status === 500) {
          console.log(`✗ 500: Server error - ${message}`);
          // Log more details for 500 errors
          if (error.response.data.stack) {
            console.log('Stack trace:', error.response.data.stack);
          }
        } else {
          console.log(`? ${status}: ${message}`);
        }
      } else {
        console.log('✗ Network error:', error.message);
      }
    }
    console.log('');
  }
}

// Test 4: Debug SQL query
async function testSQLDebug() {
  console.log('Test 4: SQL Query Debug');
  console.log('-----------------------');
  
  // First, let's check if we can get the server logs
  console.log('Make a request and check server logs for SQL query...');
  
  try {
    await api.get('/api/contacts/duplicates?search=testquery');
  } catch (error) {
    if (error.response && error.response.status === 500) {
      console.log('✗ Got 500 error as expected');
      console.log('Error details:', error.response.data);
      
      // Try to extract SQL info from error
      const errorString = JSON.stringify(error.response.data);
      if (errorString.includes('uuid')) {
        console.log('\n⚠️  UUID ERROR DETECTED!');
        console.log('The server is trying to parse "duplicates" as a UUID');
        console.log('This confirms the route is NOT being matched correctly');
      }
    }
  }
  console.log('');
}

// Test 5: Direct route test
async function testDirectRoute() {
  console.log('Test 5: Direct Route Test');
  console.log('-------------------------');
  
  // Test if the route exists at all
  try {
    console.log('Attempting OPTIONS request to check CORS...');
    const response = await api.options('/api/contacts/duplicates');
    console.log('✓ OPTIONS request successful');
  } catch (error) {
    console.log('✗ OPTIONS request failed:', error.message);
  }
  console.log('');
}

// Main test runner
async function runTests() {
  console.log('Starting duplicate feature debug tests...\n');
  
  if (!AUTH_TOKEN || AUTH_TOKEN === 'your-auth-token-here') {
    console.log('⚠️  WARNING: No auth token provided!');
    console.log('Please set AUTH_TOKEN environment variable or update the script');
    console.log('You can get a token by logging into the app and checking localStorage');
    console.log('');
  }
  
  await testRouteOrder();
  await testDuplicateSearch();
  await testActualRoutes();
  await testSQLDebug();
  await testDirectRoute();
  
  console.log('Tests complete!');
  console.log('\n📋 Summary:');
  console.log('If you see UUID errors, the route order is still wrong');
  console.log('If you see 500 errors, check the SQL query generation');
  console.log('If you see 404 errors, the route might not be registered at all');
}

// Run tests
runTests().catch(console.error);