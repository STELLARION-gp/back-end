/**
 * Apply Provider Payment Triggers Migration
 * 
 * This script applies database triggers that automatically update
 * provider_payments table when service_bookings or session_enrollments
 * are completed.
 * 
 * Usage:
 *   npx tsx scripts/apply-provider-triggers.ts
 */

import { PrismaClient } from '../prisma/generated/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function applyTriggers() {
  console.log('🚀 Applying Provider Payment Triggers\n');
  console.log('='.repeat(60));

  // Create PostgreSQL client for raw SQL execution
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../prisma/migrations/create_provider_payment_triggers.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log(`   Path: ${sqlPath}`);
    console.log(`   Size: ${(sql.length / 1024).toFixed(2)} KB\n`);

    // Connect to database
    console.log('🔌 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected!\n');

    // Execute the SQL
    console.log('⚙️  Executing SQL migration...\n');
    
    await client.query(sql);
    
    console.log('✅ Triggers and functions created successfully!\n');

    // Verify triggers were created
    console.log('🔍 Verifying triggers...\n');
    
    const triggers = await prisma.$queryRaw<any[]>`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%provider_payment%'
      ORDER BY event_object_table, trigger_name;
    `;

    if (triggers.length > 0) {
      console.log('✅ Triggers verified:\n');
      triggers.forEach((trigger) => {
        console.log(`   📌 ${trigger.trigger_name}`);
        console.log(`      Table: ${trigger.event_object_table}`);
        console.log(`      Events: ${trigger.event_manipulation}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No triggers found. This might indicate an issue.\n');
    }

    // Verify functions were created
    console.log('🔍 Verifying functions...\n');
    
    const functions = await prisma.$queryRaw<any[]>`
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines 
      WHERE routine_name LIKE '%provider_payment%'
        AND routine_schema = 'public'
      ORDER BY routine_name;
    `;

    if (functions.length > 0) {
      console.log('✅ Functions verified:\n');
      functions.forEach((func) => {
        console.log(`   🔧 ${func.routine_name} (${func.routine_type})`);
      });
      console.log('');
    }

    // Check indexes
    console.log('🔍 Verifying indexes...\n');
    
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT 
        indexname,
        tablename
      FROM pg_indexes
      WHERE indexname LIKE '%provider_payment%'
         OR indexname LIKE '%created_by%'
      ORDER BY tablename, indexname;
    `;

    if (indexes.length > 0) {
      console.log('✅ Indexes verified:\n');
      indexes.forEach((idx) => {
        console.log(`   📊 ${idx.indexname} on ${idx.tablename}`);
      });
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('✅ Migration Complete!\n');
    console.log('📋 What was created:');
    console.log(`   - ${triggers.length} database triggers`);
    console.log(`   - ${functions.length} functions`);
    console.log(`   - ${indexes.length} indexes`);
    console.log('\n🎯 Next Steps:');
    console.log('   1. Test the triggers with: npx tsx scripts/test-triggers.ts');
    console.log('   2. Backfill existing data: npx tsx scripts/backfill-provider-payments.ts');
    console.log('   3. New bookings/enrollments will auto-update provider_payments');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error applying triggers:', error);
    throw error;
  } finally {
    // Disconnect from database
    await client.end();
  }
}

// Execute the migration
applyTriggers()
  .then(() => {
    console.log('\n✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
