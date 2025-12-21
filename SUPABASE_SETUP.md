# Supabase Setup Guide

This guide will help you set up Supabase to store analytics data for the Cyclone Relief Fund dashboard.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: `cyclone-relief-fund` (or any name you prefer)
   - **Database Password**: Choose a strong password (save it securely)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the following SQL:

```sql
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
```

4. Click "Run" to execute the SQL
5. You should see "Success. No rows returned"

## Step 4: Configure Netlify Environment Variables

1. Go to your Netlify project dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following environment variables:

   - **Variable name**: `SUPABASE_URL`
     - **Value**: Your Supabase Project URL (from Step 2)
   
   - **Variable name**: `SUPABASE_ANON_KEY`
     - **Value**: Your Supabase anon/public key (from Step 2)

4. Click "Save"

## Step 5: Redeploy Your Site

1. In Netlify, go to **Deploys**
2. Click "Trigger deploy" → "Deploy site"
3. Wait for the deployment to complete

## Step 6: Verify It's Working

1. Visit your live site from a different device/browser
2. Log into the admin dashboard
3. You should now see visits from all devices in the admin dashboard

## Troubleshooting

### Data not appearing in admin dashboard

1. **Check Netlify Function logs**:
   - Go to Netlify dashboard → **Functions** → **analytics**
   - Check for any error messages

2. **Verify environment variables**:
   - Make sure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
   - They should be set in Netlify, not in your local `.env` file

3. **Check Supabase logs**:
   - Go to Supabase dashboard → **Logs** → **API Logs**
   - Look for any errors when data is being inserted

4. **Test the API endpoint**:
   - Visit: `https://yoursite.netlify.app/api/analytics`
   - You should see JSON data (or an error message)

### Local Development

For local development, you can create a `.env` file in the project root:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

However, Netlify Functions don't read `.env` files. You must set environment variables in the Netlify dashboard for production.

## Security Notes

- The `anon` key is safe to use in client-side code and Netlify Functions
- Row Level Security (RLS) policies allow public read/write for analytics
- If you want to restrict access, you can modify the RLS policies in Supabase
- Consider adding rate limiting if you expect high traffic

## Cost

Supabase has a generous free tier:
- 500 MB database storage
- 2 GB bandwidth
- Unlimited API requests

For a donation dashboard, this should be more than enough. If you exceed the free tier, you'll be notified by Supabase.

