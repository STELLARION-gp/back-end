const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'stellarion_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function testNightCampAPI() {
    try {
        console.log('🔍 Testing Night Camp API...\n');

        // Test 1: Create a sample night camp
        console.log('📝 Creating sample night camp...');
        
        const sampleNightCamp = {
            name: "Stargazing Adventure Night",
            organized_by: "Astronomy Club",
            sponsored_by: "Star Foundation",
            description: "Join us for an incredible night under the stars with telescopes, stargazing, and campfire stories.",
            date: "2025-08-15",
            time: "18:00",
            location: "Dark Sky Observatory, Colombo Hills",
            number_of_participants: 25,
            emergency_contact: "+94771234567",
            image_urls: [
                "https://example.com/night-camp-1.jpg",
                "https://example.com/night-camp-2.jpg"
            ],
            activities: [
                "Telescope observation",
                "Constellation identification",
                "Campfire stories",
                "Night photography workshop"
            ],
            equipment: {
                provided: [
                    "Professional telescopes",
                    "Star charts",
                    "Campfire materials",
                    "First aid kit"
                ],
                required: [
                    "Warm clothing",
                    "Comfortable shoes",
                    "Water bottle",
                    "Flashlight"
                ],
                optional: [
                    "Camera",
                    "Notebook",
                    "Binoculars",
                    "Portable chair"
                ]
            },
            volunteering_roles: [
                "Telescope operator",
                "Safety coordinator",
                "Activity facilitator",
                "Registration assistant"
            ]
        };

        // Send POST request to create night camp
        const response = await fetch('http://localhost:5000/api/nightcamps/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer your-test-token-here' // You'll need a valid token
            },
            body: JSON.stringify(sampleNightCamp)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Night camp created successfully!');
            console.log('📊 Created night camp ID:', result.data.id);
            
            // Test 2: Fetch the created night camp
            console.log('\n🔍 Fetching created night camp...');
            const fetchResponse = await fetch(`http://localhost:5000/api/nightcamps/${result.data.id}`);
            
            if (fetchResponse.ok) {
                const fetchResult = await fetchResponse.json();
                console.log('✅ Night camp fetched successfully!');
                console.log('📝 Activities count:', fetchResult.data.activities.length);
                console.log('🎯 Equipment items:', 
                    fetchResult.data.equipment.length,
                    'items across all categories'
                );
                console.log('👥 Volunteering roles:', fetchResult.data.volunteering.length);
            } else {
                console.log('❌ Failed to fetch night camp');
            }

            // Test 3: Fetch all night camps
            console.log('\n📋 Fetching all night camps...');
            const allCampsResponse = await fetch('http://localhost:5000/api/nightcamps/');
            
            if (allCampsResponse.ok) {
                const allCampsResult = await allCampsResponse.json();
                console.log('✅ All night camps fetched successfully!');
                console.log('📊 Total camps:', allCampsResult.data.length);
                console.log('📄 Pagination info:', allCampsResult.pagination);
            }

        } else {
            const error = await response.text();
            console.log('❌ Failed to create night camp:', error);
        }

    } catch (error) {
        console.error('❌ Error testing API:', error.message);
    }
}

async function checkDatabaseTables() {
    try {
        console.log('🔍 Checking database tables...\n');

        // Check if night camp tables exist
        const tableQueries = [
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'night_camps'",
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'night_camps_activities'",
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'night_camps_equipment'",
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'night_camp_volunteering'"
        ];

        const tableNames = ['night_camps', 'night_camps_activities', 'night_camps_equipment', 'night_camp_volunteering'];

        for (let i = 0; i < tableQueries.length; i++) {
            const result = await pool.query(tableQueries[i]);
            const exists = parseInt(result.rows[0].count) > 0;
            console.log(`${exists ? '✅' : '❌'} Table '${tableNames[i]}':`, exists ? 'EXISTS' : 'NOT FOUND');
        }

        // Check enum type
        const enumQuery = "SELECT COUNT(*) FROM pg_type WHERE typname = 'equipment_category'";
        const enumResult = await pool.query(enumQuery);
        const enumExists = parseInt(enumResult.rows[0].count) > 0;
        console.log(`${enumExists ? '✅' : '❌'} Enum 'equipment_category':`, enumExists ? 'EXISTS' : 'NOT FOUND');

    } catch (error) {
        console.error('❌ Error checking database:', error.message);
    }
}

async function main() {
    console.log('🚀 Night Camp System Test\n');
    
    // First check database tables
    await checkDatabaseTables();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Then test API (commented out because it needs authentication)
    console.log('⚠️  API testing requires valid authentication token');
    console.log('💡 Update the token in the script to test API endpoints');
    
    // Uncomment the line below after adding a valid token
    // await testNightCampAPI();
    
    await pool.end();
}

main().catch(console.error);
