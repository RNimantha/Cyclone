"use strict";
// Configuration
const API_URL = '/api/donations';
const REFRESH_INTERVAL = 30000; // 30 seconds
// Store current donation data for PDF export
let currentDonationData = null;
// Sort state
let sortOrder = 'desc'; // Default: highest to lowest
let sortType = 'amount'; // Default: sort by amount
// Utility functions (sanitizeAmount removed - handled by backend)
function formatCurrency(amount) {
    return 'LKR ' + amount.toLocaleString('en-US');
}
function formatTimestamp(timestamp) {
    if (!timestamp)
        return 'N/A';
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return timestamp;
        }
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    catch (e) {
        return timestamp;
    }
}
// Removed parseCSV - now handled by backend
// Data fetching and processing
async function fetchDonationData() {
    const statusEl = document.getElementById('status');
    if (!statusEl)
        return;
    try {
        // Only show status during loading or errors
        statusEl.style.display = 'block';
        statusEl.className = 'status loading';
        statusEl.textContent = 'Loading donation data...';
        const response = await fetch(API_URL + '?t=' + Date.now(), {
            method: 'GET',
            cache: 'no-cache'
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data.donations.length === 0) {
            throw new Error('No donation data found');
        }
        // Store data for PDF export
        currentDonationData = data;
        updateDashboard(data.totalAmount, data.totalDonors);
        updateDonationTable(data.donations, sortOrder, sortType);
        // Track successful data load
        trackEvent('data_loaded', {
            event_category: 'data',
            event_label: `Donation Data - ${data.totalDonors} donors`,
            value: data.totalDonors
        });
        // Hide status message on success
        statusEl.style.display = 'none';
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            const lastUpdatedDate = new Date(data.lastUpdated);
            lastUpdatedEl.textContent = `Last Updated: ${lastUpdatedDate.toLocaleString('en-US')}`;
        }
    }
    catch (error) {
        console.error('Error fetching donation data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Show error message
        statusEl.style.display = 'block';
        statusEl.className = 'status error';
        statusEl.textContent = `Error: ${errorMessage}. Please check the server connection.`;
        const donationTable = document.getElementById('donationTable');
        if (donationTable) {
            donationTable.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                        Unable to load donations. Please check the server connection.
                    </td>
                </tr>
            `;
        }
    }
}
function calculateDaysRemaining() {
    const programDate = new Date('2025-12-27');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    programDate.setHours(0, 0, 0, 0);
    const diffTime = programDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}
function updateDashboard(totalAmount, totalDonors) {
    const totalAmountEl = document.getElementById('totalAmount');
    const totalDonorsEl = document.getElementById('totalDonors');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const chartFill = document.getElementById('chartFill');
    const chartValue = document.getElementById('chartValue');
    const remainingAmountEl = document.getElementById('remainingAmount');
    const averageDonationEl = document.getElementById('averageDonation');
    const daysRemainingEl = document.getElementById('daysRemaining');
    if (totalAmountEl) {
        totalAmountEl.textContent = formatCurrency(totalAmount);
    }
    if (totalDonorsEl) {
        totalDonorsEl.textContent = totalDonors.toString();
    }
    // Get target from API response or use default
    const targetAmount = 600000; // This will come from API in future
    const percentage = Math.min((totalAmount / targetAmount) * 100, 100);
    // Calculate and display remaining amount
    const remainingAmount = Math.max(0, targetAmount - totalAmount);
    if (remainingAmountEl) {
        remainingAmountEl.textContent = formatCurrency(remainingAmount);
    }
    // Calculate and display average donation
    const averageDonation = totalDonors > 0 ? Math.round(totalAmount / totalDonors) : 0;
    if (averageDonationEl) {
        averageDonationEl.textContent = formatCurrency(averageDonation);
    }
    // Calculate and display days remaining
    const daysRemaining = calculateDaysRemaining();
    if (daysRemainingEl) {
        if (daysRemaining === 0) {
            daysRemainingEl.textContent = 'Today';
        }
        else if (daysRemaining === 1) {
            daysRemainingEl.textContent = '1 day';
        }
        else {
            daysRemainingEl.textContent = `${daysRemaining} days`;
        }
    }
    if (progressFill) {
        const percentText = percentage.toFixed(1) + '%';
        progressFill.style.width = percentage + '%';
        // Show percentage inside bar if wide enough (>= 20%), otherwise show overlay above
        const progressOverlay = document.getElementById('progressOverlay');
        if (progressOverlay) {
            if (percentage >= 20) {
                // Bar is wide enough, show text inside bar only
                progressFill.textContent = percentText;
                progressOverlay.style.display = 'none';
            }
            else {
                // Bar is too narrow, show overlay above bar and hide text inside
                progressFill.textContent = '';
                progressOverlay.style.display = 'block';
                progressOverlay.textContent = percentText;
            }
        }
        else {
            // Fallback if overlay doesn't exist
            progressFill.textContent = percentText;
        }
    }
    if (progressText) {
        progressText.textContent = `${percentage.toFixed(1)}% of target reached (${formatCurrency(totalAmount)} / ${formatCurrency(targetAmount)})`;
    }
    if (chartFill) {
        chartFill.style.width = percentage + '%';
    }
    if (chartValue) {
        chartValue.textContent = formatCurrency(totalAmount);
    }
}
function sortDonationsByAmount(donations, order) {
    const sorted = [...donations].sort((a, b) => {
        if (order === 'desc') {
            return b.amount - a.amount; // Highest to lowest
        }
        else {
            return a.amount - b.amount; // Lowest to highest
        }
    });
    return sorted;
}
function sortDonationsByTimestamp(donations, order) {
    const sorted = [...donations].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        if (order === 'desc') {
            return dateB - dateA; // Newest to oldest
        }
        else {
            return dateA - dateB; // Oldest to newest
        }
    });
    return sorted;
}
function updateDonationTable(donations, currentSortOrder = 'desc', currentSortType = 'amount') {
    const tbody = document.getElementById('donationTable');
    if (!tbody)
        return;
    if (donations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                    No donations found.
                </td>
            </tr>
        `;
        return;
    }
    // Sort donations based on sort type
    const sortedDonations = currentSortType === 'timestamp'
        ? sortDonationsByTimestamp(donations, currentSortOrder)
        : sortDonationsByAmount(donations, currentSortOrder);
    tbody.innerHTML = sortedDonations.map(donation => {
        const receiptCell = donation.receipt && donation.receipt.trim() !== ''
            ? `<a href="${donation.receipt}" target="_blank" rel="noopener noreferrer" class="receipt-link">View Receipt</a>`
            : '<span style="color: #999;">N/A</span>';
        return `
            <tr>
                <td>${formatTimestamp(donation.timestamp)}</td>
                <td>${donation.name || 'Anonymous'}</td>
                <td><strong>${formatCurrency(donation.amount)}</strong></td>
                <td>${receiptCell}</td>
            </tr>
        `;
    }).join('');
}
// PDF Export Function
function downloadDonationPDF() {
    if (!currentDonationData || currentDonationData.donations.length === 0) {
        alert('No donation data available to export.');
        return;
    }
    // @ts-ignore - jsPDF is loaded from CDN
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    // Set font
    doc.setFont('helvetica');
    // Title
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('Cyclone Relief Fund - Donation Records', 14, 20);
    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(85, 85, 85);
    doc.text('University of Colombo, Faculty of Science, 2016/17 Batch', 14, 28);
    // Summary Information
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Collected: ${formatCurrency(currentDonationData.totalAmount)}`, 14, 38);
    doc.text(`Total Donors: ${currentDonationData.totalDonors}`, 14, 44);
    doc.text(`Target Amount: ${formatCurrency(currentDonationData.targetAmount)}`, 14, 50);
    doc.text(`Progress: ${currentDonationData.percentage.toFixed(1)}%`, 14, 56);
    // Date
    const exportDate = new Date().toLocaleString('en-US');
    doc.text(`Report Generated: ${exportDate}`, 14, 62);
    // Table Header
    let yPos = 72;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(52, 152, 219);
    doc.rect(14, yPos - 5, 182, 8, 'F');
    doc.text('No.', 16, yPos);
    doc.text('Timestamp', 30, yPos);
    doc.text('Donor Name', 80, yPos);
    doc.text('Amount (LKR)', 140, yPos);
    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    yPos += 8;
    currentDonationData.donations.forEach((donation, index) => {
        if (yPos > 280) {
            doc.addPage();
            yPos = 20;
            // Repeat header on new page
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(52, 152, 219);
            doc.rect(14, yPos - 5, 182, 8, 'F');
            doc.text('No.', 16, yPos);
            doc.text('Timestamp', 30, yPos);
            doc.text('Donor Name', 80, yPos);
            doc.text('Amount (LKR)', 140, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            yPos += 8;
        }
        // Alternate row colors
        if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(14, yPos - 5, 182, 8, 'F');
        }
        doc.text((index + 1).toString(), 16, yPos);
        doc.text(formatTimestamp(donation.timestamp), 30, yPos);
        // Truncate long names
        const donorName = donation.name.length > 25 ? donation.name.substring(0, 22) + '...' : donation.name;
        doc.text(donorName, 80, yPos);
        doc.text(formatCurrency(donation.amount), 140, yPos);
        yPos += 8;
    });
    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${pageCount} - Cyclone Relief Fund Donation Records`, 105, 290, { align: 'center' });
    }
    // Save PDF
    const fileName = `Donation_Records_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
// Sort by amount function
function toggleSortByAmount() {
    // Set sort type to amount
    sortType = 'amount';
    // Toggle sort order
    sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    // Update sort indicator
    const sortIndicator = document.getElementById('sortIndicator');
    if (sortIndicator) {
        sortIndicator.textContent = sortOrder === 'desc' ? '↓' : '↑';
    }
    // Update button text
    const sortBtn = document.getElementById('sortByAmountBtn');
    if (sortBtn) {
        sortBtn.innerHTML = `Sort by Amount <span id="sortIndicator">${sortOrder === 'desc' ? '↓' : '↑'}</span>`;
    }
    // Reset timestamp sort button
    const sortTimestampBtn = document.getElementById('sortByTimestampBtn');
    if (sortTimestampBtn) {
        sortTimestampBtn.innerHTML = `Sort by Timestamp <span id="sortTimestampIndicator">↕</span>`;
    }
    // Re-render table with new sort order
    if (currentDonationData) {
        updateDonationTable(currentDonationData.donations, sortOrder, sortType);
    }
}
// Sort by timestamp function
function toggleSortByTimestamp() {
    // Set sort type to timestamp
    sortType = 'timestamp';
    // Toggle sort order
    sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    // Update sort indicator
    const sortTimestampIndicator = document.getElementById('sortTimestampIndicator');
    if (sortTimestampIndicator) {
        sortTimestampIndicator.textContent = sortOrder === 'desc' ? '↓' : '↑';
    }
    // Update button text
    const sortTimestampBtn = document.getElementById('sortByTimestampBtn');
    if (sortTimestampBtn) {
        sortTimestampBtn.innerHTML = `Sort by Timestamp <span id="sortTimestampIndicator">${sortOrder === 'desc' ? '↓' : '↑'}</span>`;
    }
    // Reset amount sort button
    const sortBtn = document.getElementById('sortByAmountBtn');
    if (sortBtn) {
        sortBtn.innerHTML = `Sort by Amount <span id="sortIndicator">↕</span>`;
    }
    // Re-render table with new sort order
    if (currentDonationData) {
        updateDonationTable(currentDonationData.donations, sortOrder, sortType);
    }
}
// Track custom events
function trackEvent(eventName, eventParams) {
    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, eventParams);
    }
    // Also track locally for admin dashboard
    if (typeof window.trackLocalEvent === 'function') {
        window.trackLocalEvent(eventName, eventParams?.event_label);
    }
}
// Initialize PDF download button and sort button
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            trackEvent('download_pdf', {
                event_category: 'engagement',
                event_label: 'Donation Records PDF'
            });
            downloadDonationPDF();
        });
    }
    const sortBtn = document.getElementById('sortByAmountBtn');
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            trackEvent('sort_donations', {
                event_category: 'engagement',
                event_label: 'Sort by Amount'
            });
            toggleSortByAmount();
        });
    }
    const sortTimestampBtn = document.getElementById('sortByTimestampBtn');
    if (sortTimestampBtn) {
        sortTimestampBtn.addEventListener('click', () => {
            trackEvent('sort_donations', {
                event_category: 'engagement',
                event_label: 'Sort by Timestamp'
            });
            toggleSortByTimestamp();
        });
    }
});
// Initialization
fetchDonationData();
setInterval(fetchDonationData, REFRESH_INTERVAL);
