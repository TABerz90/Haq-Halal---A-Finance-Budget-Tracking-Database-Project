-- Personal Finance Tracker and Budget Management System
-- Deliverable 2 - Part 2: Views and Queries (SQL Server / T-SQL Version)
-- FAST-NU, Lahore, Pakistan
-- Spring 2026

-- Drop existing views if they exist
IF OBJECT_ID('Cash_Flow_Forecast', 'V') IS NOT NULL DROP VIEW Cash_Flow_Forecast;
IF OBJECT_ID('YoY_Financial_Comparison', 'V') IS NOT NULL DROP VIEW YoY_Financial_Comparison;
IF OBJECT_ID('Recurring_Due_This_Month', 'V') IS NOT NULL DROP VIEW Recurring_Due_This_Month;
IF OBJECT_ID('Unread_Budget_Alerts', 'V') IS NOT NULL DROP VIEW Unread_Budget_Alerts;
IF OBJECT_ID('Account_Transfer_History', 'V') IS NOT NULL DROP VIEW Account_Transfer_History;
IF OBJECT_ID('Active_Recurring_Transactions', 'V') IS NOT NULL DROP VIEW Active_Recurring_Transactions;
IF OBJECT_ID('Recent_Transactions_Detailed', 'V') IS NOT NULL DROP VIEW Recent_Transactions_Detailed;
IF OBJECT_ID('Budget_Status_Overview', 'V') IS NOT NULL DROP VIEW Budget_Status_Overview;
IF OBJECT_ID('Top_Spending_Categories', 'V') IS NOT NULL DROP VIEW Top_Spending_Categories;
IF OBJECT_ID('Monthly_Financial_Overview', 'V') IS NOT NULL DROP VIEW Monthly_Financial_Overview;
IF OBJECT_ID('User_Dashboard_Summary', 'V') IS NOT NULL DROP VIEW User_Dashboard_Summary;
GO

-- ============================================
-- SECTION 1: OPTIMIZED VIEWS
-- ============================================

-- ============================================
-- View: User_Dashboard_Summary
-- Purpose: Quick overview using CTEs instead of subqueries
-- ============================================
CREATE VIEW User_Dashboard_Summary AS
WITH Monthly_Stats AS (
    SELECT 
        user_id,
        COUNT(*) as transactions_this_month
    FROM Transactions
    WHERE MONTH(transaction_date) = MONTH(GETDATE())
        AND YEAR(transaction_date) = YEAR(GETDATE())
    GROUP BY user_id
),
Alert_Stats AS (
    SELECT 
        user_id,
        COUNT(*) as unread_alerts
    FROM Budget_Alerts
    WHERE is_read = 0
    GROUP BY user_id
)
SELECT 
    u.user_id,
    u.full_name,
    u.username,
    ISNULL(SUM(a.current_balance), 0) as total_balance,
    COUNT(DISTINCT a.account_id) as active_accounts,
    ISNULL(ms.transactions_this_month, 0) as transactions_this_month,
    ISNULL(als.unread_alerts, 0) as unread_alerts
FROM Users u
LEFT JOIN Accounts a ON u.user_id = a.user_id AND a.is_active = 1
LEFT JOIN Monthly_Stats ms ON u.user_id = ms.user_id
LEFT JOIN Alert_Stats als ON u.user_id = als.user_id
GROUP BY u.user_id, u.full_name, u.username, ms.transactions_this_month, als.unread_alerts;
GO

-- ============================================
-- View: Monthly_Financial_Overview
-- Purpose: Income, expenses, and savings per month
-- ============================================
CREATE VIEW Monthly_Financial_Overview AS
SELECT 
    ums.user_id,
    u.username,
    ums.summary_month,
    ums.total_income,
    ums.total_expenses,
    ums.net_savings,
    ums.transaction_count,
    CASE 
        WHEN ums.total_income = 0 THEN 0
        ELSE ROUND((ums.net_savings / ums.total_income) * 100, 2)
    END as savings_rate_percentage,
    ums.largest_expense,
    ums.largest_income
FROM User_Monthly_Summary ums
JOIN Users u ON ums.user_id = u.user_id;
GO

-- ============================================
-- View: Top_Spending_Categories
-- Purpose: All spending categories ranked (no LIMIT)
-- ============================================
CREATE VIEW Top_Spending_Categories AS
SELECT 
    css.user_id,
    u.username,
    c.category_name,
    css.total_amount,
    css.transaction_count,
    css.average_transaction,
    css.summary_month,
    RANK() OVER (PARTITION BY css.user_id ORDER BY css.total_amount DESC) as spending_rank
FROM Category_Spending_Summary css
JOIN Users u ON css.user_id = u.user_id
JOIN Categories c ON css.category_id = c.category_id
WHERE css.summary_month = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
GO

-- ============================================
-- View: Budget_Status_Overview
-- Purpose: Real-time budget calculations
-- ============================================
CREATE VIEW Budget_Status_Overview AS
SELECT 
    b.user_id,
    u.username,
    c.category_name,
    b.budget_month,
    b.budget_amount as budgeted_amount,
    ISNULL(SUM(t.amount), 0) as actual_spent,
    b.budget_amount - ISNULL(SUM(t.amount), 0) as remaining_amount,
    ROUND((ISNULL(SUM(t.amount), 0) / b.budget_amount * 100), 2) as percentage_used,
    CASE 
        WHEN ISNULL(SUM(t.amount), 0) >= b.budget_amount THEN 'Over Budget'
        WHEN (ISNULL(SUM(t.amount), 0) / b.budget_amount * 100) >= b.alert_threshold THEN 'Near Limit'
        ELSE 'Under Budget'
    END as status,
    DATEDIFF(DAY, GETDATE(), EOMONTH(b.budget_month)) as days_remaining,
    CASE 
        WHEN ISNULL(SUM(t.amount), 0) >= b.budget_amount THEN 'Danger'
        WHEN (ISNULL(SUM(t.amount), 0) / b.budget_amount * 100) >= b.alert_threshold THEN 'Warning'
        ELSE 'Good'
    END as health_indicator
FROM Budgets b
JOIN Users u ON b.user_id = u.user_id
JOIN Categories c ON b.category_id = c.category_id
LEFT JOIN Transactions t ON b.category_id = t.category_id 
    AND b.user_id = t.user_id
    AND t.transaction_type = 'Expense'
    AND DATEFROMPARTS(YEAR(t.transaction_date), MONTH(t.transaction_date), 1) = b.budget_month
GROUP BY b.budget_id, b.user_id, u.username, c.category_name, b.budget_month, 
         b.budget_amount, b.alert_threshold;
GO

-- ============================================
-- View: Recent_Transactions_Detailed
-- Purpose: Recent transactions with all related info
-- ============================================
CREATE VIEW Recent_Transactions_Detailed AS
SELECT 
    t.transaction_id,
    t.user_id,
    u.username,
    t.transaction_date,
    t.transaction_type,
    t.amount,
    c.category_name,
    c.category_type,
    a.account_name,
    a.account_type,
    t.payment_method,
    t.description,
    t.created_at
FROM Transactions t
JOIN Users u ON t.user_id = u.user_id
JOIN Categories c ON t.category_id = c.category_id
JOIN Accounts a ON t.account_id = a.account_id;
GO

-- ============================================
-- View: Active_Recurring_Transactions
-- Purpose: All active recurring transaction templates
-- ============================================
CREATE VIEW Active_Recurring_Transactions AS
SELECT 
    rt.recurring_id,
    rt.user_id,
    u.username,
    c.category_name,
    a.account_name,
    rt.transaction_type,
    rt.amount,
    rt.frequency,
    rt.start_date,
    rt.end_date,
    rt.last_generated_date,
    rt.description,
    DATEDIFF(DAY, GETDATE(), ISNULL(rt.end_date, '2099-12-31')) as days_until_end
FROM Recurring_Transactions rt
JOIN Users u ON rt.user_id = u.user_id
JOIN Categories c ON rt.category_id = c.category_id
JOIN Accounts a ON rt.account_id = a.account_id
WHERE rt.is_active = 1;
GO

-- ============================================
-- View: Recurring_Due_This_Month
-- Purpose: Calculates next due date for recurring transactions
-- ============================================
CREATE VIEW Recurring_Due_This_Month AS
SELECT 
    rt.recurring_id,
    c.category_name,
    a.account_name,
    rt.transaction_type,
    rt.amount,
    rt.frequency,
    rt.description,
    rt.last_generated_date,
    CASE rt.frequency
        WHEN 'Daily' THEN DATEADD(DAY, 1, ISNULL(rt.last_generated_date, rt.start_date))
        WHEN 'Weekly' THEN DATEADD(WEEK, 1, ISNULL(rt.last_generated_date, rt.start_date))
        WHEN 'Monthly' THEN DATEADD(MONTH, 1, ISNULL(rt.last_generated_date, rt.start_date))
        WHEN 'Yearly' THEN DATEADD(YEAR, 1, ISNULL(rt.last_generated_date, rt.start_date))
    END as next_due_date
FROM Recurring_Transactions rt
JOIN Categories c ON rt.category_id = c.category_id
JOIN Accounts a ON rt.account_id = a.account_id
WHERE rt.is_active = 1
    AND (rt.end_date IS NULL OR rt.end_date >= CAST(GETDATE() AS DATE));
GO

-- ============================================
-- View: Account_Transfer_History
-- Purpose: Transfer history with account details
-- ============================================
CREATE VIEW Account_Transfer_History AS
SELECT 
    at.transfer_id,
    at.user_id,
    u.username,
    at.transfer_date,
    from_acc.account_name as from_account,
    from_acc.account_type as from_account_type,
    to_acc.account_name as to_account,
    to_acc.account_type as to_account_type,
    at.amount,
    at.description,
    at.created_at
FROM Account_Transfers at
JOIN Users u ON at.user_id = u.user_id
JOIN Accounts from_acc ON at.from_account_id = from_acc.account_id
JOIN Accounts to_acc ON at.to_account_id = to_acc.account_id;
GO

-- ============================================
-- View: Unread_Budget_Alerts
-- Purpose: Active alerts that need attention
-- ============================================
CREATE VIEW Unread_Budget_Alerts AS
SELECT 
    ba.alert_id,
    ba.user_id,
    u.username,
    ba.alert_type,
    ba.alert_message,
    c.category_name,
    b.budget_amount,
    ba.percentage_used,
    ba.created_at,
    DATEDIFF(DAY, ba.created_at, GETDATE()) as days_old
FROM Budget_Alerts ba
JOIN Users u ON ba.user_id = u.user_id
JOIN Budgets b ON ba.budget_id = b.budget_id
JOIN Categories c ON b.category_id = c.category_id
WHERE ba.is_read = 0;
GO

-- ============================================
-- View: YoY_Financial_Comparison
-- Purpose: Year-over-Year income and expense comparison
-- ============================================
CREATE VIEW YoY_Financial_Comparison AS
SELECT 
    user_id,
    YEAR(summary_month) as year,
    MONTH(summary_month) as month,
    SUM(total_income) as yearly_income,
    SUM(total_expenses) as yearly_expenses,
    SUM(net_savings) as yearly_savings,
    LAG(SUM(total_income)) 
        OVER (PARTITION BY user_id ORDER BY YEAR(summary_month), MONTH(summary_month)) as prev_year_income,
    ROUND(((SUM(total_income) - LAG(SUM(total_income)) 
        OVER (PARTITION BY user_id ORDER BY YEAR(summary_month), MONTH(summary_month))) 
        / NULLIF(LAG(SUM(total_income)) 
        OVER (PARTITION BY user_id ORDER BY YEAR(summary_month), MONTH(summary_month)), 0)) * 100, 2) as income_change_percentage
FROM User_Monthly_Summary
GROUP BY user_id, YEAR(summary_month), MONTH(summary_month);
GO

-- ============================================
-- View: Cash_Flow_Forecast
-- Purpose: 30-day cash flow forecast based on recurring transactions
-- ============================================
CREATE VIEW Cash_Flow_Forecast AS
WITH Numbers AS (
    SELECT 0 as day UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL
    SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL
    SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL
    SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL
    SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL
    SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
)
SELECT 
    u.user_id,
    u.username,
    DATEADD(DAY, n.day, CAST(GETDATE() AS DATE)) as forecast_date,
    ISNULL(SUM(CASE WHEN rt.transaction_type = 'Income' THEN rt.amount ELSE 0 END), 0) as expected_income,
    ISNULL(SUM(CASE WHEN rt.transaction_type = 'Expense' THEN rt.amount ELSE 0 END), 0) as expected_expenses
FROM Users u
CROSS JOIN Numbers n
LEFT JOIN Recurring_Transactions rt ON u.user_id = rt.user_id
    AND rt.is_active = 1
    AND (
        (rt.frequency = 'Daily') OR
        (rt.frequency = 'Weekly' AND DATEPART(WEEKDAY, DATEADD(DAY, n.day, GETDATE())) = DATEPART(WEEKDAY,
            DATEADD(WEEK, 1, ISNULL(rt.last_generated_date, rt.start_date)))) OR
        (rt.frequency = 'Monthly' AND DAY(DATEADD(DAY, n.day, GETDATE())) = DAY(
            DATEADD(MONTH, 1, ISNULL(rt.last_generated_date, rt.start_date))))
    )
WHERE n.day <= 29
GROUP BY u.user_id, u.username, DATEADD(DAY, n.day, CAST(GETDATE() AS DATE));
GO

-- ============================================
-- SECTION 2: COMPLEX QUERIES FOR ANALYTICS
-- ============================================

-- ============================================
-- Query: Top 5 Spending Categories (Current Month)
-- ============================================
SELECT 
    category_name,
    total_amount as total_spent,
    transaction_count,
    average_transaction
FROM Top_Spending_Categories
WHERE user_id = 1  -- Replace with actual user_id
    AND spending_rank <= 5
ORDER BY total_spent DESC;
GO

-- ============================================
-- Query: Monthly Income vs Expenses Trend (Last 6 Months)
-- ============================================
SELECT 
    FORMAT(t.transaction_date, 'yyyy-MM') as month,
    SUM(CASE WHEN t.transaction_type = 'Income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN t.transaction_type = 'Expense' THEN t.amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN t.transaction_type = 'Income' THEN t.amount ELSE -t.amount END) as net_savings
FROM Transactions t
WHERE t.user_id = 1  -- Replace with actual user_id
    AND t.transaction_date >= DATEADD(MONTH, -6, EOMONTH(GETDATE()))
    AND t.transaction_date <= DATEADD(DAY, 1, EOMONTH(GETDATE()))
GROUP BY FORMAT(t.transaction_date, 'yyyy-MM')
ORDER BY month DESC;
GO

-- ============================================
-- Query: Budget Performance Summary (Current Month)
-- ============================================
SELECT 
    category_name,
    budgeted_amount,
    actual_spent,
    remaining_amount,
    percentage_used,
    status
FROM Budget_Status_Overview
WHERE user_id = 1  -- Replace with actual user_id
    AND budget_month = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
ORDER BY percentage_used DESC;
GO

-- ============================================
-- Query: Account Balance Summary with Recent Activity
-- ============================================
SELECT 
    a.account_name,
    a.account_type,
    a.current_balance,
    COUNT(DISTINCT t.transaction_id) as transactions_last_30_days,
    ISNULL(SUM(CASE WHEN t.transaction_type = 'Income' THEN t.amount ELSE 0 END), 0) as income_last_30_days,
    ISNULL(SUM(CASE WHEN t.transaction_type = 'Expense' THEN t.amount ELSE 0 END), 0) as expenses_last_30_days
FROM Accounts a
LEFT JOIN Transactions t ON a.account_id = t.account_id 
    AND t.transaction_date >= DATEADD(DAY, -30, GETDATE())
WHERE a.user_id = 1  -- Replace with actual user_id
    AND a.is_active = 1
GROUP BY a.account_id, a.account_name, a.account_type, a.current_balance
ORDER BY a.current_balance DESC;
GO

-- ============================================
-- Query: Spending Pattern by Day of Week
-- Note: DATEPART(WEEKDAY) returns 1=Sunday, 7=Saturday
--       To get Monday=1, use: (DATEPART(WEEKDAY, date) + @@DATEFIRST - 2) % 7 + 1
-- ============================================
SELECT 
    DATENAME(WEEKDAY, t.transaction_date) as day_of_week,
    DATEPART(WEEKDAY, t.transaction_date) as day_number,
    COUNT(t.transaction_id) as transaction_count,
    SUM(t.amount) as total_spent,
    ROUND(AVG(t.amount), 2) as average_transaction,
    -- Business week ordering: Monday=1, Sunday=7
    (DATEPART(WEEKDAY, t.transaction_date) + @@DATEFIRST + 5) % 7 + 1 as business_week_day
FROM Transactions t
WHERE t.user_id = 1  -- Replace with actual user_id
    AND t.transaction_type = 'Expense'
    AND t.transaction_date >= DATEADD(DAY, -90, GETDATE())
GROUP BY DATENAME(WEEKDAY, t.transaction_date), DATEPART(WEEKDAY, t.transaction_date)
ORDER BY business_week_day;
GO

-- ============================================
-- Query: Recurring Transactions Due This Month
-- ============================================
SELECT * FROM Recurring_Due_This_Month
WHERE next_due_date <= EOMONTH(GETDATE())
    AND recurring_id IN (
        SELECT recurring_id FROM Recurring_Transactions WHERE user_id = 1
    )
ORDER BY next_due_date;
GO

-- ============================================
-- Query: Category-wise Spending Comparison (This Month vs Last Month)
-- ============================================
SELECT 
    c.category_name,
    ISNULL(this_month.total, 0) as current_month_spending,
    ISNULL(last_month.total, 0) as last_month_spending,
    ISNULL(this_month.total, 0) - ISNULL(last_month.total, 0) as difference,
    CASE 
        WHEN ISNULL(last_month.total, 0) = 0 THEN 
            CASE WHEN ISNULL(this_month.total, 0) > 0 THEN 100 ELSE 0 END
        ELSE ROUND(((ISNULL(this_month.total, 0) - ISNULL(last_month.total, 0)) / last_month.total) * 100, 2)
    END as percentage_change
FROM Categories c
LEFT JOIN (
    SELECT category_id, SUM(amount) as total
    FROM Transactions
    WHERE user_id = 1 AND transaction_type = 'Expense'
        AND MONTH(transaction_date) = MONTH(GETDATE())
        AND YEAR(transaction_date) = YEAR(GETDATE())
    GROUP BY category_id
) this_month ON c.category_id = this_month.category_id
LEFT JOIN (
    SELECT category_id, SUM(amount) as total
    FROM Transactions
    WHERE user_id = 1 AND transaction_type = 'Expense'
        AND MONTH(transaction_date) = MONTH(DATEADD(MONTH, -1, GETDATE()))
        AND YEAR(transaction_date) = YEAR(DATEADD(MONTH, -1, GETDATE()))
    GROUP BY category_id
) last_month ON c.category_id = last_month.category_id
WHERE c.user_id = 1 AND c.category_type = 'Expense'
ORDER BY current_month_spending DESC;
GO

-- ============================================
-- Query: Largest Transactions by Category (Last 30 Days)
-- ============================================
WITH RankedTransactions AS (
    SELECT 
        t.transaction_id,
        t.category_id,
        t.transaction_type,
        t.amount,
        t.transaction_date,
        t.description,
        c.category_name,
        a.account_name,
        ROW_NUMBER() OVER (PARTITION BY t.category_id ORDER BY t.amount DESC) as rn
    FROM Transactions t
    JOIN Categories c ON t.category_id = c.category_id
    JOIN Accounts a ON t.account_id = a.account_id
    WHERE t.user_id = 1  -- Replace with actual user_id
        AND t.transaction_date >= DATEADD(DAY, -30, GETDATE())
)
SELECT 
    category_name,
    transaction_type,
    amount,
    transaction_date,
    description,
    account_name
FROM RankedTransactions
WHERE rn = 1
ORDER BY amount DESC;
GO

-- ============================================
-- Query: Users Over Budget (Admin/Analytics Query)
-- ============================================
SELECT 
    u.username,
    u.email,
    COUNT(bso.user_id) as over_budget_count,
    SUM(bso.actual_spent - bso.budgeted_amount) as total_overspent
FROM Users u
JOIN Budget_Status_Overview bso ON u.user_id = bso.user_id
WHERE bso.status = 'Over Budget'
    AND bso.budget_month = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
GROUP BY u.user_id, u.username, u.email
HAVING COUNT(bso.user_id) > 0
ORDER BY total_overspent DESC;
GO

-- ============================================
-- SECTION 3: PAGINATION SUPPORT
-- ============================================

-- ============================================
-- Paginated Query: Transactions with Pagination using OFFSET/FETCH
-- Example: Page 1 = OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
--          Page 2 = OFFSET 20 ROWS FETCH NEXT 20 ROWS ONLY
-- ============================================
SELECT 
    t.transaction_id,
    t.transaction_date,
    t.transaction_type,
    t.amount,
    c.category_name,
    a.account_name,
    t.description
FROM Transactions t
JOIN Categories c ON t.category_id = c.category_id
JOIN Accounts a ON t.account_id = a.account_id
WHERE t.user_id = 1  -- Replace with actual user_id
ORDER BY t.transaction_date DESC, t.transaction_id DESC
OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY;  -- Page 1, 20 items per page
GO

-- ============================================
-- SECTION 4: SEARCH AND FILTER QUERIES
-- ============================================

-- ============================================
-- Query: Search Transactions by keyword
-- ============================================
SELECT 
    t.transaction_id,
    t.transaction_date,
    t.transaction_type,
    t.amount,
    c.category_name,
    a.account_name,
    t.description
FROM Transactions t
JOIN Categories c ON t.category_id = c.category_id
JOIN Accounts a ON t.account_id = a.account_id
WHERE t.user_id = 1  -- Replace with actual user_id
    AND (
        t.description LIKE '%keyword%'  -- Replace with search term
        OR c.category_name LIKE '%keyword%'
    )
    AND t.transaction_date BETWEEN '2026-01-01' AND '2026-12-31'  -- Replace with date range
ORDER BY t.transaction_date DESC;
GO

-- ============================================
-- Query: Filter Transactions by Multiple Criteria
-- ============================================
SELECT 
    t.transaction_id,
    t.transaction_date,
    t.transaction_type,
    t.amount,
    c.category_name,
    a.account_name,
    t.payment_method,
    t.description
FROM Transactions t
JOIN Categories c ON t.category_id = c.category_id
JOIN Accounts a ON t.account_id = a.account_id
WHERE t.user_id = 1  -- Replace with actual user_id
    AND t.transaction_type IN ('Income', 'Expense')  -- Optional filter
    AND t.category_id IN (1, 2, 3)  -- Optional filter
    AND t.account_id IN (1, 2)  -- Optional filter
    AND t.amount BETWEEN 100 AND 10000  -- Optional filter
    AND t.transaction_date BETWEEN '2026-02-01' AND '2026-02-28'
ORDER BY t.transaction_date DESC;
GO

-- ============================================
-- SECTION 5: PERFORMANCE INDEXES
-- ============================================

-- Date-based query indexes
CREATE INDEX idx_transactions_date_type ON Transactions(transaction_date, transaction_type);
CREATE INDEX idx_transactions_user_date ON Transactions(user_id, transaction_date);

-- Recurring transaction indexes
CREATE INDEX idx_recurring_next_date ON Recurring_Transactions(user_id, is_active, last_generated_date, frequency);

-- Budget performance indexes (already created in schema file)
-- CREATE INDEX idx_budgets_user_month ON Budgets(user_id, budget_month);
GO

-- ============================================
-- SECTION 6: UTILITY QUERIES
-- ============================================

-- Query: Get total row counts for all tables
SELECT 
    t.name AS TableName,
    p.rows AS RowCount
FROM sys.tables t
INNER JOIN sys.partitions p ON t.object_id = p.object_id
WHERE p.index_id IN (0,1)
    AND t.name IN ('Users', 'Categories', 'Accounts', 'Transactions', 'Budgets', 
                   'Recurring_Transactions', 'Account_Transfers', 'Budget_Alerts',
                   'User_Monthly_Summary', 'Category_Spending_Summary', 'Tags', 'Transaction_Tags')
ORDER BY t.name;
GO

-- Query: Check all views created
SELECT 
    TABLE_NAME as ViewName,
    TABLE_SCHEMA as SchemaName
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_NAME LIKE '%Financial%' 
    OR TABLE_NAME LIKE '%Budget%'
    OR TABLE_NAME LIKE '%Transaction%'
    OR TABLE_NAME LIKE '%Recurring%'
ORDER BY TABLE_NAME;
GO

/*
============================================
ERROR HANDLING NOTES
============================================

1. ISNULL vs COALESCE:
   - SQL Server: Use ISNULL(column, 0) or COALESCE(column, 0)
   - Both work, but ISNULL is slightly faster for simple cases

2. Date Functions:
   - GETDATE() returns current datetime
   - CAST(GETDATE() AS DATE) returns current date only
   - EOMONTH(date) returns last day of month
   - DATEFROMPARTS(year, month, day) constructs a date

3. LIMIT vs OFFSET/FETCH:
   - MySQL uses LIMIT 20 OFFSET 0
   - SQL Server uses OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY

4. String Functions:
   - MySQL: CONCAT(str1, str2)
   - SQL Server: str1 + str2 or CONCAT(str1, str2)

5. Division by Zero:
   - Always use NULLIF() to avoid errors
   - Example: value / NULLIF(divisor, 0)

6. Window Functions:
   - LAG() and LEAD() work the same in both
   - PARTITION BY and ORDER BY syntax identical

7. Date Formatting:
   - MySQL: DATE_FORMAT(date, '%Y-%m')
   - SQL Server: FORMAT(date, 'yyyy-MM')

8. Boolean Values:
   - MySQL: TRUE/FALSE or 1/0
   - SQL Server: 1/0 only (BIT type)

9. Aggregations:
   - Always handle NULL with ISNULL() or COALESCE()
   - COUNT(*) vs COUNT(column) - same as MySQL

10. GO Statement:
    - Separates batches in SQL Server
    - Not part of T-SQL, it's a batch separator
    - Required after CREATE VIEW, CREATE TRIGGER, etc.
*/
