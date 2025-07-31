const axios = require('axios');

async function testAuth() {
  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const health = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is running:', health.data);

    // Test registration
    console.log('\nTesting registration...');
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    try {
      const register = await axios.post('http://localhost:5000/api/auth/register', userData);
      console.log('✅ Registration successful:', register.data);
      return register.data.token;
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'Email already registered') {
        console.log('User already exists, trying login...');
        const login = await axios.post('http://localhost:5000/api/auth/login', {
          email: userData.email,
          password: userData.password
        });
        console.log('✅ Login successful');
        return login.data.token;
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Server is not running on port 5000');
    }
  }
}

testAuth();