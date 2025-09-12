console.log('Testing round robin endpoints...');
try {
  const axios = require('axios');
  axios.get('http://localhost:3001/api/round-robin/dashboard')
    .then(() => {
      console.log('✓ Round robin endpoint accessible');
      process.exit(0);
    })
    .catch(error => {
      console.error('✗ Round robin test failed:', error.message);
      process.exit(1);
    });
} catch (error) {
  console.error('✗ Axios not available:', error.message);
  process.exit(1);
}