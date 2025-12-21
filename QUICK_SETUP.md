# Quick Setup Guide - Supabase Integration

## Your Supabase Credentials

- **URL**: `https://hwomvscfofhdqcrnlqza.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b212c2Nmb2ZoZHFjcm5scXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMDM3NzYsImV4cCI6MjA4MTg3OTc3Nn0.oHibiahFQd11Pa_8GBfyi-mBaqnFbLlkfwtuWIinNdQ`

## Step 1: Create Database Tables

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/hwomvscfofhdqcrnlqza
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `setup-supabase.sql` file
5. Paste it into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

## Step 2: Set Netlify Environment Variables

1. Go to your Netlify dashboard
2. Navigate to your site → **Site settings** → **Environment variables**
3. Click **Add a variable**
4. Add these two variables:

   **Variable 1:**
   - **Key**: `SUPABASE_URL`
   - **Value**: `https://hwomvscfofhdqcrnlqza.supabase.co`
   - **Scopes**: All scopes (Production, Deploy previews, Branch deploys)

   **Variable 2:**
   - **Key**: `SUPABASE_ANON_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b212c2Nmb2ZoZHFjcm5scXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMDM3NzYsImV4cCI6MjA4MTg3OTc3Nn0.oHibiahFQd11Pa_8GBfyi-mBaqnFbLlkfwtuWIinNdQ`
   - **Scopes**: All scopes (Production, Deploy previews, Branch deploys)

5. Click **Save**

## Step 3: Redeploy Your Site

1. In Netlify, go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete (usually 1-2 minutes)

## Step 4: Test It

1. Visit your live site from a different device/browser
2. Log into the admin dashboard: `https://yoursite.netlify.app/admin/login`
3. You should now see visits from all devices!

## Troubleshooting

### Check if tables were created:
1. Go to Supabase dashboard → **Table Editor**
2. You should see 4 tables: `visits`, `events`, `login_visits`, `login_attempts`

### Check if environment variables are set:
1. In Netlify, go to **Site settings** → **Environment variables**
2. Verify both `SUPABASE_URL` and `SUPABASE_ANON_KEY` are listed

### Check Netlify Function logs:
1. In Netlify, go to **Functions** tab
2. Click on **analytics** function
3. Check the logs for any errors

### Test the API endpoint:
Visit: `https://yoursite.netlify.app/api/analytics`
- If working: You'll see JSON data (or empty arrays if no data yet)
- If not working: You'll see an error message

## Security Note

⚠️ **Important**: The anon key is safe to use in client-side code and Netlify Functions. The service role key should NEVER be exposed in client-side code or environment variables that are accessible to the frontend. Only use the anon key for this integration.

