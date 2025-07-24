require('dotenv').config();
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testImportEndpoint() {
  try {
    console.log('🧪 Testing Deal Import Endpoint\n');

    // First, we need a valid auth token
    // For testing, we'll need to use an existing user's credentials
    console.log('⚠️  This test requires a valid API token.');
    console.log('   Please set the AUTH_TOKEN environment variable');
    console.log('   Example: AUTH_TOKEN=your_token_here node scripts/test-import-endpoint.js\n');

    const authToken = process.env.AUTH_TOKEN;
    if (!authToken) {
      console.log('❌ No AUTH_TOKEN provided. Exiting.');
      return;
    }

    const API_URL = process.env.API_URL || 'http://localhost:3001/api';
    
    // Read the sample CSV
    const csvPath = path.join(__dirname, 'sample-deals.csv');
    const csvBuffer = fs.readFileSync(csvPath);

    // Step 1: Get preview
    console.log('📋 Step 1: Getting CSV preview...');
    const formData1 = new FormData();
    formData1.append('file', csvBuffer, {
      filename: 'sample-deals.csv',
      contentType: 'text/csv'
    });

    const previewResponse = await axios.post(
      `${API_URL}/deals/import/preview`,
      formData1,
      {
        headers: {
          ...formData1.getHeaders(),
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    console.log('✅ Preview response received');
    console.log('   Headers:', previewResponse.data.headers);
    console.log('   Suggested mapping:', JSON.stringify(previewResponse.data.suggestedMapping, null, 2));
    console.log('   Total rows:', previewResponse.data.totalRows);
    console.log('   Stages available:', previewResponse.data.stages.length);

    // Step 2: Import with the suggested mapping
    console.log('\n📦 Step 2: Importing deals...');
    const formData2 = new FormData();
    formData2.append('file', csvBuffer, {
      filename: 'sample-deals.csv',
      contentType: 'text/csv'
    });
    formData2.append('fieldMapping', JSON.stringify(previewResponse.data.suggestedMapping));
    formData2.append('stageMapping', JSON.stringify({}));
    formData2.append('contactStrategy', 'create');
    formData2.append('duplicateStrategy', 'skip');
    formData2.append('defaultStageId', previewResponse.data.stages[0]?.id || '');
    formData2.append('requireContact', 'true');

    const importResponse = await axios.post(
      `${API_URL}/deals/import`,
      formData2,
      {
        headers: {
          ...formData2.getHeaders(),
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    console.log('✅ Import completed');
    console.log('   Results:', JSON.stringify(importResponse.data.results, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.results?.errors) {
      console.log('\n📋 Import errors:');
      error.response.data.results.errors.forEach(err => {
        console.log(`   Row ${err.row}: ${err.error}`);
      });
    }
  }
}

testImportEndpoint();