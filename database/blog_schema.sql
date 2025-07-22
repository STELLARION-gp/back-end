-- Blog system tables
-- Add to the main schema.sql file

-- Blog status enum
CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived');

-- Blogs table
CREATE TABLE IF NOT EXISTS blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    image_url VARCHAR(500),
    author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status blog_status DEFAULT 'draft',
    published_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blog comments table
CREATE TABLE IF NOT EXISTS blog_comments (
    id SERIAL PRIMARY KEY,
    blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blog likes table
CREATE TABLE IF NOT EXISTS blog_likes (
    id SERIAL PRIMARY KEY,
    blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blog_id, user_id)
);

-- Blog views table for tracking unique views
CREATE TABLE IF NOT EXISTS blog_views (
    id SERIAL PRIMARY KEY,
    blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON blogs(published_at);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at);
CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id ON blog_comments(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id ON blog_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_blog_id ON blog_likes(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON blog_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_views_blog_id ON blog_views(blog_id);

-- Triggers to automatically update updated_at
CREATE TRIGGER update_blogs_updated_at 
    BEFORE UPDATE ON blogs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_comments_updated_at 
    BEFORE UPDATE ON blog_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update blog stats when comments/likes change
CREATE OR REPLACE FUNCTION update_blog_stats() RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'blog_comments' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE blogs SET comment_count = comment_count + 1 WHERE id = NEW.blog_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE blogs SET comment_count = comment_count - 1 WHERE id = OLD.blog_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'blog_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE blogs SET like_count = like_count + 1 WHERE id = NEW.blog_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE blogs SET like_count = like_count - 1 WHERE id = OLD.blog_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update blog stats
CREATE TRIGGER update_blog_comment_count
    AFTER INSERT OR DELETE ON blog_comments
    FOR EACH ROW EXECUTE FUNCTION update_blog_stats();

CREATE TRIGGER update_blog_like_count
    AFTER INSERT OR DELETE ON blog_likes
    FOR EACH ROW EXECUTE FUNCTION update_blog_stats();

-- Night Camps System Tables

-- Equipment category enum
CREATE TYPE equipment_category AS ENUM ('provided', 'required', 'optional');

-- Night Camps table
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

-- Night Camps Activities table
CREATE TABLE IF NOT EXISTS night_camps_activities (
    id SERIAL PRIMARY KEY,
    night_camp_id INTEGER REFERENCES night_camps(id) ON DELETE CASCADE,
    activity VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Night Camps Equipment table
CREATE TABLE IF NOT EXISTS night_camps_equipment (
    id SERIAL PRIMARY KEY,
    night_camp_id INTEGER REFERENCES night_camps(id) ON DELETE CASCADE,
    category equipment_category NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Night Camp Volunteering table
CREATE TABLE IF NOT EXISTS night_camp_volunteering (
    id SERIAL PRIMARY KEY,
    night_camp_id INTEGER REFERENCES night_camps(id) ON DELETE CASCADE,
    volunteering_role VARCHAR(255) NOT NULL,
    number_of_applicants INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_night_camps_date ON night_camps(date);
CREATE INDEX IF NOT EXISTS idx_night_camps_location ON night_camps(location);
CREATE INDEX IF NOT EXISTS idx_night_camps_created_at ON night_camps(created_at);
CREATE INDEX IF NOT EXISTS idx_night_camps_activities_camp_id ON night_camps_activities(night_camp_id);
CREATE INDEX IF NOT EXISTS idx_night_camps_equipment_camp_id ON night_camps_equipment(night_camp_id);
CREATE INDEX IF NOT EXISTS idx_night_camps_equipment_category ON night_camps_equipment(category);
CREATE INDEX IF NOT EXISTS idx_night_camp_volunteering_camp_id ON night_camp_volunteering(night_camp_id);

-- Night Camp Volunteering Applications table
CREATE TABLE IF NOT EXISTS night_camp_volunteering_applications (
    id SERIAL PRIMARY KEY,
    night_camp_id INTEGER REFERENCES night_camps(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    volunteering_role VARCHAR(255) NOT NULL,
    motivation TEXT,
    experience TEXT,
    availability TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(night_camp_id, user_id, volunteering_role) -- Prevent duplicate applications for same role
);

-- Index for volunteering applications
CREATE INDEX IF NOT EXISTS idx_night_camp_volunteering_applications_camp_id ON night_camp_volunteering_applications(night_camp_id);
CREATE INDEX IF NOT EXISTS idx_night_camp_volunteering_applications_user_id ON night_camp_volunteering_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_night_camp_volunteering_applications_status ON night_camp_volunteering_applications(status);

-- Triggers to automatically update updated_at for night_camps
CREATE TRIGGER update_night_camps_updated_at 
    BEFORE UPDATE ON night_camps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for volunteering applications
CREATE TRIGGER update_night_camp_volunteering_applications_updated_at 
    BEFORE UPDATE ON night_camp_volunteering_applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
