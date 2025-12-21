import type { Handler } from '@netlify/functions';

// Configuration
const GOOGLE_SHEET_ID: string = '15wWPAOJL5COh5flsyubX4AM_beoFoMc4W7D6ri7t-Ak';
const GOOGLE_SHEET_CSV_URL: string = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv`;
const TARGET_AMOUNT: number = 600000; // LKR

// Type definitions
interface ProcessedDonation {
    timestamp: string;
    name: string;
    amount: number;
    receipt: string;
}

interface ColumnMapping {
    timestamp: string | null;
    name: string | null;
    amount: string | null;
    receipt: string | null;
}

interface DonationResponse {
    totalAmount: number;
    totalDonors: number;
    targetAmount: number;
    percentage: number;
    donations: ProcessedDonation[];
    lastUpdated: string;
}

// Utility functions
function sanitizeAmount(amountStr: string | undefined): number {
    if (!amountStr) return 0;
    
    let cleaned = String(amountStr)
        .toUpperCase()
        .replace(/LKR/gi, '')
        .replace(/RS/gi, '')
        .replace(/RS\./gi, '')
        .replace(/=/g, '')
        .replace(/\s+/g, '')
        .replace(/,/g, '')
        .trim();
    
    const numericMatch = cleaned.match(/[\d.]+/);
    if (numericMatch) {
        const value = parseFloat(numericMatch[0]);
        return isNaN(value) ? 0 : Math.round(value);
    }
    
    return 0;
}

function parseCSV(csvText: string): Record<string, string>[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim().replace(/^"|"$/g, ''));
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        if (Object.values(row).some(v => v.trim() !== '')) {
            data.push(row);
        }
    }
    
    return data;
}

function processDonations(donations: Record<string, string>[]): DonationResponse {
    const possibleColumns = {
        timestamp: ['timestamp', 'date', 'time', 'datetime', 'submitted', 'submission time'],
        name: ['name', 'donor', 'donor name', 'donor_name', 'full name'],
        amount: ['amount', 'donation', 'donation amount', 'value', 'lkr'],
        receipt: ['receipt', 'receipt link', 'receipt_url', 'link', 'url', 'proof']
    };
    
    const headers = Object.keys(donations[0] || {});
    const columns: ColumnMapping = {
        timestamp: null,
        name: null,
        amount: null,
        receipt: null
    };
    
    Object.keys(possibleColumns).forEach(key => {
        const found = headers.find(h => 
            possibleColumns[key as keyof typeof possibleColumns].some(p => 
                h.toLowerCase().includes(p.toLowerCase())
            )
        );
        columns[key as keyof ColumnMapping] = found || null;
    });
    
    let totalAmount = 0;
    const processedDonations: ProcessedDonation[] = [];
    
    donations.forEach((donation, index) => {
        const amountStr = columns.amount ? donation[columns.amount] : '';
        const amount = sanitizeAmount(amountStr);
        
        if (amount > 0) {
            totalAmount += amount;
            
            processedDonations.push({
                timestamp: columns.timestamp ? donation[columns.timestamp] : `Row ${index + 2}`,
                name: columns.name ? donation[columns.name] : 'Anonymous',
                amount: amount,
                receipt: columns.receipt ? donation[columns.receipt] : ''
            });
        }
    });
    
    processedDonations.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return b.amount - a.amount;
    });
    
    const percentage = Math.min((totalAmount / TARGET_AMOUNT) * 100, 100);
    
    return {
        totalAmount,
        totalDonors: processedDonations.length,
        targetAmount: TARGET_AMOUNT,
        percentage,
        donations: processedDonations,
        lastUpdated: new Date().toISOString()
    };
}

export const handler: Handler = async (_event, _context) => {
    try {
        if (!GOOGLE_SHEET_CSV_URL || GOOGLE_SHEET_CSV_URL === 'YOUR_GOOGLE_SHEET_CSV_URL_HERE') {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({ 
                    error: 'Google Sheet CSV URL not configured' 
                })
            };
        }
        
        // Build the URL with cache-busting parameter
        const url = `${GOOGLE_SHEET_CSV_URL}&t=${Date.now()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/csv'
            },
            redirect: 'follow'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}. Make sure the Google Sheet is published to the web.`);
        }
        
        const csvText = await response.text();
        
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('Received empty response from Google Sheets');
        }
        
        const donations = parseCSV(csvText);
        
        if (donations.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({ 
                    error: 'No donation data found in the sheet' 
                })
            };
        }
        
        const processedData = processDonations(donations);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify(processedData)
        };
        
    } catch (error) {
        console.error('Error fetching donation data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ 
                error: errorMessage 
            })
        };
    }
};

