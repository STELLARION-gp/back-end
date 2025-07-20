-- Application status enums
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE approve_application_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE session_format AS ENUM ('Live', 'Recorded', 'Hybrid');
CREATE TYPE payment_method AS ENUM ('Bank', 'e-wallet', 'PayPal', 'Other');

-- Mentor Application Table
CREATE TABLE IF NOT EXISTS mentor_application (
    application_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone_number VARCHAR(50),
    date_of_birth DATE,
    country VARCHAR(100),
    profile_bio TEXT,
    educational_background TEXT,
    area_of_expertise JSONB,
    linkedin_profile VARCHAR(255),
    intro_video_url VARCHAR(255),
    max_mentees INT,
    availability_schedule JSONB,
    motivation_statement TEXT,
    portfolio_attachments JSONB,
    application_status application_status DEFAULT 'pending',
    approve_application_status approve_application_status DEFAULT 'pending',
    deletion_status BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Influencer Application Table
CREATE TABLE IF NOT EXISTS influencer_application (
    application_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone_number VARCHAR(50),
    country VARCHAR(100),
    bio TEXT,
    specialization_tags JSONB,
    social_links JSONB,
    intro_video_url VARCHAR(255),
    sample_content_links JSONB,
    preferred_session_format session_format,
    willing_to_host_sessions BOOLEAN,
    tools_used JSONB,
    application_status application_status DEFAULT 'pending',
    approve_application_status approve_application_status DEFAULT 'pending',
    deletion_status BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guide Application Table
CREATE TABLE IF NOT EXISTS guide_application (
    application_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone_number VARCHAR(50),
    country VARCHAR(100),
    languages_spoken JSONB,
    certifications JSONB,
    stargazing_expertise JSONB,
    operating_locations JSONB,
    profile_bio TEXT,
    services_offered JSONB,
    max_group_size INT,
    pricing_range VARCHAR(100),
    photos_or_videos_links JSONB,
    availability_schedule JSONB,
    payment_method_pref payment_method,
    application_status application_status DEFAULT 'pending',
    approve_application_status approve_application_status DEFAULT 'pending',
    deletion_status BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Triggers to update updated_at
CREATE TRIGGER update_mentor_application_updated_at
    BEFORE UPDATE ON mentor_application
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_influencer_application_updated_at
    BEFORE UPDATE ON influencer_application
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guide_application_updated_at
    BEFORE UPDATE ON guide_application
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Soft delete triggers (prevent hard delete)
CREATE OR REPLACE FUNCTION soft_delete_application() RETURNS TRIGGER AS $$
BEGIN
    NEW.deletion_status := TRUE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- (Optional) Triggers for soft delete (if you want to intercept DELETE)
-- Not implemented here, but you can use application logic to only set deletion_status

-- Auto-fill name/email from users table for guide/influencer on insert
CREATE OR REPLACE FUNCTION autofill_user_info() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        SELECT first_name, last_name, email INTO NEW.first_name, NEW.last_name, NEW.email FROM users WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER autofill_influencer_user_info
    BEFORE INSERT ON influencer_application
    FOR EACH ROW
    EXECUTE FUNCTION autofill_user_info();

CREATE TRIGGER autofill_guide_user_info
    BEFORE INSERT ON guide_application
    FOR EACH ROW
    EXECUTE FUNCTION autofill_user_info();
-- database/schema.sql
-- Database schema for the backend application

-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'learner' , 'guide' , 'enthusiast' , 'mentor' , 'influencer');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role DEFAULT 'learner',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_data JSONB DEFAULT '{}',
    role_specific_data JSONB DEFAULT '{}'
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    profile_visibility VARCHAR(20) DEFAULT 'public',
    allow_direct_messages BOOLEAN DEFAULT true,
    show_online_status BOOLEAN DEFAULT true,
    theme VARCHAR(10) DEFAULT 'dark',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create role_upgrade_requests table
CREATE TABLE IF NOT EXISTS role_upgrade_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    current_role user_role NOT NULL,
    requested_role user_role NOT NULL,
    reason TEXT,
    supporting_evidence JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    reviewer_id INTEGER REFERENCES users(id),
    reviewer_notes TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_role_upgrade_requests_user_id ON role_upgrade_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_upgrade_requests_status ON role_upgrade_requests(status);

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin and manager users (for development/testing)
-- Note: In production, these should be created through proper Firebase Auth
INSERT INTO users (firebase_uid, email, role, first_name, last_name, display_name, is_active) VALUES
    ('admin-firebase-uid', 'admin@gmail.com', 'admin', 'System', 'Administrator', 'SysAdmin', true),
    ('moderator-firebase-uid', 'moderator@gmail.com', 'moderator', 'System', 'Moderator', 'SysMod', true),
    ('learner-firebase-uid', 'learner@gmail.com', 'learner', 'Test', 'Learner', 'TestLearner', true),
    ('guide-firebase-uid', 'guide@gmail.com', 'guide', 'Test', 'Guide', 'TestGuide', true),
    ('enthusiast-firebase-uid', 'enthusiast@gmail.com', 'enthusiast', 'Test', 'Enthusiast', 'TestEnthusiast', true),
    ('mentor-firebase-uid', 'mentor@gmail.com', 'mentor', 'Test', 'Mentor', 'TestMentor', true),
    ('influencer-firebase-uid', 'influencer@gmail.com', 'influencer', 'Test', 'Influencer', 'TestInfluencer', true)
ON CONFLICT (email) DO NOTHING;

-- Insert default settings for existing users
INSERT INTO user_settings (user_id, language, email_notifications, push_notifications, profile_visibility, allow_direct_messages, show_online_status, theme, timezone)
SELECT id, 'en', true, true, 'public', true, true, 'dark', 'UTC'
FROM users
WHERE id NOT IN (SELECT user_id FROM user_settings);
