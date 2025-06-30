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
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin and manager users (for development/testing)
-- Note: In production, these should be created through proper Firebase Auth
INSERT INTO users (firebase_uid, email, role, first_name, last_name, is_active) VALUES
    ('admin-firebase-uid', 'admin@gmail.com', 'admin', 'System', 'Administrator', true),
    ('moderator-firebase-uid', 'moderator@gmail.com', 'moderator', 'System', 'Moderator', true),
    ('learner-firebase-uid', 'learner@gmail.com', 'learner', 'Test', 'Learner', true),
    ('guide-firebase-uid', 'guide@gmail.com', 'guide', 'Test', 'Guide', true),
    ('enthusiast-firebase-uid', 'enthusiast@gmail.com', 'enthusiast', 'Test', 'Enthusiast', true),
    ('mentor-firebase-uid', 'mentor@gmail.com', 'mentor', 'Test', 'Mentor', true),
    ('influencer-firebase-uid', 'influencer@gmail.com', 'influencer', 'Test', 'Influencer', true)
ON CONFLICT (email) DO NOTHING;
