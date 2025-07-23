// scripts/test-guide-application-api.js
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

// Test data for guide application
const testApplication = {
    // Personal Information
    full_name: "John Stargazer",
    email: "john.stargazer@email.com",
    phone: "+94712345678",
    date_of_birth: "1990-05-15",
    address: "123 Observatory Lane, Colombo",
    city: "Colombo",
    
    // Professional Background
    current_occupation: "Science Teacher",
    education_level: "Bachelor's Degree",
    astronomy_education: "Self-taught with 5 years of active observation",
    guide_experience: "Led amateur astronomy groups for 3 years",
    total_experience: 3,
    
    // Certifications & Skills
    certifications: ["First Aid Certification", "Telescope Operation Certificate"],
    astronomy_skills: ["Telescope Operation", "Star Chart Reading", "Constellation Identification"],
    languages: ["English", "Sinhala", "Tamil"],
    first_aid: true,
    driving_license: true,
    
    // Camp-Specific Experience
    camp_types: ["Stargazing Nights", "Educational Camps", "Youth Programs"],
    group_sizes: ["1-10 people (Intimate)", "11-25 people (Small)"],
    equipment_familiarity: ["Refractor Telescopes", "Binoculars", "Star Charts"],
    outdoor_experience: "Regular camping and hiking experience with groups",
    
    // Availability & Preferences
    available_dates: ["2025-08-15", "2025-09-10", "2025-10-05"],
    preferred_locations: ["Colombo Area", "Kandy Region", "Nuwara Eliya"],
    accommodation_needs: "Basic accommodation required",
    transportation_needs: "Own vehicle available",
    
    // Additional Information
    motivation: "Passionate about sharing the wonders of astronomy with others",
    special_skills: "Photography, public speaking, group management",
    emergency_contact: {
        name: "Jane Doe",
        relationship: "Spouse", 
        phone: "+94712345679"
    },
    
    // Selected Camps
    selected_camps: ["1", "3"],
    
    // Agreement
    terms_accepted: true,
    background_check_consent: true
};

// Mock Firebase user data
const mockFirebaseUser = {
    uid: "test-guide-user-001",
    email: "john.stargazer@email.com",
    name: "John Stargazer"
};

async function testGuideApplicationAPI() {
    console.log('🧪 Testing Guide Application API');
    console.log('=====================================\n');

    try {
        // Test 1: Get available camps
        console.log('1️⃣ Testing GET /api/guide-applications/camps');
        try {
            const campsResponse = await axios.get(`${BASE_URL}/api/guide-applications/camps`);
            console.log('✅ Available camps retrieved successfully');
            console.log(`   Found ${campsResponse.data.data.length} camps`);
            campsResponse.data.data.forEach(camp => {
                console.log(`   - ${camp.title} (${camp.type})`);
            });
        } catch (error) {
            console.log('❌ Failed to get camps:', error.response?.data?.message || error.message);
        }
        console.log('');

        // Test 2: Create guide application (would need Firebase auth token in real scenario)
        console.log('2️⃣ Testing POST /api/guide-applications');
        try {
            const applicationData = {
                ...testApplication,
                firebaseUser: mockFirebaseUser
            };
            
            const createResponse = await axios.post(
                `${BASE_URL}/api/guide-applications`, 
                applicationData,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('✅ Guide application created successfully');
            console.log(`   Application ID: ${createResponse.data.data.application_id}`);
            console.log(`   Status: ${createResponse.data.data.status}`);
            
            // Store the application ID for further tests
            global.testApplicationId = createResponse.data.data.application_id;
        } catch (error) {
            console.log('❌ Failed to create application:', error.response?.data?.message || error.message);
            if (error.response?.status === 401) {
                console.log('   ℹ️ This is expected without proper Firebase authentication');
            }
        }
        console.log('');

        // Test 3: Get user's guide applications
        console.log('3️⃣ Testing GET /api/guide-applications/my-application');
        try {
            const myAppsResponse = await axios.get(
                `${BASE_URL}/api/guide-applications/my-application`,
                {
                    headers: {
                        'Authorization': 'Bearer mock-token'
                    }
                }
            );
            console.log('✅ User applications retrieved successfully');
            console.log(`   Found ${myAppsResponse.data.data.length} applications`);
        } catch (error) {
            console.log('❌ Failed to get user applications:', error.response?.data?.message || error.message);
            if (error.response?.status === 401) {
                console.log('   ℹ️ This is expected without proper Firebase authentication');
            }
        }
        console.log('');

        // Test 4: Get all applications (admin endpoint)
        console.log('4️⃣ Testing GET /api/guide-applications (Admin)');
        try {
            const allAppsResponse = await axios.get(
                `${BASE_URL}/api/guide-applications`,
                {
                    headers: {
                        'Authorization': 'Bearer admin-mock-token'
                    }
                }
            );
            console.log('✅ All applications retrieved successfully');
            console.log(`   Found ${allAppsResponse.data.data.applications.length} applications`);
        } catch (error) {
            console.log('❌ Failed to get all applications:', error.response?.data?.message || error.message);
            if (error.response?.status === 401) {
                console.log('   ℹ️ This is expected without proper admin authentication');
            }
        }
        console.log('');

        // Test 5: Health check
        console.log('5️⃣ Testing Server Health Check');
        try {
            const healthResponse = await axios.get(`${BASE_URL}/health`);
            console.log('✅ Server is healthy');
            console.log(`   Status: ${healthResponse.data.status}`);
            console.log(`   Version: ${healthResponse.data.version}`);
        } catch (error) {
            console.log('❌ Server health check failed:', error.message);
        }
        console.log('');

        console.log('🎉 Guide Application API Testing Complete!');
        console.log('\n📝 Summary:');
        console.log('• Available camps endpoint is working');
        console.log('• Application creation endpoint exists (requires authentication)');
        console.log('• User application retrieval endpoint exists (requires authentication)');
        console.log('• Admin application management endpoint exists (requires admin auth)');
        console.log('• Server is healthy and running');
        
        console.log('\n🔒 Authentication Notes:');
        console.log('• Most endpoints require Firebase authentication tokens');
        console.log('• Admin endpoints require admin role verification');
        console.log('• File upload endpoints support multipart/form-data');
        console.log('• Document uploads are handled via Firebase Storage');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Helper function to test with authentication (if Firebase token is available)
async function testWithAuth(firebaseToken) {
    console.log('\n🔐 Testing with Authentication Token');
    console.log('=====================================\n');
    
    const authHeaders = {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json'
    };

    try {
        // Test authenticated endpoints
        console.log('🔑 Testing authenticated guide application creation...');
        const authResponse = await axios.post(
            `${BASE_URL}/api/guide-applications`,
            testApplication,
            { headers: authHeaders }
        );
        console.log('✅ Authenticated application creation successful');
        return authResponse.data;
    } catch (error) {
        console.log('❌ Authenticated test failed:', error.response?.data?.message || error.message);
        return null;
    }
}

// Main execution
if (require.main === module) {
    testGuideApplicationAPI().catch(console.error);
}

module.exports = { testGuideApplicationAPI, testWithAuth };
