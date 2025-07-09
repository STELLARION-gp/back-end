// scripts/test-all-apis.js
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

// Test data
const testUser = {
  firebaseUser: {
    uid: 'test-api-user-' + Date.now(),
    email: `test-${Date.now()}@example.com`,
    name: 'Test User'
  },
  role: 'learner',
  first_name: 'Test',
  last_name: 'User'
};

let authToken = null;

// Helper function to create headers with auth
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': authToken ? `Bearer ${authToken}` : ''
});

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testChatbotHealth() {
  console.log('\n🤖 Testing Chatbot Health...');
  try {
    const response = await axios.get(`${BASE_URL}/api/chatbot/health`);
    console.log('✅ Chatbot health check passed:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Chatbot health check failed:', error.message);
    return false;
  }
}

async function testUserRegistration() {
  console.log('\n👤 Testing User Registration...');
  try {
    const response = await axios.post(`${BASE_URL}/api/users/test-register`, testUser);
    console.log('✅ User registration passed:', response.data.message);
    return response.data.data;
  } catch (error) {
    console.log('❌ User registration failed:', error.response?.data || error.message);
    return null;
  }
}

async function testUserProfile() {
  console.log('\n📋 Testing User Profile...');
  try {
    const response = await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: getAuthHeaders()
    });
    console.log('✅ User profile retrieval passed');
    return response.data.data;
  } catch (error) {
    console.log('❌ User profile retrieval failed:', error.response?.data || error.message);
    return null;
  }
}

async function testDetailedProfile() {
  console.log('\n🔍 Testing Detailed Profile...');
  try {
    const response = await axios.get(`${BASE_URL}/api/user/profile`, {
      headers: getAuthHeaders()
    });
    console.log('✅ Detailed profile retrieval passed');
    return response.data.data;
  } catch (error) {
    console.log('❌ Detailed profile retrieval failed:', error.response?.data || error.message);
    return null;
  }
}

async function testUpdateDetailedProfile() {
  console.log('\n✏️ Testing Update Detailed Profile...');
  try {
    const updateData = {
      first_name: 'Updated',
      last_name: 'Name',
      display_name: 'UpdatedUser',
      profile_data: {
        bio: 'Updated bio for testing',
        location: 'Test City',
        astronomy_experience: 'intermediate',
        favorite_astronomy_fields: ['Astrophysics', 'Planetary Science']
      },
      role_specific_data: {
        learning_goals: ['Master astrophotography'],
        current_projects: ['M31 imaging series']
      }
    };

    const response = await axios.put(`${BASE_URL}/api/user/profile`, updateData, {
      headers: getAuthHeaders()
    });
    console.log('✅ Profile update passed');
    return response.data.data;
  } catch (error) {
    console.log('❌ Profile update failed:', error.response?.data || error.message);
    return null;
  }
}

async function testUserSettings() {
  console.log('\n⚙️ Testing User Settings...');
  try {
    // Get settings
    const getResponse = await axios.get(`${BASE_URL}/api/user/settings`, {
      headers: getAuthHeaders()
    });
    console.log('✅ Get settings passed');

    // Update settings
    const updateData = {
      theme: 'light',
      language: 'es',
      email_notifications: false,
      profile_visibility: 'community-only'
    };

    const updateResponse = await axios.put(`${BASE_URL}/api/user/settings`, updateData, {
      headers: getAuthHeaders()
    });
    console.log('✅ Update settings passed');
    return updateResponse.data.data;
  } catch (error) {
    console.log('❌ Settings test failed:', error.response?.data || error.message);
    return null;
  }
}

async function testRoleUpgradeRequest() {
  console.log('\n🎯 Testing Role Upgrade Request...');
  try {
    const requestData = {
      requested_role: 'mentor',
      reason: 'I have extensive experience in astronomy and want to help others learn',
      supporting_evidence: [
        'PhD in Astrophysics',
        '10+ years of teaching experience',
        'Published research papers'
      ]
    };

    const response = await axios.post(`${BASE_URL}/api/user/role-upgrade`, requestData, {
      headers: getAuthHeaders()
    });
    console.log('✅ Role upgrade request passed');
    return response.data.data;
  } catch (error) {
    console.log('❌ Role upgrade request failed:', error.response?.data || error.message);
    return null;
  }
}

async function testRoleUpgradeStatus() {
  console.log('\n📊 Testing Role Upgrade Status...');
  try {
    const response = await axios.get(`${BASE_URL}/api/user/role-upgrade/status`, {
      headers: getAuthHeaders()
    });
    console.log('✅ Role upgrade status passed');
    return response.data.data;
  } catch (error) {
    console.log('❌ Role upgrade status failed:', error.response?.data || error.message);
    return null;
  }
}

async function testChatbot() {
  console.log('\n💬 Testing Chatbot...');
  try {
    const chatData = {
      message: 'What is Mars?',
      context: 'space_exploration_assistant'
    };

    const response = await axios.post(`${BASE_URL}/api/chatbot`, chatData);
    console.log('✅ Chatbot response passed');
    return response.data;
  } catch (error) {
    console.log('❌ Chatbot failed:', error.response?.data || error.message);
    return null;
  }
}

async function testDataExport() {
  console.log('\n📄 Testing Data Export...');
  try {
    const response = await axios.get(`${BASE_URL}/api/user/data-export`, {
      headers: getAuthHeaders()
    });
    console.log('✅ Data export passed');
    return response.data.data;
  } catch (error) {
    console.log('❌ Data export failed:', error.response?.data || error.message);
    return null;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Tests');
  console.log('='.repeat(50));

  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first.');
    console.error('Run: npm run dev');
    process.exit(1);
  }

  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Chatbot Health', fn: testChatbotHealth },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Profile', fn: testUserProfile },
    { name: 'Detailed Profile', fn: testDetailedProfile },
    { name: 'Update Profile', fn: testUpdateDetailedProfile },
    { name: 'User Settings', fn: testUserSettings },
    { name: 'Role Upgrade Request', fn: testRoleUpgradeRequest },
    { name: 'Role Upgrade Status', fn: testRoleUpgradeStatus },
    { name: 'Chatbot', fn: testChatbot },
    { name: 'Data Export', fn: testDataExport }
  ];

  // Set up auth token for protected routes (using a mock token for testing)
  authToken = 'mock-token-for-testing';

  for (const test of tests) {
    testResults.total++;
    try {
      const result = await test.fn();
      if (result !== null && result !== false) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    } catch (error) {
      testResults.failed++;
      console.log(`❌ Test ${test.name} threw error:`, error.message);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n⚠️  Some tests failed. This is expected for protected routes without proper Firebase auth.');
    console.log('💡 To test protected routes properly:');
    console.log('   1. Start the server with: npm run dev');
    console.log('   2. Update the database schema with: node scripts/update-database-schema.js');
    console.log('   3. Create Firebase test users with: node scripts/create-firebase-users.js');
    console.log('   4. Use the frontend to test with real Firebase authentication');
  }

  console.log('\n🔗 Available API Endpoints:');
  console.log('   GET  /health - Health check');
  console.log('   GET  /api/chatbot/health - Chatbot health');
  console.log('   POST /api/chatbot - Chat with AI assistant');
  console.log('   POST /api/users/register - Register user');
  console.log('   GET  /api/users/profile - Get user profile');
  console.log('   GET  /api/users - Get all users (admin)');
  console.log('   GET  /api/user/profile - Get detailed profile');
  console.log('   PUT  /api/user/profile - Update detailed profile');
  console.log('   GET  /api/user/settings - Get user settings');
  console.log('   PUT  /api/user/settings - Update user settings');
  console.log('   POST /api/user/role-upgrade - Request role upgrade');
  console.log('   GET  /api/user/role-upgrade/status - Get role upgrade status');
  console.log('   GET  /api/user/data-export - Export user data');
  console.log('   POST /api/auth/signup - Sign up user');
  console.log('   POST /api/auth/signin - Sign in user');
  console.log('   PUT  /api/auth/profile - Update auth profile');
  console.log('   PUT  /api/auth/change-password - Change password');
  console.log('   DELETE /api/auth/account - Delete account');
}

// Run the tests
runAllTests().catch(console.error);
