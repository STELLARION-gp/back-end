// scripts/comprehensive-health-check.js
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

async function comprehensiveHealthCheck() {
  console.log('🏥 STELLARION Backend Comprehensive Health Check');
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    issues: []
  };

  // 1. Environment Variables Check
  console.log('\n📋 1. Environment Variables');
  const requiredEnvVars = [
    'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'DB_PORT',
    'GEMINI_API_KEY', 'PAYHERE_MERCHANT_ID', 'PAYHERE_MERCHANT_SECRET'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Set`);
      results.passed++;
    } else {
      console.log(`   ❌ ${envVar}: Missing`);
      results.failed++;
      results.issues.push(`Missing environment variable: ${envVar}`);
    }
  }

  // 2. Database Connection
  console.log('\n🗄️  2. Database Connection');
  try {
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: parseInt(process.env.DB_PORT || "5432"),
    });

    const client = await pool.connect();
    console.log('   ✅ Database connection successful');
    results.passed++;
    
    // Check critical tables
    const criticalTables = ['users', 'user_settings', 'subscription_plans', 'subscriptions', 'payments'];
    for (const table of criticalTables) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (tableCheck.rows[0].exists) {
        console.log(`   ✅ Table '${table}': Exists`);
        results.passed++;
      } else {
        console.log(`   ❌ Table '${table}': Missing`);
        results.failed++;
        results.issues.push(`Missing database table: ${table}`);
      }
    }
    
    client.release();
    await pool.end();
  } catch (error) {
    console.log(`   ❌ Database connection failed: ${error.message}`);
    results.failed++;
    results.issues.push(`Database connection error: ${error.message}`);
  }

  // 3. TypeScript Compilation
  console.log('\n📝 3. TypeScript Compilation');
  try {
    const { exec } = require('child_process');
    await new Promise((resolve, reject) => {
      exec('npx tsc --noEmit', (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
    console.log('   ✅ TypeScript compilation successful');
    results.passed++;
  } catch (error) {
    console.log(`   ❌ TypeScript compilation failed: ${error.message}`);
    results.failed++;
    results.issues.push(`TypeScript compilation error: ${error.message}`);
  }

  // 4. Firebase Admin SDK
  console.log('\n🔥 4. Firebase Admin SDK');
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    if (serviceAccount && serviceAccount.project_id) {
      console.log(`   ✅ Service account key loaded (Project: ${serviceAccount.project_id})`);
      results.passed++;
    } else {
      console.log('   ❌ Invalid service account key');
      results.failed++;
      results.issues.push('Invalid Firebase service account key');
    }
  } catch (error) {
    console.log(`   ❌ Firebase service account key error: ${error.message}`);
    results.failed++;
    results.issues.push(`Firebase service account error: ${error.message}`);
  }

  // 5. API Health Check (if server is running)
  console.log('\n🌐 5. API Health Check');
  try {
    const healthResponse = await axios.get('http://localhost:5000/health', { timeout: 5000 });
    if (healthResponse.data && healthResponse.data.status === 'healthy') {
      console.log('   ✅ API server is healthy');
      results.passed++;
    } else {
      console.log('   ❌ API server unhealthy response');
      results.failed++;
      results.issues.push('API server returned unhealthy response');
    }
  } catch (error) {
    console.log('   ⚠️  API server not running (start with: npm start)');
    // Not counting this as failed since server might not be running
  }

  // 6. PayHere Configuration
  console.log('\n💳 6. PayHere Configuration');
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  
  if (merchantId && merchantId.length === 7) {
    console.log('   ✅ PayHere Merchant ID format valid');
    results.passed++;
  } else {
    console.log('   ❌ PayHere Merchant ID invalid format');
    results.failed++;
    results.issues.push('PayHere Merchant ID should be 7 digits');
  }
  
  if (merchantSecret && merchantSecret.length > 30) {
    console.log('   ✅ PayHere Merchant Secret format valid');
    results.passed++;
  } else {
    console.log('   ❌ PayHere Merchant Secret invalid format');
    results.failed++;
    results.issues.push('PayHere Merchant Secret appears invalid');
  }

  // 7. Gemini AI Configuration
  console.log('\n🤖 7. Gemini AI Configuration');
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.startsWith('AIza')) {
    console.log('   ✅ Gemini API key format valid');
    results.passed++;
  } else {
    console.log('   ❌ Gemini API key invalid format');
    results.failed++;
    results.issues.push('Gemini API key should start with "AIza"');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 HEALTH CHECK SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Checks Passed: ${results.passed}`);
  console.log(`❌ Checks Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.issues.length > 0) {
    console.log('\n🚨 Issues Found:');
    results.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }

  if (results.failed === 0) {
    console.log('\n🎉 All critical components are healthy!');
    console.log('💡 Ready for production deployment');
  } else if (results.failed <= 2) {
    console.log('\n⚠️  Minor issues detected - system mostly operational');
  } else {
    console.log('\n🚨 Critical issues detected - requires attention');
  }

  console.log('\n🚀 Next Steps:');
  console.log('   1. Start server: npm run dev');
  console.log('   2. Test API endpoints: npm run test-all');
  console.log('   3. Run frontend and test full integration');
}

comprehensiveHealthCheck().catch(console.error);
