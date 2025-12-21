// Quick test script to verify Google Sheet CSV URL
const GOOGLE_SHEET_ID = '15wWPAOJL5COh5flsyubX4AM_beoFoMc4W7D6ri7t-Ak';
const GOOGLE_SHEET_GID = '0';

const url1 = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_SHEET_GID}`;
const url2 = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv`;

console.log('Testing Google Sheet CSV URLs...\n');
console.log('URL 1 (with gid):', url1);
console.log('URL 2 (without gid):', url2);
console.log('\nTry opening these URLs in your browser to see if they work.\n');

async function testUrl(url, name) {
    try {
        console.log(`Testing ${name}...`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const text = await response.text();
            console.log(`Success! Received ${text.length} characters`);
            console.log(`First 200 chars: ${text.substring(0, 200)}`);
            return true;
        } else {
            const errorText = await response.text().catch(() => '');
            console.log(`Error: ${errorText.substring(0, 200)}`);
            return false;
        }
    } catch (error) {
        console.log(`Error: ${error.message}`);
        return false;
    }
}

(async () => {
    console.log('\n--- Testing URLs ---\n');
    const result1 = await testUrl(url1, 'URL 1 (with gid)');
    console.log('\n');
    const result2 = await testUrl(url2, 'URL 2 (without gid)');
    
    console.log('\n--- Results ---');
    console.log(`URL 1 (with gid): ${result1 ? '✓ Works' : '✗ Failed'}`);
    console.log(`URL 2 (without gid): ${result2 ? '✓ Works' : '✗ Failed'}`);
    
    if (!result1 && !result2) {
        console.log('\n⚠️  Both URLs failed. Please check:');
        console.log('1. Is the Google Sheet published to the web?');
        console.log('   - Go to File > Share > Publish to web');
        console.log('   - Select the sheet and choose CSV format');
        console.log('   - Click Publish');
        console.log('2. Is the sheet ID correct?');
        console.log('3. Is the gid (sheet tab) correct?');
    }
})();

