// Configuration
const EXPENSES_GOOGLE_SHEET_ID = '1VU3ajNLA8EpTUMwp1Z4qTpuXlX5kS1Ec64AGgr3mZCg';
const EXPENSES_GOOGLE_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${EXPENSES_GOOGLE_SHEET_ID}/export?format=csv`;
// Utility functions
function sanitizeAmount(amountStr) {
    if (!amountStr)
        return 0;
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
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2)
        return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim().replace(/^"|"$/g, ''));
                currentValue = '';
            }
            else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        if (Object.values(row).some(v => v.trim() !== '')) {
            data.push(row);
        }
    }
    return data;
}
function processExpenses(expenses) {
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
    const columns = {
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
            return possibleColumns[key].some(p => {
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
        columns[key] = found || null;
        // Debug logging for invoice column
        if (key === 'invoice') {
            if (found) {
                console.log('Invoice column found:', found);
            }
            else {
                console.log('Invoice column not found. Available headers:', headers);
            }
        }
    });
    let totalAmount = 0;
    const processedExpenses = [];
    const categories = {};
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
export const handler = async (_event, _context) => {
    try {
        if (!EXPENSES_GOOGLE_SHEET_CSV_URL || EXPENSES_GOOGLE_SHEET_CSV_URL === 'YOUR_GOOGLE_SHEET_CSV_URL_HERE') {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({
                    error: 'Expenses Google Sheet CSV URL not configured'
                })
            };
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
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}. Make sure the Google Sheet is published to the web.`);
        }
        const csvText = await response.text();
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('Received empty response from Google Sheets');
        }
        const expenses = parseCSV(csvText);
        if (expenses.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({
                    error: 'No expense data found in the sheet'
                })
            };
        }
        const processedData = processExpenses(expenses);
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
    }
    catch (error) {
        console.error('Error fetching expense data:', error);
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
