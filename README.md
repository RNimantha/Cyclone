# Cyclone Relief Fund Dashboard

A simple, transparent, one-page web app to show LIVE donation updates for a cyclone relief fund.

## Features

- Live data fetching from Google Sheet (CSV) via Node.js backend
- Real-time donation dashboard with totals and progress
- Donation records table
- Auto-refresh every 30 seconds
- Mobile-responsive design
- Clean, trustworthy UI
- RESTful API endpoint

## Architecture

- **Frontend**: TypeScript compiled to JavaScript (`app.ts` → `app.js`)
- **Backend**: Node.js/Express server (`server.ts` → `server.js`)
- **API**: `/api/donations` endpoint that fetches and processes Google Sheet data

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Sheet URL

1. Open `server.ts`
2. Find the line: `const GOOGLE_SHEET_CSV_URL: string = 'YOUR_GOOGLE_SHEET_CSV_URL_HERE';`
3. Replace with your published Google Sheet CSV URL

The Google Sheet URL is already configured in `server.ts`.

### 3. Publish Your Google Sheet

1. Open your Google Sheet with donation data
2. Go to **File** > **Share** > **Publish to web**
3. Select the sheet/tab you want to publish
4. Choose **CSV** as the format
5. Click **Publish**
6. Copy the generated URL and update it in `server.ts`

### 4. Build the Project

```bash
npm run build
```

This will compile both `app.ts` and `server.ts` to JavaScript.

### 5. Run the Server

#### Development Mode

```bash
npm start
```

The server will start on `http://localhost:3000`

#### Production Mode

```bash
npm run build
npm start
```

Or set the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Development

### Watch Mode (Auto-compile)

To watch for changes and auto-compile TypeScript:

```bash
npm run dev
```

### Server with Watch Mode

To run the server with auto-reload (requires Node.js 18+):

```bash
npm run dev:server
```

## API Endpoints

### GET `/api/donations`

Returns processed donation data in JSON format:

```json
{
  "totalAmount": 45000,
  "totalDonors": 5,
  "targetAmount": 600000,
  "percentage": 7.5,
  "donations": [
    {
      "timestamp": "12/21/2025 12:44:51",
      "name": "K A V Wickramasinghe",
      "amount": 10000,
      "receipt": "https://drive.google.com/..."
    }
  ],
  "lastUpdated": "2025-12-21T12:45:00.000Z"
}
```

## Deployment

### Option A: Heroku

1. Create a `Procfile`:
   ```
   web: node server.js
   ```

2. Deploy:
   ```bash
   git push heroku main
   ```

### Option B: Railway / Render

1. Connect your repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Deploy

### Option C: VPS / Cloud Server

1. Build the project: `npm run build`
2. Install PM2: `npm install -g pm2`
3. Start server: `pm2 start server.js`
4. Set up reverse proxy (nginx) if needed

## Google Sheet Format

Your Google Sheet should have columns like:
- **Timestamp** (or Date, Time, etc.)
- **Name** (or Donor, Donor Name, etc.)
- **Amount** (or Donation, LKR, etc.)
- **Receipt** (or Receipt Link, URL, etc.) - optional

The app will automatically detect these columns regardless of exact naming.

## Important Notes

- Ensure your Google Sheet is publicly accessible (published)
- The CSV URL must be accessible without authentication
- Test the CSV URL by opening it in a browser - you should see raw CSV data
- The frontend will automatically refresh every 30 seconds
- The backend processes all CSV parsing and data sanitization
- CORS is enabled for all origins (adjust in `server.ts` for production if needed)

## Project Structure

```
Cyclone/
├── app.ts          # Frontend TypeScript
├── app.js          # Compiled frontend JavaScript
├── server.ts       # Backend TypeScript
├── server.js       # Compiled backend JavaScript
├── index.html      # HTML file
├── package.json    # Dependencies and scripts
├── tsconfig.json   # TypeScript configuration
└── README.md       # This file
```
