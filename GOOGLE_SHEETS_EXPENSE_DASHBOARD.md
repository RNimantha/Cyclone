# Google Sheets Expense Dashboard Guide
## Cyclone Relief Fund - Expense Tracking Dashboard

This guide provides step-by-step instructions to create a comprehensive, transparent expense dashboard directly in Google Sheets using formulas, pivot tables, and charts.

---

## Dashboard Layout Structure

Create a new sheet called **"Dashboard"** in your Google Sheet and organize it as follows:

```
Row 1:  Dashboard Header
Row 2:  Empty
Row 3-5: Key Metrics (Total Expenses, Count, Average)
Row 6:  Empty
Row 7-20: Charts Section
Row 21+: Data Tables (Recent Expenses, Top Expenses)
```

---

## Step 1: Key Metrics Section

### Location: Dashboard Sheet, Rows 3-5

#### A3: Total Expenses (LKR)
```
=SUM(Responses!F:F)
```
**Explanation**: Sums all amounts from column F (Amount LKR)

#### A4: Number of Expenses
```
=COUNTA(Responses!F:F)-1
```
**Explanation**: Counts non-empty cells, minus 1 for header row

#### A5: Average Expense Amount
```
=AVERAGE(Responses!F2:F1000)
```
**Alternative (more robust)**:
```
=IF(COUNTA(Responses!F2:F1000)>0, SUM(Responses!F2:F1000)/COUNTA(Responses!F2:F1000), 0)
```

**Or use this cleaner version**:
```
=IF(COUNT(Responses!F2:F1000)>0, AVERAGE(Responses!F2:F1000), 0)
```

**Format**: Currency (LKR) with 2 decimal places

---

## Step 2: Create Pivot Table for Category Analysis

### Location: New Sheet "Pivot_Categories"

1. Go to your main data sheet (likely "Form Responses 1" or "Responses")
2. Select all data (including headers)
3. Go to **Data > Pivot table**
4. Choose "New sheet" → Name it "Pivot_Categories"

### Pivot Table Configuration:

**Rows**: 
- Expense Categories (Column D)

**Values**: 
- Amount (LKR) → Summarize by: SUM
- Amount (LKR) → Summarize by: COUNT (add second value)

**Result**: This shows total and count per category

---

## Step 3: Expenses by Category Chart (Pie/Donut)

### Location: Dashboard Sheet, starting around Row 7

1. Select the Pivot_Categories sheet
2. Select the Category column and Sum of Amount column
3. Insert → Chart
4. Chart type: **Pie chart** or **Donut chart**
5. **Chart Title**: "Expenses by Category"
6. **Colors**: Use distinct, professional colors
7. Copy chart to Dashboard sheet

### Alternative: Direct QUERY Formula

If you prefer a formula-based approach without pivot table:

**A7**: Category header
**A8** (and copy down):
```
=QUERY(Responses!A2:H1000, "SELECT D, SUM(F) WHERE F IS NOT NULL AND F != '' GROUP BY D ORDER BY SUM(F) DESC LABEL SUM(F) 'Total Amount'", 1)
```

Then create chart from this query result.

---

## Step 4: Expenses Over Time (Line Chart)

### Create Time-Based Pivot Table

**New Sheet**: "Pivot_Time"

**Pivot Table Configuration**:
- **Rows**: Expense Date (Column B)
- **Values**: Amount (LKR) → SUM

**Sort**: By Expense Date (Ascending)

### Create Line Chart

1. Select the Pivot_Time sheet data
2. Insert → Chart
3. Chart type: **Line chart**
4. **Chart Title**: "Expenses Over Time"
5. **X-axis**: Expense Date
6. **Y-axis**: Total Amount (LKR)
7. Copy to Dashboard sheet

### Alternative: Formula Approach

**A25** (Header): Expense Date
**B25** (Header): Total Amount

**A26** (and copy down):
```
=UNIQUE(Responses!B2:B1000)
```

**B26** (array formula, enter once):
```
=ARRAYFORMULA(IF(A26:A1000="", "", SUMIF(Responses!B:B, A26:A1000, Responses!F:F)))
```

Then create chart from this range.

---

## Step 5: Top 5 Expense Purposes (Bar Chart)

### Location: Dashboard Sheet, or new sheet "Pivot_Top5"

**Pivot Table Configuration**:
- **Rows**: Expense Title / Purpose (Column C)
- **Values**: Amount (LKR) → SUM
- **Sort**: By Sum of Amount (Descending)
- **Filter**: Limit to top 5 rows

### Create Bar Chart

1. Select top 5 rows from pivot table
2. Insert → Chart
3. Chart type: **Bar chart** (horizontal recommended)
4. **Chart Title**: "Top 5 Expense Purposes"
5. Copy to Dashboard sheet

### Alternative: QUERY Formula

**F7** (Header): Expense Purpose
**G7** (Header): Amount

**F8** (array formula):
```
=QUERY(Responses!C2:F1000, "SELECT C, SUM(F) WHERE F IS NOT NULL AND F != '' GROUP BY C ORDER BY SUM(F) DESC LIMIT 5 LABEL SUM(F) 'Total Amount'", 1)
```

---

## Step 6: Expenses with Receipt vs Without Receipt

### Location: Dashboard Sheet

**Create Pivot Table**:

**New Sheet**: "Pivot_Receipts"

**Pivot Table Configuration**:
- **Rows**: Receipt (Column G)
- **Values**: 
  - Amount (LKR) → SUM
  - COUNT (to count number of expenses)

### Formula Alternative (Dashboard Sheet)

**D3**: Expenses with Receipt
```
=SUMIF(Responses!G:G, "<>", Responses!F:F)
```

**D4**: Expenses without Receipt
```
=SUMIF(Responses!G:G, "", Responses!F:F)
```

**E3**: Count with Receipt
```
=COUNTIFS(Responses!G:G, "<>", Responses!F:F, ">0")
```

**E4**: Count without Receipt
```
=COUNTIFS(Responses!G:G, "", Responses!F:F, ">0")
```

### Create Pie Chart

1. Select the two categories (With Receipt / Without Receipt) and their amounts
2. Insert → Chart → Pie chart
3. **Chart Title**: "Expenses: Receipt Status"

---

## Step 7: Recent 5 Expenses Table (Auto-Updating)

### Location: Dashboard Sheet, starting around Row 30

**A30** (Headers row):
```
Timestamp | Expense Date | Title | Category | Amount | Receipt
```

**A31** (Array formula - enter once, spans all rows):
```
=QUERY(Responses!A2:H1000, "SELECT A, B, C, D, F, G WHERE F IS NOT NULL AND F != '' ORDER BY A DESC LIMIT 5", 1)
```

**Explanation**: 
- Selects columns A, B, C, D, F, G (Timestamp, Date, Title, Category, Amount, Receipt)
- Filters out empty amounts
- Orders by Timestamp descending (newest first)
- Limits to 5 rows

**Formatting**:
- Bold the header row
- Format Amount column as Currency
- Add alternating row colors for readability

---

## Step 8: Additional Useful Metrics (Optional)

### Expense by Month

**I3**: Current Month Expenses
```
=SUMIFS(Responses!F:F, Responses!B:B, ">="&EOMONTH(TODAY(),-1)+1, Responses!B:B, "<="&EOMONTH(TODAY(),0))
```

**I4**: Last Month Expenses
```
=SUMIFS(Responses!F:F, Responses!B:B, ">="&EOMONTH(TODAY(),-2)+1, Responses!B:B, "<="&EOMONTH(TODAY(),-1))
```

### Highest Single Expense

**J3**: Largest Expense
```
=MAX(Responses!F2:F1000)
```

**J4**: Purpose of Largest Expense
```
=INDEX(Responses!C2:C1000, MATCH(MAX(Responses!F2:F1000), Responses!F2:F1000, 0))
```

---

## Step 9: Dashboard Formatting & Polish

### Recommended Formatting:

1. **Header Row (Row 1)**:
   - Large, bold font
   - Background color: Dark blue (#1a5490)
   - Text color: White
   - Text: "Cyclone Relief Fund - Expense Dashboard"

2. **Metric Cards** (Rows 3-5):
   - Bold labels
   - Large numbers (18-24pt font)
   - Light background color
   - Borders for clarity

3. **Charts**:
   - Consistent color scheme
   - Clear titles
   - Legends where needed
   - Gridlines for readability

4. **Tables**:
   - Alternating row colors
   - Bold headers
   - Borders
   - Number formatting (currency for amounts)

---

## Step 10: Protection & Transparency

### Protect Formulas (Optional):

1. Select all cells with formulas
2. Right-click → Protect range
3. Add description: "Formula cells - Read only"
4. Allow viewers to see, but not edit

### Add Last Updated Indicator:

**A1** (Dashboard header area):
```
=CONCATENATE("Last Updated: ", TEXT(NOW(), "MMM DD, YYYY HH:MM"))
```

Or simpler:
```
="Last Updated: " & TEXT(NOW(), "MMM DD, YYYY HH:MM")
```

---

## Complete Dashboard Layout Template

```
┌─────────────────────────────────────────────────────────────┐
│  Cyclone Relief Fund - Expense Dashboard      Last Updated  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Key Metrics:                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Total: LKR   │  │ Count: ###   │  │ Avg: LKR ### │      │
│  │   ###,###    │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │ Expenses by Category   │  │ Top 5 Expense Purposes │    │
│  │   (Pie/Donut Chart)    │  │   (Bar Chart)          │    │
│  └────────────────────────┘  └────────────────────────┘    │
│                                                              │
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │ Expenses Over Time     │  │ Receipt Status         │    │
│  │   (Line Chart)         │  │   (Pie Chart)          │    │
│  └────────────────────────┘  └────────────────────────┘    │
│                                                              │
│  Recent 5 Expenses:                                         │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐              │
│  │ Date │Title │Cat.  │Amount│Rcpt? │      │              │
│  ├──────┼──────┼──────┼──────┼──────┼──────┤              │
│  │ ...  │ ...  │ ...  │ ...  │ ...  │ ...  │              │
│  └──────┴──────┴──────┴──────┴──────┴──────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Important Notes

### Sheet Name References:
- Replace `Responses!` with your actual sheet name (could be "Form Responses 1", "Sheet1", etc.)
- Update all formulas accordingly

### Range Limits:
- Formulas use `F2:F1000` - adjust upper limit based on expected data volume
- Consider using `F:F` for entire column, but be aware of performance

### Data Validation:
- Ensure Expense Date (Column B) is formatted as Date
- Ensure Amount (Column F) is formatted as Number/Currency
- Use Data Validation on Category column for consistency

### Performance:
- Pivot tables are more efficient than large QUERY formulas
- For very large datasets (>1000 rows), prefer pivot tables
- Charts update automatically when source data changes

---

## Quick Reference: All Formulas Summary

| Metric | Formula |
|--------|---------|
| Total Expenses | `=SUM(Responses!F:F)` |
| Count Expenses | `=COUNTA(Responses!F:F)-1` |
| Average Expense | `=AVERAGE(Responses!F2:F1000)` |
| With Receipt | `=SUMIF(Responses!G:G, "<>", Responses!F:F)` |
| Without Receipt | `=SUMIF(Responses!G:G, "", Responses!F:F)` |
| Recent 5 | `=QUERY(Responses!A2:H1000, "SELECT A,B,C,D,F,G WHERE F IS NOT NULL ORDER BY A DESC LIMIT 5", 1)` |
| Top 5 Purposes | `=QUERY(Responses!C2:F1000, "SELECT C, SUM(F) WHERE F IS NOT NULL GROUP BY C ORDER BY SUM(F) DESC LIMIT 5", 1)` |
| Expenses by Category | Use Pivot Table (Rows: Category, Values: SUM of Amount) |
| Expenses Over Time | Use Pivot Table (Rows: Expense Date, Values: SUM of Amount) |

---

## Troubleshooting

### Formulas return errors:
1. Check sheet name matches exactly (case-sensitive)
2. Verify column letters are correct
3. Ensure data starts from row 2 (row 1 = headers)

### Charts not updating:
1. Refresh pivot tables: Right-click → Refresh
2. Check data range includes new rows
3. Verify chart data source range

### Performance issues:
1. Replace `F:F` with specific ranges like `F2:F1000`
2. Use pivot tables instead of complex QUERY formulas
3. Limit chart data ranges

---

This dashboard will provide complete transparency and automatically update as new expenses are added to your form responses sheet!

