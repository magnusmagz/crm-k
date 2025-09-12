console.log('Testing automation actions endpoints...');
try {
  const axios = require('axios');
  axios.get('http://localhost:3001/api/automations')
    .then(() => {
      console.log('✓ Automations endpoint accessible');
      process.exit(0);
    })
    .catch(error => {
      console.error('✗ Automations test failed:', error.message);
      process.exit(1);
    });
} catch (error) {
  console.error('✗ Axios not available:', error.message);
  process.exit(1);
}