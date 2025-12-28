"use strict";
// Configuration
const EXPENSES_API_URL = '/api/expenses';
const EXPENSES_REFRESH_INTERVAL = 30000; // 30 seconds
// Budget configuration - fetch from main dashboard
const DONATIONS_API_URL = '/api/donations';
// Store current expense data
let currentExpenseData = null;
let selectedCategory = null;
let receiptFilter = 'all';
let searchQuery = '';
// Store budget amount
let currentBudget = 0;
// Utility functions
function formatExpenseCurrency(amount) {
    return 'LKR ' + amount.toLocaleString('en-US');
}
function formatExpenseDate(dateStr) {
    if (!dateStr)
        return 'N/A';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr;
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    catch (e) {
        return dateStr;
    }
}
// Fetch budget from main dashboard
async function fetchBudget() {
    try {
        const response = await fetch(DONATIONS_API_URL + '?t=' + Date.now(), {
            method: 'GET',
            cache: 'no-cache'
        });
        if (response.ok) {
            const data = await response.json();
            return data.totalAmount || 0;
        }
    }
    catch (error) {
        console.warn('Failed to fetch budget from donations API:', error);
    }
    return 0;
}
// Determine verification status for an expense
function getVerificationStatus(expense) {
    // If status is already set, use it (for future manual override)
    if (expense.verificationStatus) {
        return expense.verificationStatus;
    }
    // Fallback rules: if receipt exists → verified, if no receipt → no_receipt
    if (expense.receipt && expense.receipt.trim() !== '') {
        return 'verified';
    }
    return 'no_receipt';
}
// Get status badge HTML
function getStatusBadgeHTML(status) {
    const badges = {
        verified: '<span class="status-badge verified">✅ Verified</span>',
        pending: '<span class="status-badge pending">⏳ Pending</span>',
        no_receipt: '<span class="status-badge no_receipt">⚠️ No Receipt</span>'
    };
    return badges[status];
}
// Data fetching and processing
async function fetchExpenseData() {
    const statusEl = document.getElementById('status');
    if (!statusEl)
        return;
    try {
        statusEl.style.display = 'block';
        statusEl.className = 'status loading';
        statusEl.textContent = 'Loading expense data...';
        // Fetch budget in parallel with expenses
        const [expenseResponse, budget] = await Promise.all([
            fetch(EXPENSES_API_URL + '?t=' + Date.now(), {
                method: 'GET',
                cache: 'no-cache'
            }),
            fetchBudget()
        ]);
        currentBudget = budget;
        if (!expenseResponse.ok) {
            const errorData = await expenseResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Failed to fetch data: ${expenseResponse.status} ${expenseResponse.statusText}`);
        }
        const data = await expenseResponse.json();
        if (data.expenses.length === 0) {
            throw new Error('No expense data found');
        }
        currentExpenseData = data;
        updateExpensesDashboard(data.totalAmount, data.totalExpenses);
        updateCategoryChart(data.categories);
        updateCategoryFilters(data.categories);
        updateExpenseTable(data.expenses, selectedCategory);
        updateReceiptStatus(data.expenses);
        updateTimeChart(data.expenses);
        updateTopPurposesChart(data.expenses);
        updateRecentExpenses(data.expenses);
        // New update functions
        updateBudgetProgress(data.totalAmount);
        updateRemainingBalance(data.totalAmount);
        statusEl.style.display = 'none';
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            const lastUpdatedDate = new Date(data.lastUpdated);
            lastUpdatedEl.textContent = `Last Updated: ${lastUpdatedDate.toLocaleString('en-US')}`;
        }
    }
    catch (error) {
        console.error('Error fetching expense data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        statusEl.style.display = 'block';
        statusEl.className = 'status error';
        statusEl.textContent = `Error: ${errorMessage}. Please check the server connection.`;
        const expenseTable = document.getElementById('expenseTable');
        if (expenseTable) {
            expenseTable.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 20px; color: #999;">
                        Unable to load expenses. Please check the server connection.
                    </td>
                </tr>
            `;
        }
    }
}
function updateExpensesDashboard(totalAmount, totalExpenses) {
    const totalAmountEl = document.getElementById('totalAmount');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const averageExpenseEl = document.getElementById('averageExpense');
    if (totalAmountEl) {
        totalAmountEl.textContent = formatExpenseCurrency(totalAmount);
    }
    if (totalExpensesEl) {
        totalExpensesEl.textContent = totalExpenses.toString();
    }
    const averageExpense = totalExpenses > 0 ? Math.round(totalAmount / totalExpenses) : 0;
    if (averageExpenseEl) {
        averageExpenseEl.textContent = formatExpenseCurrency(averageExpense);
    }
}
function updateCategoryChart(categories) {
    const chartContainer = document.getElementById('categoryChart');
    if (!chartContainer)
        return;
    if (Object.keys(categories).length === 0) {
        chartContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No category data available</div>';
        return;
    }
    const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1]);
    const maxAmount = Math.max(...sortedCategories.map(([_, amount]) => amount));
    chartContainer.innerHTML = sortedCategories.map(([category, amount]) => {
        const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
        return `
            <div class="chart-bar">
                <div class="chart-label">${category}</div>
                <div class="chart-visual">
                    <div class="chart-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="chart-value">${formatExpenseCurrency(amount)}</div>
            </div>
        `;
    }).join('');
}
function updateCategoryFilters(categories) {
    const filterContainer = document.querySelector('.filter-controls');
    if (!filterContainer)
        return;
    // Remove existing category filter buttons (keep "All Categories" button)
    const existingFilters = Array.from(filterContainer.children).slice(1); // Skip first button (All)
    existingFilters.forEach(btn => btn.remove());
    // Add category filter buttons
    Object.keys(categories).sort().forEach(category => {
        const button = document.createElement('button');
        button.className = 'filter-button';
        button.textContent = `${category} (${formatExpenseCurrency(categories[category])})`;
        button.addEventListener('click', () => {
            selectedCategory = category;
            updateActiveFilters();
            if (currentExpenseData) {
                updateExpenseTable(currentExpenseData.expenses, selectedCategory);
            }
        });
        filterContainer.appendChild(button);
    });
}
function updateActiveFilters() {
    const allButtons = document.querySelectorAll('.filter-button');
    allButtons.forEach(btn => {
        if (btn.id === 'filterAll') {
            btn.classList.toggle('active', selectedCategory === null);
        }
        else if (btn.id.startsWith('receiptFilter')) {
            if (btn.id === 'receiptFilterAll') {
                btn.classList.toggle('active', receiptFilter === 'all');
            }
            else if (btn.id === 'receiptFilterWith') {
                btn.classList.toggle('active', receiptFilter === 'with');
            }
            else if (btn.id === 'receiptFilterWithout') {
                btn.classList.toggle('active', receiptFilter === 'without');
            }
        }
        else {
            const buttonText = btn.textContent || '';
            const isActive = selectedCategory && buttonText.includes(selectedCategory);
            btn.classList.toggle('active', isActive === true);
        }
    });
}
function updateExpenseTable(expenses, categoryFilter = null) {
    const tbody = document.getElementById('expenseTable');
    if (!tbody)
        return;
    let filteredExpenses = expenses;
    if (categoryFilter) {
        filteredExpenses = expenses.filter(exp => exp.category === categoryFilter);
    }
    // Apply receipt filter
    if (receiptFilter === 'with') {
        filteredExpenses = filteredExpenses.filter(exp => exp.receipt && exp.receipt.trim() !== '');
    }
    else if (receiptFilter === 'without') {
        filteredExpenses = filteredExpenses.filter(exp => !exp.receipt || exp.receipt.trim() === '');
    }
    // Apply search filter
    const term = searchQuery.trim().toLowerCase();
    if (term) {
        filteredExpenses = filteredExpenses.filter(exp => {
            const haystack = [
                exp.title,
                exp.description,
                exp.remarks,
                exp.category
            ].join(' ').toLowerCase();
            return haystack.includes(term);
        });
    }
    if (filteredExpenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 20px; color: #999;">
                    No expenses found${categoryFilter ? ` in category: ${categoryFilter}` : ''}.
                </td>
            </tr>
        `;
        return;
    }
    tbody.innerHTML = filteredExpenses.map((expense, idx) => {
        const receiptUrl = expense.receipt ? expense.receipt.trim() : '';
        const receiptCell = receiptUrl !== ''
            ? `<a href="javascript:void(0)" onclick="openGallery('${receiptUrl.replace(/'/g, "\\'")}', 'Receipt - ${(expense.title || 'No title').replace(/'/g, "\\'")}')" class="receipt-link">View Receipt</a>`
            : '<span style="color: #999;">N/A</span>';
        // Check if invoice exists and has content
        const invoiceValue = expense.invoice ? String(expense.invoice).trim() : '';
        const invoiceCell = invoiceValue !== '' && invoiceValue !== 'undefined' && invoiceValue !== 'null'
            ? `<a href="javascript:void(0)" onclick="openGallery('${invoiceValue.replace(/'/g, "\\'")}', 'Invoice - ${(expense.title || 'No title').replace(/'/g, "\\'")}')" class="receipt-link">View Invoice</a>`
            : '<span style="color: #999;">N/A</span>';
        // Check if photos exists and has content - handle comma-separated multiple photos
        const photosValue = expense.photos ? expense.photos.trim() : '';
        let photosCell = '<span style="color: #999;">N/A</span>';
        if (photosValue !== '') {
            // Parse comma-separated photo URLs
            const photoUrls = photosValue.split(',').map(url => url.trim()).filter(url => url !== '');
            // Properly escape URLs for HTML attribute
            const photoUrlsJson = JSON.stringify(photoUrls).replace(/"/g, '&quot;');
            const photoTitle = (expense.title || 'No title').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            photosCell = `<a href="javascript:void(0)" onclick="openGalleryMultiple(${photoUrlsJson}, '${photoTitle}')" class="receipt-link">View Photos (${photoUrls.length})</a>`;
        }
        // Debug logging for first expense
        if (idx === 0) {
            console.log('First expense invoice field:', expense.invoice, 'invoiceValue:', invoiceValue);
        }
        const displayDate = expense.expenseDate || expense.timestamp;
        return `
            <tr>
                <td>${formatExpenseDate(displayDate)}</td>
                <td>${expense.title || 'No title'}</td>
                <td><span class="category-badge">${expense.category || 'Uncategorized'}</span></td>
                <td>${expense.description || '-'}</td>
                <td><strong>${formatExpenseCurrency(expense.amount)}</strong></td>
                <td>${invoiceCell}</td>
                <td>${photosCell}</td>
                <td>${receiptCell}</td>
                <td>${expense.remarks || '-'}</td>
            </tr>
        `;
    }).join('');
}
// Build printable media blocks (links + inline image preview when possible)
function buildMediaBlock(label, urls) {
    if (!urls || urls.length === 0)
        return '<span style="color: #999;">N/A</span>';
    return urls.map((url, idx) => {
        const original = url.trim();
        const escapedOriginal = escapeHtml(original);
        const directImage = toDirectImageUrl(original);
        const escapedImage = escapeHtml(directImage);
        const showImage = !!directImage && !isLikelyPdf(original);
        const suffix = urls.length > 1 ? ` ${idx + 1}` : '';
        const imageHtml = showImage ? `
            <div style="margin-top: 6px;">
                <img src="${escapedImage}" alt="${escapeHtml(label)}${suffix}" 
                    style="max-height: 120px; max-width: 100%; object-fit: contain; border: 1px solid #eee; padding: 4px; border-radius: 4px;">
            </div>
        ` : '';
        return `
            <div style="margin-bottom: 8px;">
                <strong>${escapeHtml(label)}${suffix}:</strong>
                <a href="${escapedOriginal}" target="_blank" rel="noopener noreferrer">${escapedOriginal}</a>
                ${imageHtml}
            </div>
        `;
    }).join('');
}
// Download current Expense Records view as PDF/printable page
function downloadExpensesPdf() {
    if (!currentExpenseData)
        return;
    let expenses = currentExpenseData.expenses;
    if (selectedCategory) {
        expenses = expenses.filter(exp => exp.category === selectedCategory);
    }
    if (receiptFilter === 'with') {
        expenses = expenses.filter(exp => exp.receipt && exp.receipt.trim() !== '');
    }
    else if (receiptFilter === 'without') {
        expenses = expenses.filter(exp => !exp.receipt || exp.receipt.trim() === '');
    }
    const term = searchQuery.trim().toLowerCase();
    if (term) {
        expenses = expenses.filter(exp => {
            const haystack = [
                exp.title,
                exp.description,
                exp.remarks,
                exp.category
            ].join(' ').toLowerCase();
            return haystack.includes(term);
        });
    }
    if (expenses.length === 0) {
        alert('No expenses to export for the current filter.');
        return;
    }
    const rowsHtml = expenses.map(expense => {
        const displayDate = expense.expenseDate || expense.timestamp;
        const invoiceUrls = expense.invoice ? String(expense.invoice).split(',').map(u => u.trim()).filter(u => u !== '') : [];
        const photoUrls = expense.photos ? expense.photos.split(',').map(u => u.trim()).filter(u => u !== '') : [];
        const receiptUrls = expense.receipt ? [expense.receipt.trim()].filter(u => u !== '') : [];
        const invoiceHtml = buildMediaBlock('Invoice', invoiceUrls);
        const photoHtml = buildMediaBlock('Photo', photoUrls);
        const receiptHtml = buildMediaBlock('Receipt', receiptUrls);
        return `
            <tr>
                <td>${escapeHtml(formatExpenseDate(displayDate))}</td>
                <td>${escapeHtml(expense.title || 'No title')}</td>
                <td>${escapeHtml(expense.category || 'Uncategorized')}</td>
                <td>${escapeHtml(expense.description || '-')}</td>
                <td>${escapeHtml(formatExpenseCurrency(expense.amount))}</td>
                <td>${invoiceHtml}</td>
                <td>${photoHtml}</td>
                <td>${receiptHtml}</td>
            </tr>
        `;
    }).join('');
    const printStyles = `
        body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; padding: 20px; color: #2c3e50; }
        h1 { margin: 0; }
        .header { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 14px; }
        .logo { height: 60px; width: auto; }
        .meta { color: #666; margin-bottom: 16px; font-size: 0.95rem; text-align: center; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #e1e4e8; padding: 8px; vertical-align: top; font-size: 0.9rem; word-break: break-word; white-space: pre-wrap; }
        th { background: #f6f8fa; text-align: left; }
        tr:nth-child(even) { background: #fafbfc; }
        img { page-break-inside: avoid; }
        @media print {
            a { color: #000; text-decoration: underline; }
        }
    `;
    const now = new Date();
    const title = selectedCategory ? `Expense Records – ${selectedCategory}` : 'Expense Records';
    const logoUrl = `${window.location.origin}/logo.png`;
    const subtitle = 'Expenses Records of Cyclone Relief Fund';
    const printableHtml = `
        <!doctype html>
        <html>
            <head>
                <title>${escapeHtml(title)}</title>
                <style>${printStyles}</style>
            </head>
            <body>
                <div class="header">
                    <img src="${escapeHtml(logoUrl)}" alt="Logo" class="logo">
                    <h1>${escapeHtml(title)}</h1>
                    <div style="font-size: 1rem; color: #555; margin-top: 4px;">${escapeHtml(subtitle)}</div>
                </div>
                <div class="meta">Generated: ${escapeHtml(now.toLocaleString())}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Amount (LKR)</th>
                            <th>Invoice</th>
                            <th>Photos</th>
                            <th>Receipt</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
        </html>
    `;
    const printWindow = window.open('', '_blank');
    if (!printWindow)
        return;
    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();
    printWindow.focus();
    // Give the browser a moment to render images before printing
    setTimeout(() => {
        printWindow.print();
    }, 400);
}
// Update Receipt Status
function updateReceiptStatus(expenses) {
    let withReceiptAmount = 0;
    let withoutReceiptAmount = 0;
    let withReceiptCount = 0;
    let withoutReceiptCount = 0;
    expenses.forEach(expense => {
        const hasReceipt = expense.receipt && expense.receipt.trim() !== '';
        if (hasReceipt) {
            withReceiptAmount += expense.amount;
            withReceiptCount++;
        }
        else {
            withoutReceiptAmount += expense.amount;
            withoutReceiptCount++;
        }
    });
    const withReceiptAmountEl = document.getElementById('withReceiptAmount');
    const withoutReceiptAmountEl = document.getElementById('withoutReceiptAmount');
    const withReceiptCountEl = document.getElementById('withReceiptCount');
    const withoutReceiptCountEl = document.getElementById('withoutReceiptCount');
    if (withReceiptAmountEl) {
        withReceiptAmountEl.textContent = formatExpenseCurrency(withReceiptAmount);
    }
    if (withoutReceiptAmountEl) {
        withoutReceiptAmountEl.textContent = formatExpenseCurrency(withoutReceiptAmount);
    }
    if (withReceiptCountEl) {
        withReceiptCountEl.textContent = `${withReceiptCount} expense${withReceiptCount !== 1 ? 's' : ''}`;
    }
    if (withoutReceiptCountEl) {
        withoutReceiptCountEl.textContent = `${withoutReceiptCount} expense${withoutReceiptCount !== 1 ? 's' : ''}`;
    }
}
// Update Budget vs Spent Progress Bar
function updateBudgetProgress(totalSpent) {
    if (currentBudget <= 0) {
        // No budget available, hide or show message
        const progressFill = document.getElementById('budgetProgressFill');
        const spentLabel = document.getElementById('budgetSpentLabel');
        const remainingLabel = document.getElementById('budgetRemainingLabel');
        if (progressFill)
            progressFill.style.width = '0%';
        if (spentLabel)
            spentLabel.textContent = 'Spent: ' + formatExpenseCurrency(totalSpent);
        if (remainingLabel)
            remainingLabel.textContent = 'Budget: Not available';
        return;
    }
    const spentPercentage = Math.min((totalSpent / currentBudget) * 100, 100);
    const remaining = Math.max(0, currentBudget - totalSpent);
    const progressFill = document.getElementById('budgetProgressFill');
    const spentLabel = document.getElementById('budgetSpentLabel');
    const remainingLabel = document.getElementById('budgetRemainingLabel');
    if (progressFill) {
        progressFill.style.width = `${spentPercentage}%`;
        progressFill.textContent = `${spentPercentage.toFixed(1)}%`;
    }
    if (spentLabel) {
        spentLabel.textContent = `Spent: ${formatExpenseCurrency(totalSpent)}`;
    }
    if (remainingLabel) {
        remainingLabel.textContent = `Remaining: ${formatExpenseCurrency(remaining)}`;
    }
}
// Update Remaining Balance Card
function updateRemainingBalance(totalSpent) {
    const remainingBalanceEl = document.getElementById('remainingBalance');
    const remainingBalanceStatusEl = document.getElementById('remainingBalanceStatus');
    if (!remainingBalanceEl || !remainingBalanceStatusEl)
        return;
    if (currentBudget <= 0) {
        remainingBalanceEl.textContent = formatExpenseCurrency(0);
        remainingBalanceStatusEl.textContent = 'Budget data unavailable';
        remainingBalanceEl.classList.remove('over-budget');
        return;
    }
    const remaining = currentBudget - totalSpent;
    if (remaining < 0) {
        // Over budget
        remainingBalanceEl.textContent = formatExpenseCurrency(Math.abs(remaining));
        remainingBalanceEl.classList.add('over-budget');
        remainingBalanceStatusEl.textContent = 'Over Budget';
    }
    else {
        // Within budget
        remainingBalanceEl.textContent = formatExpenseCurrency(remaining);
        remainingBalanceEl.classList.remove('over-budget');
        remainingBalanceStatusEl.textContent = 'Available';
    }
}
// Update Expenses Over Time (Line Chart)
function updateTimeChart(expenses) {
    const chartContainer = document.getElementById('timeChart');
    if (!chartContainer)
        return;
    // Group expenses by date
    const expensesByDate = {};
    expenses.forEach(expense => {
        const dateStr = expense.expenseDate || expense.timestamp;
        if (!dateStr)
            return;
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime()))
                return;
            // Format as YYYY-MM-DD for grouping using local timezone (not UTC)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;
            if (!expensesByDate[dateKey]) {
                expensesByDate[dateKey] = 0;
            }
            expensesByDate[dateKey] += expense.amount;
        }
        catch (e) {
            // Skip invalid dates
        }
    });
    const dates = Object.keys(expensesByDate).sort();
    if (dates.length === 0) {
        chartContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No time-based data available</div>';
        return;
    }
    const amounts = dates.map(date => expensesByDate[date]);
    // Format dates for display (show last 20 dates if more)
    const displayDates = dates.slice(-20);
    const displayAmounts = amounts.slice(-20);
    const displayMax = Math.max(...displayAmounts);
    chartContainer.innerHTML = `
        <div class="line-chart-container">
            <div class="line-chart">
                ${displayDates.map((date, index) => {
        const amount = displayAmounts[index];
        const heightPercent = displayMax > 0 ? (amount / displayMax) * 100 : 0;
        // Parse YYYY-MM-DD and format using local timezone
        const [year, month, day] = date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day); // month is 0-indexed
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
                        <div class="line-chart-point">
                            <div class="line-chart-value">${formatExpenseCurrency(amount)}</div>
                            <div class="line-chart-bar" style="height: ${heightPercent}%;"></div>
                            <div class="line-chart-label">${formattedDate}</div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}
// Update Top 5 Expense Purposes Chart
function updateTopPurposesChart(expenses) {
    const chartContainer = document.getElementById('topPurposesChart');
    if (!chartContainer)
        return;
    // Group by purpose/title and sum amounts
    const purposes = {};
    expenses.forEach(expense => {
        const purpose = expense.title || 'No title';
        if (!purposes[purpose]) {
            purposes[purpose] = 0;
        }
        purposes[purpose] += expense.amount;
    });
    // Sort by amount and take top 5
    const topPurposes = Object.entries(purposes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    if (topPurposes.length === 0) {
        chartContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No purpose data available</div>';
        return;
    }
    const maxAmount = Math.max(...topPurposes.map(([_, amount]) => amount));
    chartContainer.innerHTML = topPurposes.map(([purpose, amount]) => {
        const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
        // Truncate long purposes
        const displayPurpose = purpose.length > 40 ? purpose.substring(0, 37) + '...' : purpose;
        return `
            <div class="chart-bar">
                <div class="chart-label" title="${purpose}">${displayPurpose}</div>
                <div class="chart-visual">
                    <div class="chart-fill" style="width: ${percentage}%;"></div>
                </div>
                <div class="chart-value">${formatExpenseCurrency(amount)}</div>
            </div>
        `;
    }).join('');
}
// Update Recent 5 Expenses
function updateRecentExpenses(expenses) {
    const tbody = document.getElementById('recentExpenseTable');
    if (!tbody)
        return;
    // Sort by timestamp/date descending and take top 5
    const recentExpenses = [...expenses]
        .sort((a, b) => {
        const dateA = a.expenseDate ? new Date(a.expenseDate).getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const dateB = b.expenseDate ? new Date(b.expenseDate).getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return dateB - dateA;
    })
        .slice(0, 5);
    if (recentExpenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #999;">
                    No recent expenses found.
                </td>
            </tr>
        `;
        return;
    }
    tbody.innerHTML = recentExpenses.map(expense => {
        const receiptCell = expense.receipt && expense.receipt.trim() !== ''
            ? `<a href="${expense.receipt}" target="_blank" rel="noopener noreferrer" class="receipt-link">View</a>`
            : '<span style="color: #999;">N/A</span>';
        const displayDate = expense.expenseDate || expense.timestamp;
        return `
            <tr>
                <td>${formatExpenseDate(displayDate)}</td>
                <td>${expense.title || 'No title'}</td>
                <td><span class="category-badge">${expense.category || 'Uncategorized'}</span></td>
                <td><strong>${formatExpenseCurrency(expense.amount)}</strong></td>
                <td>${receiptCell}</td>
            </tr>
        `;
    }).join('');
    // Update last updated for recent section
    const lastUpdatedRecentEl = document.getElementById('lastUpdatedRecent');
    if (lastUpdatedRecentEl && currentExpenseData) {
        const lastUpdatedDate = new Date(currentExpenseData.lastUpdated);
        lastUpdatedRecentEl.textContent = `Last Updated: ${lastUpdatedDate.toLocaleString('en-US')}`;
    }
}
// Check if URL is an image
function isImageUrl(url) {
    if (!url)
        return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext)) || urlLower.includes('image');
}
// Check if URL is a Google Drive link
function isGoogleDriveUrl(url) {
    if (!url)
        return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com');
}
// Check if URL likely points to a PDF
function isLikelyPdf(url) {
    if (!url)
        return false;
    const lower = url.toLowerCase();
    return lower.includes('.pdf') || lower.includes('application/pdf');
}
// Extract file ID from Google Drive URL
function extractGoogleDriveFileId(url) {
    // Match patterns like /file/d/FILE_ID or id=FILE_ID
    const fileIdPatterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /[?&]id=([a-zA-Z0-9_-]+)/,
        /\/document\/d\/([a-zA-Z0-9_-]+)/,
        /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
    ];
    for (const pattern of fileIdPatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}
// Basic HTML escaping for printable content
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// Get a direct image-friendly URL when possible (e.g., for Google Drive images)
function toDirectImageUrl(url) {
    if (!url)
        return '';
    const trimmed = url.trim();
    if (isGoogleDriveUrl(trimmed)) {
        const fileId = extractGoogleDriveFileId(trimmed);
        if (fileId && !isLikelyPdf(trimmed)) {
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
    }
    return trimmed;
}
// Store current gallery state
let currentGalleryUrls = [];
let currentGalleryIndex = 0;
// Open gallery modal with single URL
function openGallery(url, title = '') {
    openGalleryMultiple([url], title);
}
// Open gallery modal with multiple URLs
function openGalleryMultiple(urls, _title = '') {
    if (!urls || urls.length === 0)
        return;
    const modal = document.getElementById('galleryModal');
    const modalContent = document.getElementById('galleryModalContent');
    if (!modal || !modalContent)
        return;
    // Store gallery state
    currentGalleryUrls = urls;
    currentGalleryIndex = 0;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    // Load first image
    loadGalleryImage(0);
    modal.classList.add('active');
}
// Expose functions globally for onclick handlers
window.openGallery = openGallery;
window.openGalleryMultiple = openGalleryMultiple;
window.navigateGallery = navigateGallery;
window.closeGallery = closeGallery;
window.closeGalleryOnBackdrop = closeGalleryOnBackdrop;
// Load specific image in gallery
function loadGalleryImage(index) {
    if (index < 0 || index >= currentGalleryUrls.length)
        return;
    currentGalleryIndex = index;
    const url = currentGalleryUrls[index];
    const modalContent = document.getElementById('galleryModalContent');
    if (!modalContent)
        return;
    // Build navigation HTML (only show if multiple images)
    let navHtml = '';
    if (currentGalleryUrls.length > 1) {
        navHtml = `
            <div class="gallery-nav prev" onclick="event.stopPropagation(); navigateGallery(-1)">&#10094;</div>
            <div class="gallery-nav next" onclick="event.stopPropagation(); navigateGallery(1)">&#10095;</div>
            <div style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); color: white; background: rgba(0,0,0,0.7); padding: 8px 16px; border-radius: 4px; font-size: 0.9rem;">
                ${currentGalleryIndex + 1} / ${currentGalleryUrls.length}
            </div>
        `;
    }
    // Clean and prepare URLs
    const cleanedUrl = (url || '').trim().replace(/,$/, '').trim();
    const originalUrl = cleanedUrl;
    const isDrive = isGoogleDriveUrl(cleanedUrl);
    const fileId = isDrive ? extractGoogleDriveFileId(cleanedUrl) : null;
    // Prefer direct image URL for Drive (works for images), fallback to preview for PDFs/other files
    const directImageUrl = fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : cleanedUrl;
    const previewUrl = fileId
        ? `https://drive.google.com/file/d/${fileId}/preview`
        : (isLikelyPdf(cleanedUrl) ? cleanedUrl : '');
    // Escape URLs for inline HTML/JS
    const escapedImageUrl = directImageUrl.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedOriginalUrl = originalUrl.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedPreviewUrl = previewUrl ? previewUrl.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    // Unique element IDs so inline handlers can find their elements
    const imgId = `gallery-img-${index}-${Date.now()}`;
    const errorDivId = `gallery-error-${index}-${Date.now()}`;
    const previewContainerId = `gallery-preview-${index}-${Date.now()}`;
    const iframeId = `gallery-iframe-${index}-${Date.now()}`;
    const previewHtml = previewUrl ? `
        <div id="${previewContainerId}" style="display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 80vh;">
            <iframe id="${iframeId}" src="" data-src="${escapedPreviewUrl}" frameborder="0" allow="autoplay" 
                style="width: 90vw; height: 80vh; border: none; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); background: white;"></iframe>
            <p style="margin-top: 12px; color: #ccc; font-size: 0.9rem; text-align: center;">Preview via embedded viewer. If blank, use the Open in New Tab link.</p>
        </div>
    ` : '';
    modalContent.innerHTML = `
        ${navHtml}
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; width: 100%;">
            <img id="${imgId}" src="${escapedImageUrl}" alt="Image ${index + 1}" 
                onclick="event.stopPropagation()" 
                style="max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); display: block;"
                onerror="
                    (function() {
                        const imgEl = document.getElementById('${imgId}');
                        const previewEl = document.getElementById('${previewContainerId}');
                        const errorEl = document.getElementById('${errorDivId}');
                        if (imgEl) imgEl.style.display = 'none';
                        if (previewEl) {
                            previewEl.style.display = 'flex';
                            const iframeEl = previewEl.querySelector('iframe');
                            if (iframeEl && !iframeEl.getAttribute('src')) {
                                iframeEl.setAttribute('src', '${escapedPreviewUrl}');
                            }
                            return;
                        }
                        if (errorEl) errorEl.style.display = 'flex';
                    })();
                "
                onload="
                    (function() {
                        const errorEl = document.getElementById('${errorDivId}');
                        const previewEl = document.getElementById('${previewContainerId}');
                        if (errorEl) errorEl.style.display = 'none';
                        if (previewEl) previewEl.style.display = 'none';
                    })();
                ">
            ${previewHtml}
            <div id="${errorDivId}" style="display: none; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: white; text-align: center; max-width: 500px;">
                <p style="margin-bottom: 20px; font-size: 1.1rem;">Unable to display this file directly.</p>
                <p style="margin-bottom: 15px; font-size: 0.9rem; color: #ccc;">If this is a Google Drive file, make sure it is shared as &quot;Anyone with the link can view&quot;.</p>
                <a href="${escapedOriginalUrl}" target="_blank" rel="noopener noreferrer" 
                   onclick="event.stopPropagation()"
                   style="color: #3498db; font-size: 1.1rem; text-decoration: none; padding: 12px 24px; border: 2px solid #3498db; border-radius: 4px; background: rgba(255,255,255,0.1); transition: all 0.3s; display: inline-block;">
                    Open in New Tab
                </a>
            </div>
        </div>
    `;
}
// Navigate gallery (prev/next)
function navigateGallery(direction) {
    const newIndex = currentGalleryIndex + direction;
    if (newIndex >= 0 && newIndex < currentGalleryUrls.length) {
        loadGalleryImage(newIndex);
    }
}
// Handle gallery error (fallback)
function handleGalleryError(originalUrl) {
    const modalContent = document.getElementById('galleryModalContent');
    if (!modalContent)
        return;
    modalContent.innerHTML = `
        <div class="gallery-embed">
            <p style="color: white; margin-bottom: 20px; font-size: 1.1rem;">Unable to preview this file</p>
            <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" style="color: #3498db; font-size: 1.2rem; text-decoration: none; padding: 15px 30px; border: 2px solid #3498db; border-radius: 4px; transition: all 0.3s; display: inline-block;">
                Open in New Tab
            </a>
        </div>
    `;
}
// Close gallery modal
function closeGallery() {
    const modal = document.getElementById('galleryModal');
    if (!modal)
        return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    // Clear content after animation
    setTimeout(() => {
        const modalContent = document.getElementById('galleryModalContent');
        if (modalContent)
            modalContent.innerHTML = '';
    }, 300);
}
// Close gallery when clicking on backdrop
function closeGalleryOnBackdrop(event) {
    const modal = document.getElementById('galleryModal');
    const modalContent = document.getElementById('galleryModalContent');
    if (!modal || !modalContent)
        return;
    // Close if clicking on the backdrop (not on the content)
    if (event.target === modal) {
        closeGallery();
    }
}
// Initialize filter handlers
document.addEventListener('DOMContentLoaded', () => {
    const filterAllBtn = document.getElementById('filterAll');
    if (filterAllBtn) {
        filterAllBtn.addEventListener('click', () => {
            selectedCategory = null;
            updateActiveFilters();
            if (currentExpenseData) {
                updateExpenseTable(currentExpenseData.expenses, null);
            }
        });
    }
    // Close gallery with Escape key, navigate with arrow keys
    document.addEventListener('keydown', (event) => {
        const modal = document.getElementById('galleryModal');
        if (modal && modal.classList.contains('active')) {
            if (event.key === 'Escape') {
                closeGallery();
            }
            else if (event.key === 'ArrowLeft') {
                navigateGallery(-1);
            }
            else if (event.key === 'ArrowRight') {
                navigateGallery(1);
            }
        }
    });
    const receiptFilterAll = document.getElementById('receiptFilterAll');
    const receiptFilterWith = document.getElementById('receiptFilterWith');
    const receiptFilterWithout = document.getElementById('receiptFilterWithout');
    if (receiptFilterAll && receiptFilterWith && receiptFilterWithout) {
        receiptFilterAll.addEventListener('click', () => {
            receiptFilter = 'all';
            updateActiveFilters();
            if (currentExpenseData)
                updateExpenseTable(currentExpenseData.expenses, selectedCategory);
        });
        receiptFilterWith.addEventListener('click', () => {
            receiptFilter = 'with';
            updateActiveFilters();
            if (currentExpenseData)
                updateExpenseTable(currentExpenseData.expenses, selectedCategory);
        });
        receiptFilterWithout.addEventListener('click', () => {
            receiptFilter = 'without';
            updateActiveFilters();
            if (currentExpenseData)
                updateExpenseTable(currentExpenseData.expenses, selectedCategory);
        });
    }
    const searchInput = document.getElementById('searchExpenses');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value || '';
            if (currentExpenseData)
                updateExpenseTable(currentExpenseData.expenses, selectedCategory);
        });
    }
    const downloadPdfBtn = document.getElementById('downloadExpensesPdf');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => downloadExpensesPdf());
    }
});
// Initialization
fetchExpenseData();
setInterval(fetchExpenseData, EXPENSES_REFRESH_INTERVAL);
