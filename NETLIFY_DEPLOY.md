# Netlify Deployment Guide

## Setup Complete ✅

The project is now configured for Netlify Functions deployment.

## Files Created:

1. **`netlify/functions/donations.ts`** - Netlify serverless function for the API endpoint
2. **`netlify.toml`** - Netlify configuration file
3. Updated `package.json` with `@netlify/functions` dependency

## Deployment Steps:

### Option 1: Deploy via Netlify Dashboard

1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository (GitHub/GitLab/Bitbucket)
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.` (root directory)
5. Click "Deploy site"

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

## How It Works:

- Netlify automatically compiles TypeScript functions in `netlify/functions/`
- The `netlify.toml` redirects `/api/donations` to `/.netlify/functions/donations`
- Your frontend code doesn't need changes - it still calls `/api/donations`

## Important Notes:

- ✅ No backend server needed - Netlify Functions handle the API
- ✅ Free tier includes 125,000 function invocations/month
- ✅ Functions run on-demand (serverless)
- ✅ Automatic scaling

## Testing Locally:

You can test Netlify functions locally using:

```bash
npm install -g netlify-cli
netlify dev
```

This will start a local development server that mimics Netlify's environment.

## Troubleshooting:

If you get 404 errors:
1. Make sure `netlify.toml` is in the root directory
2. Verify `netlify/functions/donations.ts` exists
3. Check Netlify build logs for compilation errors
4. Ensure build command is set to `npm run build`

