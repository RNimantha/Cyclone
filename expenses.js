"use strict";
// Configuration
const EXPENSES_API_URL = '/api/expenses';
const EXPENSES_REFRESH_INTERVAL = 30000; // 30 seconds
// Store current expense data
let currentExpenseData = null;
let selectedCategory = null;
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
// Data fetching and processing
async function fetchExpenseData() {
    const statusEl = document.getElementById('status');
    if (!statusEl)
        return;
    try {
        statusEl.style.display = 'block';
        statusEl.className = 'status loading';
        statusEl.textContent = 'Loading expense data...';
        const response = await fetch(EXPENSES_API_URL + '?t=' + Date.now(), {
            method: 'GET',
            cache: 'no-cache'
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
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
                    <td colspan="7" style="text-align: center; padding: 20px; color: #999;">
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
    if (filteredExpenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #999;">
                    No expenses found${categoryFilter ? ` in category: ${categoryFilter}` : ''}.
                </td>
            </tr>
        `;
        return;
    }
    tbody.innerHTML = filteredExpenses.map(expense => {
        const receiptCell = expense.receipt && expense.receipt.trim() !== ''
            ? `<a href="${expense.receipt}" target="_blank" rel="noopener noreferrer" class="receipt-link">View Receipt</a>`
            : '<span style="color: #999;">N/A</span>';
        const displayDate = expense.expenseDate || expense.timestamp;
        return `
            <tr>
                <td>${formatExpenseDate(displayDate)}</td>
                <td>${expense.title || 'No title'}</td>
                <td><span class="category-badge">${expense.category || 'Uncategorized'}</span></td>
                <td>${expense.description || '-'}</td>
                <td><strong>${formatExpenseCurrency(expense.amount)}</strong></td>
                <td>${receiptCell}</td>
                <td>${expense.remarks || '-'}</td>
            </tr>
        `;
    }).join('');
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
            // Format as YYYY-MM-DD for grouping
            const dateKey = date.toISOString().split('T')[0];
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
        const height = (amount / displayMax) * 100;
        const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
                        <div class="line-chart-point">
                            <div class="line-chart-value">${formatExpenseCurrency(amount)}</div>
                            <div class="line-chart-bar" style="height: ${height}%;"></div>
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
});
// Initialization
fetchExpenseData();
setInterval(fetchExpenseData, EXPENSES_REFRESH_INTERVAL);
