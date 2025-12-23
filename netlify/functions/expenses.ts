import type { Handler } from '@netlify/functions';

// Configuration
const EXPENSES_GOOGLE_SHEET_ID: string = '1VU3ajNLA8EpTUMwp1Z4qTpuXlX5kS1Ec64AGgr3mZCg';
const EXPENSES_GOOGLE_SHEET_CSV_URL: string = `https://docs.google.com/spreadsheets/d/${EXPENSES_GOOGLE_SHEET_ID}/export?format=csv`;

// Type definitions
interface ProcessedExpense {
    timestamp: string;
    expenseDate: string;
    title: string;
    category: string;
    description: string;
    amount: number;
    receipt: string;
    remarks: string;
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

function processExpenses(expenses: Record<string, string>[]): ExpenseResponse {
    const possibleColumns = {
        timestamp: ['timestamp', 'date', 'time', 'datetime', 'submitted', 'submission time'],
        expenseDate: ['expense date', 'expense_date', 'date', 'expense date'],
        title: ['expense title', 'title', 'purpose', 'expense title / purpose', 'expense_title', 'expense purpose'],
        category: ['category', 'categories', 'expense categories', 'expense category', 'expense_categories'],
        description: ['description', 'desc', 'details'],
        amount: ['amount', 'amount (lkr)', 'amount(lkr)', 'value', 'lkr'],
        receipt: ['receipt', 'receipt link', 'receipt_url', 'link', 'url', 'proof'],
        remarks: ['remarks', 'remark', 'notes', 'note']
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
        remarks: null
    };
    
    Object.keys(possibleColumns).forEach(key => {
        const found = headers.find(h => 
            possibleColumns[key as keyof typeof possibleColumns].some(p => 
                h.toLowerCase().includes(p.toLowerCase())
            )
        );
        columns[key as keyof ExpenseColumnMapping] = found || null;
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
            
            processedExpenses.push({
                timestamp: columns.timestamp ? expense[columns.timestamp] : `Row ${index + 2}`,
                expenseDate: columns.expenseDate ? expense[columns.expenseDate] : '',
                title: columns.title ? expense[columns.title] : 'No title',
                category: category,
                description: columns.description ? expense[columns.description] : '',
                amount: amount,
                receipt: columns.receipt ? expense[columns.receipt] : '',
                remarks: columns.remarks ? expense[columns.remarks] : ''
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

export const handler: Handler = async (_event, _context) => {
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
        
    } catch (error) {
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

