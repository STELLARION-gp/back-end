const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || "5432"),
});

async function addNightCampTables() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Adding Night Camp tables to database...\n');

        await client.query('BEGIN');

        // Equipment category enum
        console.log('📝 Creating equipment_category enum...');
        await client.query(`
            DO $$ BEGIN
                CREATE TYPE equipment_category AS ENUM ('provided', 'required', 'optional');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('✅ Equipment category enum created/exists');

        // Night Camps table
        console.log('📝 Creating night_camps table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS night_camps (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                organized_by VARCHAR(255),
                sponsored_by VARCHAR(255),
                description TEXT,
                date DATE NOT NULL,
                time TIME,
                location VARCHAR(500) NOT NULL,
                number_of_participants INTEGER DEFAULT 0,
                image_urls JSONB DEFAULT '[]',
                emergency_contact VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Night camps table created/exists');

        // Night Camps Activities table
        console.log('📝 Creating night_camps_activities table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS night_camps_activities (
                id SERIAL PRIMARY KEY,
                night_camp_id INTEGER REFERENCES night_camps(id) ON DELETE CASCADE,
                activity VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Night camps activities table created/exists');

        // Night Camps Equipment table
        console.log('📝 Creating night_camps_equipment table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS night_camps_equipment (
                id SERIAL PRIMARY KEY,
                night_camp_id INTEGER REFERENCES night_camps(id) ON DELETE CASCADE,
                category equipment_category NOT NULL,
                equipment_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Night camps equipment table created/exists');

        // Night Camp Volunteering table
        console.log('📝 Creating night_camp_volunteering table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS night_camp_volunteering (
                id SERIAL PRIMARY KEY,
                night_camp_id INTEGER REFERENCES night_camps(id) ON DELETE CASCADE,
                volunteering_role VARCHAR(255) NOT NULL,
                number_of_applicants INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Night camp volunteering table created/exists');

        // Create indexes
        console.log('📝 Creating indexes...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_night_camps_date ON night_camps(date);',
            'CREATE INDEX IF NOT EXISTS idx_night_camps_location ON night_camps(location);',
            'CREATE INDEX IF NOT EXISTS idx_night_camps_created_at ON night_camps(created_at);',
            'CREATE INDEX IF NOT EXISTS idx_night_camps_activities_camp_id ON night_camps_activities(night_camp_id);',
            'CREATE INDEX IF NOT EXISTS idx_night_camps_equipment_camp_id ON night_camps_equipment(night_camp_id);',
            'CREATE INDEX IF NOT EXISTS idx_night_camps_equipment_category ON night_camps_equipment(category);',
            'CREATE INDEX IF NOT EXISTS idx_night_camp_volunteering_camp_id ON night_camp_volunteering(night_camp_id);'
        ];

        for (const indexQuery of indexes) {
            await client.query(indexQuery);
        }
        console.log('✅ Indexes created/exist');

        // Create update trigger function if it doesn't exist
        console.log('📝 Creating update function and triggers...');
        await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // Create trigger for night_camps
        await client.query(`
            DROP TRIGGER IF EXISTS update_night_camps_updated_at ON night_camps;
            CREATE TRIGGER update_night_camps_updated_at 
                BEFORE UPDATE ON night_camps 
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('✅ Update triggers created');

        await client.query('COMMIT');

        // Verify tables exist
        console.log('\n🔍 Verifying table creation...');
        const tableCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%night_camp%' 
            ORDER BY table_name;
        `);

        console.log('📊 Night camp related tables:');
        tableCheck.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });

        console.log('\n🎉 Night Camp tables setup completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error setting up night camp tables:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await addNightCampTables();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
