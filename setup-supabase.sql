-- Supabase Database Setup for Cyclone Relief Fund Analytics
-- Run this SQL in your Supabase SQL Editor

-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
    id BIGSERIAL PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    referrer TEXT,
    url TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_label TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create login_visits table
CREATE TABLE IF NOT EXISTS login_visits (
    id BIGSERIAL PRIMARY KEY,
    page TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    referrer TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGSERIAL PRIMARY KEY,
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    attempted_password_length INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_visits_timestamp ON visits(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_login_visits_timestamp ON login_visits(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);

-- Enable Row Level Security (RLS) - Allow public read/write for analytics
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public insert on visits" ON visits;
DROP POLICY IF EXISTS "Allow public select on visits" ON visits;
DROP POLICY IF EXISTS "Allow public insert on events" ON events;
DROP POLICY IF EXISTS "Allow public select on events" ON events;
DROP POLICY IF EXISTS "Allow public insert on login_visits" ON login_visits;
DROP POLICY IF EXISTS "Allow public select on login_visits" ON login_visits;
DROP POLICY IF EXISTS "Allow public insert on login_attempts" ON login_attempts;
DROP POLICY IF EXISTS "Allow public select on login_attempts" ON login_attempts;

-- Create policies to allow public access (for analytics)
CREATE POLICY "Allow public insert on visits" ON visits
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on visits" ON visits
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on events" ON events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on events" ON events
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on login_visits" ON login_visits
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on login_visits" ON login_visits
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on login_attempts" ON login_attempts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on login_attempts" ON login_attempts
    FOR SELECT USING (true);

-- Create gallery_photos table
CREATE TABLE IF NOT EXISTS gallery_photos (
    id BIGSERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for gallery_photos
CREATE INDEX IF NOT EXISTS idx_gallery_photos_display_order ON gallery_photos(display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_created_at ON gallery_photos(created_at DESC);

-- Enable Row Level Security for gallery_photos
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public select on gallery_photos" ON gallery_photos;
DROP POLICY IF EXISTS "Allow public insert on gallery_photos" ON gallery_photos;
DROP POLICY IF EXISTS "Allow public update on gallery_photos" ON gallery_photos;
DROP POLICY IF EXISTS "Allow public delete on gallery_photos" ON gallery_photos;

-- Create policies to allow public read, but only authenticated admin for write
-- For now, we'll allow public write (you can restrict this later with proper auth)
CREATE POLICY "Allow public select on gallery_photos" ON gallery_photos
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on gallery_photos" ON gallery_photos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on gallery_photos" ON gallery_photos
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on gallery_photos" ON gallery_photos
    FOR DELETE USING (true);

