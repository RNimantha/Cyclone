import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Configuration
// Google Sheet ID from the share URL
const GOOGLE_SHEET_ID: string = '15wWPAOJL5COh5flsyubX4AM_beoFoMc4W7D6ri7t-Ak';
// Build the CSV export URL (without gid parameter as it causes 400 errors)
const GOOGLE_SHEET_CSV_URL: string = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv`;
const TARGET_AMOUNT: number = 600000; // LKR

// Expenses Google Sheet ID
const EXPENSES_GOOGLE_SHEET_ID: string = '1VU3ajNLA8EpTUMwp1Z4qTpuXlX5kS1Ec64AGgr3mZCg';
const EXPENSES_GOOGLE_SHEET_CSV_URL: string = `https://docs.google.com/spreadsheets/d/${EXPENSES_GOOGLE_SHEET_ID}/export?format=csv`;

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

// Expenses types
interface ProcessedExpense {
    timestamp: string;
    expenseDate: string;
    title: string;
    category: string;
    description: string;
    amount: number;
    receipt: string;
    remarks: string;
    invoice: string;
    photos: string;
}

interface ExpenseColumnMapping {
    timestamp: string | null;
    expenseDate: string | null;
    title: string | null;
    category: string | null;
    description: string | null;
    amount: string | null;
    receipt: string | null;
    remarks: string | null;
    invoice: string | null;
    photos: string | null;
}

interface ExpenseResponse {
    totalAmount: number;
    totalExpenses: number;
    expenses: ProcessedExpense[];
    lastUpdated: string;
    categories: Record<string, number>;
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

// Middleware - Increase body size limit for base64 images (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// CORS middleware
app.use((_req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// API Routes
app.get('/api/donations', async (_req: Request, res: Response) => {
    try {
        if (!GOOGLE_SHEET_CSV_URL || GOOGLE_SHEET_CSV_URL === 'YOUR_GOOGLE_SHEET_CSV_URL_HERE') {
            res.status(500).json({ 
                error: 'Google Sheet CSV URL not configured' 
            });
            return;
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
            const errorText = await response.text().catch(() => '');
            console.error('Google Sheets response error:', response.status, response.statusText);
            console.error('Error body:', errorText.substring(0, 500));
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}. Make sure the Google Sheet is published to the web.`);
        }
        
        const csvText = await response.text();
        
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('Received empty response from Google Sheets');
        }
        
        const donations = parseCSV(csvText);
        
        if (donations.length === 0) {
            res.status(404).json({ 
                error: 'No donation data found in the sheet' 
            });
            return;
        }
        
        const processedData = processDonations(donations);
        res.json(processedData);
        
    } catch (error) {
        console.error('Error fetching donation data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ 
            error: errorMessage 
        });
    }
});

// Process expenses function
function processExpenses(expenses: Record<string, string>[]): ExpenseResponse {
    const possibleColumns = {
        timestamp: ['timestamp', 'date', 'time', 'datetime', 'submitted', 'submission time'],
        expenseDate: ['expense date', 'expense_date', 'date', 'expense date'],
        title: ['expense title', 'title', 'purpose', 'expense title / purpose', 'expense_title', 'expense purpose'],
        category: ['category', 'categories', 'expense categories', 'expense category', 'expense_categories'],
        description: ['description', 'desc', 'details'],
        amount: ['amount', 'amount (lkr)', 'amount(lkr)', 'value', 'lkr'],
        receipt: ['receipt', 'receipt link', 'receipt_url', 'link', 'url', 'proof'],
        remarks: ['remarks', 'remark', 'notes', 'note'],
        invoice: ['invoice', 'invoice link', 'invoice_url', 'invoice link', 'invoice url'],
        photos: ['photos', 'photos (if available)', 'photos (if available)', 'photos if available', 'images', 'images (if available)']
    };
    
    const headers = Object.keys(expenses[0] || {});
    const columns: ExpenseColumnMapping = {
        timestamp: null,
        expenseDate: null,
        title: null,
        category: null,
        description: null,
        amount: null,
        receipt: null,
        remarks: null,
        invoice: null,
        photos: null
    };
    
    Object.keys(possibleColumns).forEach(key => {
        let found = headers.find(h => {
            // Normalize header: lowercase, trim, remove extra spaces
            const headerNormalized = h.toLowerCase().trim().replace(/\s+/g, ' ');
            return possibleColumns[key as keyof typeof possibleColumns].some(p => {
                // Normalize pattern: lowercase, trim, remove extra spaces
                const patternNormalized = p.toLowerCase().trim().replace(/\s+/g, ' ');
                // Try exact match first, then includes (both normalized)
                return headerNormalized === patternNormalized || headerNormalized.includes(patternNormalized);
            });
        });
        
        // Fallback: for invoice, try to match any header containing "invoice"
        if (!found && key === 'invoice') {
            found = headers.find(h => h.toLowerCase().trim().includes('invoice'));
        }
        
        // Fallback: for photos, try to match any header containing "photo"
        if (!found && key === 'photos') {
            found = headers.find(h => h.toLowerCase().trim().includes('photo'));
        }
        
        columns[key as keyof ExpenseColumnMapping] = found || null;
        
        // Debug logging for invoice column
        if (key === 'invoice') {
            if (found) {
                console.log('Invoice column found:', found);
            } else {
                console.log('Invoice column not found. Available headers:', headers);
            }
        }
    });
    
    let totalAmount = 0;
    const processedExpenses: ProcessedExpense[] = [];
    const categories: Record<string, number> = {};
    
    expenses.forEach((expense, index) => {
        const amountStr = columns.amount ? expense[columns.amount] : '';
        const amount = sanitizeAmount(amountStr);
        
        if (amount > 0 || Object.values(expense).some(v => v.trim() !== '')) {
            const category = columns.category ? (expense[columns.category] || 'Uncategorized') : 'Uncategorized';
            totalAmount += amount;
            
            if (!categories[category]) {
                categories[category] = 0;
            }
            categories[category] += amount;
            
            const invoiceValue = columns.invoice ? (expense[columns.invoice] || '').trim() : '';
            const photosValue = columns.photos ? (expense[columns.photos] || '').trim() : '';
            
            // Debug first row for invoice
            if (index === 0 && invoiceValue) {
                console.log('First expense invoice value:', invoiceValue);
            }
            
            processedExpenses.push({
                timestamp: columns.timestamp ? expense[columns.timestamp] : `Row ${index + 2}`,
                expenseDate: columns.expenseDate ? expense[columns.expenseDate] : '',
                title: columns.title ? expense[columns.title] : 'No title',
                category: category,
                description: columns.description ? expense[columns.description] : '',
                amount: amount,
                receipt: columns.receipt ? expense[columns.receipt] : '',
                remarks: columns.remarks ? expense[columns.remarks] : '',
                invoice: invoiceValue,
                photos: photosValue
            });
        }
    });
    
    // Sort by expense date or timestamp (newest first)
    processedExpenses.sort((a, b) => {
        const dateA = a.expenseDate ? new Date(a.expenseDate).getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const dateB = b.expenseDate ? new Date(b.expenseDate).getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return dateB - dateA;
    });
    
    return {
        totalAmount,
        totalExpenses: processedExpenses.length,
        expenses: processedExpenses,
        lastUpdated: new Date().toISOString(),
        categories
    };
}

// Expenses API endpoint
app.get('/api/expenses', async (_req: Request, res: Response) => {
    try {
        if (!EXPENSES_GOOGLE_SHEET_CSV_URL || EXPENSES_GOOGLE_SHEET_CSV_URL === 'YOUR_GOOGLE_SHEET_CSV_URL_HERE') {
            res.status(500).json({ 
                error: 'Expenses Google Sheet CSV URL not configured' 
            });
            return;
        }
        
        // Build the URL with cache-busting parameter
        const url = `${EXPENSES_GOOGLE_SHEET_CSV_URL}&t=${Date.now()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/csv'
            },
            redirect: 'follow'
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error('Google Sheets response error:', response.status, response.statusText);
            console.error('Error body:', errorText.substring(0, 500));
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}. Make sure the Google Sheet is published to the web.`);
        }
        
        const csvText = await response.text();
        
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('Received empty response from Google Sheets');
        }
        
        const expenses = parseCSV(csvText);
        
        if (expenses.length === 0) {
            res.status(404).json({ 
                error: 'No expense data found in the sheet' 
            });
            return;
        }
        
        const processedData = processExpenses(expenses);
        res.json(processedData);
        
    } catch (error) {
        console.error('Error fetching expense data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ 
            error: errorMessage 
        });
    }
});

// Serve index.html for root route
app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin routes
app.get('/admin/login', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve expenses.html
app.get('/expenses', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'expenses.html'));
});

// Photos API endpoint (for local development)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

app.get('/api/photos', async (_req: Request, res: Response): Promise<void> => {
    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            res.status(500).json({ error: 'Supabase not configured' });
            return;
        }

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/gallery_photos?select=*&order=display_order.asc,created_at.desc`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Supabase error: ${response.statusText}`);
        }

        const photos = await response.json();
        res.json({ photos });
    } catch (error) {
        console.error('Photos API error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});

app.post('/api/photos', async (req: Request, res: Response): Promise<void> => {
    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            res.status(500).json({ error: 'Supabase not configured' });
            return;
        }

        const { url, caption, display_order } = req.body;

        if (!url) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/gallery_photos`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                    url,
                    caption: caption || null,
                    display_order: display_order || 0,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error: ${response.statusText} - ${errorText}`);
        }

        const photo = await response.json();
        res.json({ photo: photo[0] });
    } catch (error) {
        console.error('Photos API error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});

app.delete('/api/photos', async (req: Request, res: Response): Promise<void> => {
    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            res.status(500).json({ error: 'Supabase not configured' });
            return;
        }

        const id = req.query.id;

        if (!id) {
            res.status(400).json({ error: 'ID is required' });
            return;
        }

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/gallery_photos?id=eq.${id}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error: ${response.statusText} - ${errorText}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Photos API error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/donations`);
});
