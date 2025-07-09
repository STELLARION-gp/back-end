// scripts/quick-test.js
const axios = require('axios');

async function quickTest() {
  try {
    console.log('Testing chatbot API...');
    
    const response = await axios.post('http://localhost:5000/api/chatbot', {
      message: 'What is Mars?',
      context: 'space_exploration_assistant'
    }, {
      timeout: 30000
    });
    
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:');
    console.error(error.response?.data || error.message);
  }
}

quickTest();
