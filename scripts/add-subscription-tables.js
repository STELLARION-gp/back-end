// add-subscription-tables.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || "5432"),
});

const addSubscriptionTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding subscription-related tables and columns...');

    // Create subscription plan types
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE subscription_plan AS ENUM ('starseeker', 'galaxy_explorer', 'cosmic_voyager');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'pending');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add subscription columns to users table if they don't exist
    console.log('Adding subscription columns to users table...');
    
    const addColumns = [
      { name: 'subscription_plan', type: 'subscription_plan DEFAULT \'starseeker\'' },
      { name: 'subscription_status', type: 'subscription_status DEFAULT \'active\'' },
      { name: 'subscription_start_date', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'subscription_end_date', type: 'TIMESTAMP' },
      { name: 'auto_renew', type: 'BOOLEAN DEFAULT false' },
      { name: 'chatbot_questions_used', type: 'INTEGER DEFAULT 0' },
      { name: 'chatbot_questions_reset_date', type: 'DATE DEFAULT CURRENT_DATE' }
    ];

    for (const column of addColumns) {
      try {
        await client.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.code === '42701') {
          console.log(`⚠️  Column ${column.name} already exists, skipping...`);
        } else {
          console.error(`❌ Error adding column ${column.name}:`, error.message);
        }
      }
    }

    // Create subscription_plans table
    console.log('Creating subscription_plans table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        plan_type subscription_plan UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_lkr DECIMAL(10,2) NOT NULL,
        price_usd DECIMAL(10,2),
        features JSONB NOT NULL,
        chatbot_questions_limit INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create subscriptions table
    console.log('Creating subscriptions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_type subscription_plan NOT NULL,
        status subscription_status DEFAULT 'pending',
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        auto_renew BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT
      )
    `);

    // Create payments table
    console.log('Creating payments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'LKR',
        payment_status payment_status DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_gateway VARCHAR(50) DEFAULT 'payhere',
        gateway_transaction_id VARCHAR(255),
        gateway_order_id VARCHAR(255),
        payment_date TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create chatbot_usage table
    console.log('Creating chatbot_usage table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS chatbot_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        question_count INTEGER DEFAULT 1,
        usage_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, usage_date)
      )
    `);

    // Add indexes
    console.log('Adding indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan)',
      'CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status)',
      'CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)',
      'CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status)',
      'CREATE INDEX IF NOT EXISTS idx_chatbot_usage_user_date ON chatbot_usage(user_id, usage_date)'
    ];

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        console.log('✅ Index created successfully');
      } catch (error) {
        console.log('⚠️  Index already exists, skipping...');
      }
    }

    // Add triggers
    console.log('Adding triggers...');
    const triggers = [
      'CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
    ];

    for (const triggerQuery of triggers) {
      try {
        await client.query(triggerQuery);
        console.log('✅ Trigger created successfully');
      } catch (error) {
        console.log('⚠️  Trigger already exists, skipping...');
      }
    }

    // Insert subscription plans
    console.log('Inserting subscription plans...');
    await client.query(`
      INSERT INTO subscription_plans (plan_type, name, description, price_lkr, price_usd, features, chatbot_questions_limit) VALUES
        ('starseeker', 'StarSeeker Plan', 'For curious learners, students, or casual space lovers starting their astronomy journey.', 0.00, 0.00, 
         '["Access to basic astronomy lessons", "Daily NASA photo feed", "Monthly celestial event calendar", "Access to discussion forums", "Limited access to AI chatbot (3 questions/day)"]'::jsonb, 3),
        ('galaxy_explorer', 'Galaxy Explorer Plan', 'For hobbyists, school students, teachers, and astronomy enthusiasts looking for more depth.', 990.00, 5.90, 
         '["Access to basic and intermediate astronomy lessons", "Daily NASA photo feed", "Monthly celestial event calendar", "Access to discussion forums", "Access to intermediate lessons & quizzes", "Unlimited AI chatbot questions", "RSVP to night camps & workshops"]'::jsonb, -1),
        ('cosmic_voyager', 'Cosmic Voyager Plan', 'For advanced learners, educators, astro-nerds, and families wanting the full immersive experience.', 2490.00, 14.90, 
         '["Access to basic, intermediate, advanced astronomy lessons & certifications", "Daily NASA photo feed", "Monthly celestial event calendar", "Access to discussion forums", "Access to intermediate lessons & quizzes", "Unlimited AI chatbot questions", "RSVP to night camps & workshops", "1-on-1 tutor sessions", "Priority access to exclusive night camps", "Early access to new features", "Feature request priority"]'::jsonb, -1)
      ON CONFLICT (plan_type) DO NOTHING
    `);

    console.log('🎉 Subscription tables and data added successfully!');

  } catch (error) {
    console.error('❌ Error adding subscription tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run the migration
addSubscriptionTables()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
