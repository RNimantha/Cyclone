# Analytics Setup Guide

## Google Analytics Tracking Added ✅

Visitor tracking has been added to your donation dashboard. You can track:
- Page views
- User engagement (PDF downloads, sorting)
- Data loading events
- User demographics and behavior

## Setup Instructions:

### Step 1: Create Google Analytics Account

1. Go to [Google Analytics](https://analytics.google.com/)
2. Sign in with your Google account
3. Click "Start measuring"
4. Create an account name (e.g., "Cyclone Relief Fund")
5. Set up a property:
   - Property name: "Cyclone Relief Fund Dashboard"
   - Reporting time zone: Your timezone
   - Currency: LKR (Sri Lankan Rupee)

### Step 2: Get Your Measurement ID

1. In Google Analytics, go to **Admin** (gear icon)
2. Under **Property**, click **Data Streams**
3. Click **Add stream** → **Web**
4. Enter your website URL: `https://cyclonefund.netlify.app` (or your Netlify URL)
5. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 3: Configure the Tracking Code

1. Open `index.html`
2. Find this line (around line 8):
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
   ```
3. Replace `GA_MEASUREMENT_ID` with your actual Measurement ID (e.g., `G-XXXXXXXXXX`)
4. Also replace it in the `gtag('config', 'GA_MEASUREMENT_ID', ...)` line below

### Example:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-ABC123XYZ', {
        page_title: 'Cyclone Relief Fund Dashboard',
        page_location: window.location.href
    });
</script>
```

## Events Being Tracked:

1. **Page Views** - Every time someone visits the dashboard
2. **PDF Downloads** - When someone downloads donation records
3. **Sort Actions** - When someone sorts donations by amount
4. **Data Loads** - When donation data is successfully fetched

## Viewing Analytics:

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property
3. View reports:
   - **Realtime** - See current visitors
   - **Audience** - Demographics, location, devices
   - **Acquisition** - How visitors found your site
   - **Behavior** - What visitors do on your site
   - **Events** - Custom events (PDF downloads, sorting, etc.)

## Privacy Considerations:

- Google Analytics collects anonymous data
- No personal information is collected
- Complies with GDPR (with proper cookie consent if needed)
- You can add a privacy policy link if required

## Alternative: Simple Custom Tracking

If you prefer not to use Google Analytics, you can:
1. Create a simple tracking endpoint in Netlify Functions
2. Log visits to a database or service
3. Use privacy-focused alternatives like Plausible Analytics

## Testing:

After setup, you can test tracking:
1. Visit your site
2. Go to Google Analytics → Realtime reports
3. You should see your visit appear within seconds

## Troubleshooting:

- **No data showing**: Make sure you replaced `GA_MEASUREMENT_ID` with your actual ID
- **Events not tracking**: Check browser console for errors
- **Delayed data**: Real-time data appears immediately; historical data may take 24-48 hours

