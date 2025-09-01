const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login...');
    
    const response = await axios.post('http://localhost:4001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      }
    });
    
    console.log('Login successful:', response.data);
    
    // Test if we can access the dashboard with the token
    const token = response.data.data.accessToken;
    console.log('Token received:', token ? 'Yes' : 'No');
    
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
}

testLogin();
