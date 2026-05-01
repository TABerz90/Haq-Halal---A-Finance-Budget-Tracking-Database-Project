-- Finance Tracker — Triggers, Views & Stored Procedures
-- Run this after finance_tracker_schema_v2.sql
-- SQL Server / T-SQL

-- ============================================================
-- SCHEMA MIGRATION: add carryover_amount to Budgets (idempotent)
-- ============================================================

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Budgets' AND COLUMN_NAME = 'carryover_amount'
)
    ALTER TABLE Budgets ADD carryover_amount DECIMAL(12,2) NOT NULL DEFAULT 0;
GO

-- ============================================================
-- DROP EXISTING OBJECTS (safe re-run)
-- ============================================================

IF OBJECT_ID('trg_budget_alert_on_transaction',          'TR') IS NOT NULL DROP TRIGGER trg_budget_alert_on_transaction;
IF OBJECT_ID('trg_budget_alert_on_transaction_update',   'TR') IS NOT NULL DROP TRIGGER trg_budget_alert_on_transaction_update;
IF OBJECT_ID('trg_adjust_balance_on_transaction_update', 'TR') IS NOT NULL DROP TRIGGER trg_adjust_balance_on_transaction_update;
IF OBJECT_ID('trg_reverse_balance_on_transaction_delete','TR') IS NOT NULL DROP TRIGGER trg_reverse_balance_on_transaction_delete;
IF OBJECT_ID('trg_reverse_balance_on_transfer_delete',   'TR') IS NOT NULL DROP TRIGGER trg_reverse_balance_on_transfer_delete;
GO

IF OBJECT_ID('Unread_Budget_Alerts',   'V') IS NOT NULL DROP VIEW Unread_Budget_Alerts;
IF OBJECT_ID('Budget_Status_Overview', 'V') IS NOT NULL DROP VIEW Budget_Status_Overview;
IF OBJECT_ID('vw_budgetStatus',        'V') IS NOT NULL DROP VIEW vw_budgetStatus;
IF OBJECT_ID('vw_transactionDetail',   'V') IS NOT NULL DROP VIEW vw_transactionDetail;
IF OBJECT_ID('vw_recurringDetail',     'V') IS NOT NULL DROP VIEW vw_recurringDetail;
IF OBJECT_ID('vw_transferDetail',      'V') IS NOT NULL DROP VIEW vw_transferDetail;
IF OBJECT_ID('vw_alertDetail',         'V') IS NOT NULL DROP VIEW vw_alertDetail;
GO

IF OBJECT_ID('sp_getTransactions',   'P') IS NOT NULL DROP PROCEDURE sp_getTransactions;
IF OBJECT_ID('sp_createTransfer',    'P') IS NOT NULL DROP PROCEDURE sp_createTransfer;
IF OBJECT_ID('sp_generateRecurring', 'P') IS NOT NULL DROP PROCEDURE sp_generateRecurring;
IF OBJECT_ID('sp_syncBudgetAlerts',  'P') IS NOT NULL DROP PROCEDURE sp_syncBudgetAlerts;
IF OBJECT_ID('sp_rolloverBudgets',   'P') IS NOT NULL DROP PROCEDURE sp_rolloverBudgets;
GO


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Reverse account balance when a transaction is updated
-- (undoes old amount/type, applies new amount/type)
CREATE TRIGGER trg_adjust_balance_on_transaction_update
ON Transactions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Undo old transaction on old account
    UPDATE a
    SET current_balance = CASE
        WHEN d.transaction_type = 'Income'  THEN a.current_balance - d.amount
        WHEN d.transaction_type = 'Expense' THEN a.current_balance + d.amount
        ELSE a.current_balance
    END
    FROM Accounts a
    INNER JOIN deleted d ON a.account_id = d.account_id;

    -- Apply new transaction on new account
    UPDATE a
    SET current_balance = CASE
        WHEN i.transaction_type = 'Income'  THEN a.current_balance + i.amount
        WHEN i.transaction_type = 'Expense' THEN a.current_balance - i.amount
        ELSE a.current_balance
    END
    FROM Accounts a
    INNER JOIN inserted i ON a.account_id = i.account_id;
END;
GO

-- Reverse account balance when a transaction is deleted
CREATE TRIGGER trg_reverse_balance_on_transaction_delete
ON Transactions
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE a
    SET current_balance = CASE
        WHEN d.transaction_type = 'Income'  THEN a.current_balance - d.amount
        WHEN d.transaction_type = 'Expense' THEN a.current_balance + d.amount
        ELSE a.current_balance
    END
    FROM Accounts a
    INNER JOIN deleted d ON a.account_id = d.account_id;
END;
GO

-- Reverse account balances when a transfer record is deleted
CREATE TRIGGER trg_reverse_balance_on_transfer_delete
ON Account_Transfers
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Restore to source account
    UPDATE a
    SET current_balance = a.current_balance + d.amount
    FROM Accounts a
    INNER JOIN deleted d ON a.account_id = d.from_account_id;

    -- Deduct from destination account
    UPDATE a
    SET current_balance = a.current_balance - d.amount
    FROM Accounts a
    INNER JOIN deleted d ON a.account_id = d.to_account_id;
END;
GO

-- Auto-create budget alerts when an expense transaction is inserted.
-- Uses carryover_amount so the running total reflects any overspend carried
-- forward from the previous month.
CREATE TRIGGER trg_budget_alert_on_transaction
ON Transactions
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM inserted WHERE transaction_type = 'Expense') RETURN;

    INSERT INTO Budget_Alerts (budget_id, user_id, alert_type, alert_message, percentage_used, is_read)
    SELECT DISTINCT
        b.budget_id,
        b.user_id,
        CASE WHEN pct.val >= 100 THEN 'Exceeded' ELSE 'Near Limit' END,
        CASE
            WHEN pct.val >= 100
                THEN 'You have exceeded your ' + c.category_name + ' budget for ' + FORMAT(b.budget_month, 'MMMM yyyy')
            ELSE
                'You are near your ' + c.category_name + ' budget limit for ' + FORMAT(b.budget_month, 'MMMM yyyy')
        END,
        ROUND(pct.val, 2),
        0
    FROM inserted i
    JOIN Budgets b
        ON  b.category_id = i.category_id
        AND b.user_id     = i.user_id
        AND DATEFROMPARTS(YEAR(i.transaction_date), MONTH(i.transaction_date), 1) = b.budget_month
    JOIN Categories c ON c.category_id = b.category_id
    CROSS APPLY (
        SELECT (ISNULL(SUM(t.amount), 0) + b.carryover_amount) / b.budget_amount * 100 AS val
        FROM Transactions t
        WHERE t.category_id      = b.category_id
          AND t.user_id          = b.user_id
          AND t.transaction_type = 'Expense'
          AND DATEFROMPARTS(YEAR(t.transaction_date), MONTH(t.transaction_date), 1) = b.budget_month
    ) pct
    WHERE i.transaction_type = 'Expense'
      AND pct.val >= b.alert_threshold
      AND NOT EXISTS (
          SELECT 1 FROM Budget_Alerts ba
          WHERE ba.budget_id  = b.budget_id
            AND ba.is_read    = 0
            AND ba.alert_type = CASE WHEN pct.val >= 100 THEN 'Exceeded' ELSE 'Near Limit' END
      );
END;
GO

-- Fire budget alerts when an expense transaction's amount is edited upward.
-- Carryover-aware percentage calculation.
CREATE TRIGGER trg_budget_alert_on_transaction_update
ON Transactions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM inserted i
        JOIN deleted d ON i.transaction_id = d.transaction_id
        WHERE i.transaction_type = 'Expense' AND i.amount <> d.amount
    ) RETURN;

    INSERT INTO Budget_Alerts (budget_id, user_id, alert_type, alert_message, percentage_used, is_read)
    SELECT DISTINCT
        b.budget_id,
        b.user_id,
        CASE WHEN pct.val >= 100 THEN 'Exceeded' ELSE 'Near Limit' END,
        CASE
            WHEN pct.val >= 100
                THEN 'You have exceeded your ' + c.category_name + ' budget for ' + FORMAT(b.budget_month, 'MMMM yyyy')
            ELSE
                'You are near your ' + c.category_name + ' budget limit for ' + FORMAT(b.budget_month, 'MMMM yyyy')
        END,
        ROUND(pct.val, 2),
        0
    FROM inserted i
    JOIN deleted d ON i.transaction_id = d.transaction_id
    JOIN Budgets b
        ON  b.category_id = i.category_id
        AND b.user_id     = i.user_id
        AND DATEFROMPARTS(YEAR(i.transaction_date), MONTH(i.transaction_date), 1) = b.budget_month
    JOIN Categories c ON c.category_id = b.category_id
    CROSS APPLY (
        SELECT (ISNULL(SUM(t.amount), 0) + b.carryover_amount) / b.budget_amount * 100 AS val
        FROM Transactions t
        WHERE t.category_id      = b.category_id
          AND t.user_id          = b.user_id
          AND t.transaction_type = 'Expense'
          AND DATEFROMPARTS(YEAR(t.transaction_date), MONTH(t.transaction_date), 1) = b.budget_month
    ) pct
    WHERE i.transaction_type = 'Expense'
      AND i.amount <> d.amount
      AND pct.val >= b.alert_threshold
      AND NOT EXISTS (
          SELECT 1 FROM Budget_Alerts ba
          WHERE ba.budget_id  = b.budget_id
            AND ba.is_read    = 0
            AND ba.alert_type = CASE WHEN pct.val >= 100 THEN 'Exceeded' ELSE 'Near Limit' END
      );
END;
GO


-- ============================================================
-- VIEWS
-- ============================================================

-- Budget list with real-time spending, carryover, and percentage used.
-- actual_spent = this month's expenses + any overspend carried from last month.
CREATE VIEW vw_budgetStatus AS
SELECT
    b.budget_id, b.user_id, b.category_id,
    b.budget_amount, b.budget_month, b.alert_threshold, b.carryover_amount, b.created_at,
    c.category_name,
    ISNULL(SUM(t.amount), 0)                                                           AS monthly_spent,
    ISNULL(SUM(t.amount), 0) + b.carryover_amount                                      AS actual_spent,
    b.budget_amount - (ISNULL(SUM(t.amount), 0) + b.carryover_amount)                  AS remaining,
    ROUND((ISNULL(SUM(t.amount), 0) + b.carryover_amount) / b.budget_amount * 100, 2)  AS percentage_used
FROM Budgets b
JOIN Categories c ON b.category_id = c.category_id
LEFT JOIN Transactions t
    ON  t.category_id      = b.category_id
    AND t.user_id          = b.user_id
    AND t.transaction_type = 'Expense'
    AND DATEFROMPARTS(YEAR(t.transaction_date), MONTH(t.transaction_date), 1) = b.budget_month
GROUP BY
    b.budget_id, b.user_id, b.category_id, c.category_name,
    b.budget_amount, b.budget_month, b.alert_threshold, b.carryover_amount, b.created_at;
GO

-- Extended budget status used by the dashboard /budget-status endpoint.
-- Includes health_indicator, days_remaining, and status label.
CREATE VIEW Budget_Status_Overview AS
SELECT
    b.user_id, u.username, b.budget_id, c.category_name, b.category_id,
    b.budget_month, b.budget_amount AS budgeted_amount,
    b.carryover_amount,
    ISNULL(SUM(t.amount), 0)                                                           AS monthly_spent,
    ISNULL(SUM(t.amount), 0) + b.carryover_amount                                      AS actual_spent,
    b.budget_amount - (ISNULL(SUM(t.amount), 0) + b.carryover_amount)                  AS remaining_amount,
    ROUND(((ISNULL(SUM(t.amount), 0) + b.carryover_amount) / b.budget_amount * 100), 2) AS percentage_used,
    b.alert_threshold,
    CASE
        WHEN (ISNULL(SUM(t.amount), 0) + b.carryover_amount) >= b.budget_amount THEN 'Over Budget'
        WHEN ((ISNULL(SUM(t.amount), 0) + b.carryover_amount) / b.budget_amount * 100) >= b.alert_threshold THEN 'Near Limit'
        ELSE 'Under Budget'
    END AS status,
    DATEDIFF(DAY, GETDATE(), EOMONTH(b.budget_month)) AS days_remaining,
    CASE
        WHEN (ISNULL(SUM(t.amount), 0) + b.carryover_amount) >= b.budget_amount THEN 'Danger'
        WHEN ((ISNULL(SUM(t.amount), 0) + b.carryover_amount) / b.budget_amount * 100) >= b.alert_threshold THEN 'Warning'
        ELSE 'Good'
    END AS health_indicator
FROM Budgets b
JOIN Users      u ON b.user_id      = u.user_id
JOIN Categories c ON b.category_id  = c.category_id
LEFT JOIN Transactions t
    ON  b.category_id       = t.category_id
    AND b.user_id           = t.user_id
    AND t.transaction_type  = 'Expense'
    AND DATEFROMPARTS(YEAR(t.transaction_date), MONTH(t.transaction_date), 1) = b.budget_month
GROUP BY
    b.budget_id, b.user_id, u.username, c.category_name, b.category_id,
    b.budget_month, b.budget_amount, b.alert_threshold, b.carryover_amount;
GO

-- Unread budget alerts joined with category and budget details.
CREATE VIEW Unread_Budget_Alerts AS
SELECT
    ba.alert_id, ba.user_id, u.username,
    ba.alert_type, ba.alert_message,
    c.category_name, b.budget_amount, ba.percentage_used,
    ba.created_at,
    DATEDIFF(DAY, ba.created_at, GETDATE()) AS days_old
FROM Budget_Alerts ba
JOIN Users      u ON ba.user_id      = u.user_id
JOIN Budgets    b ON ba.budget_id    = b.budget_id
JOIN Categories c ON b.category_id  = c.category_id
WHERE ba.is_read = 0;
GO

-- Transaction rows joined with category and account names
CREATE VIEW vw_transactionDetail AS
SELECT
    t.transaction_id, t.user_id, t.account_id, t.category_id,
    t.transaction_type, t.amount, t.transaction_date,
    t.description, t.payment_method, t.created_at,
    c.category_name,
    a.account_name
FROM Transactions t
LEFT JOIN Categories c ON t.category_id = c.category_id
JOIN      Accounts   a ON t.account_id  = a.account_id;
GO

-- Recurring templates joined with category/account + computed next_due_date
CREATE VIEW vw_recurringDetail AS
SELECT
    rt.recurring_id, rt.user_id, rt.account_id, rt.category_id,
    rt.transaction_type, rt.amount, rt.frequency,
    rt.start_date, rt.end_date, rt.description,
    rt.payment_method, rt.is_active, rt.last_generated_date, rt.created_at,
    c.category_name,
    a.account_name,
    CASE rt.frequency
        WHEN 'Daily'   THEN DATEADD(DAY,   1, ISNULL(rt.last_generated_date, rt.start_date))
        WHEN 'Weekly'  THEN DATEADD(WEEK,  1, ISNULL(rt.last_generated_date, rt.start_date))
        WHEN 'Monthly' THEN DATEADD(MONTH, 1, ISNULL(rt.last_generated_date, rt.start_date))
        WHEN 'Yearly'  THEN DATEADD(YEAR,  1, ISNULL(rt.last_generated_date, rt.start_date))
    END AS next_due_date
FROM Recurring_Transactions rt
JOIN Categories c ON rt.category_id = c.category_id
JOIN Accounts   a ON rt.account_id  = a.account_id;
GO

-- Transfer rows joined with from/to account names
CREATE VIEW vw_transferDetail AS
SELECT
    tr.transfer_id, tr.user_id,
    tr.from_account_id, tr.to_account_id,
    tr.amount, tr.transfer_date, tr.description, tr.created_at,
    fa.account_name AS from_account, fa.account_type AS from_account_type,
    ta.account_name AS to_account,   ta.account_type AS to_account_type
FROM Account_Transfers tr
JOIN Accounts fa ON tr.from_account_id = fa.account_id
JOIN Accounts ta ON tr.to_account_id   = ta.account_id;
GO

-- Alert rows joined with budget and category info, plus days_old
CREATE VIEW vw_alertDetail AS
SELECT
    ba.alert_id, ba.budget_id, ba.user_id,
    ba.alert_type, ba.alert_message, ba.percentage_used,
    ba.is_read, ba.created_at,
    DATEDIFF(DAY, ba.created_at, GETDATE()) AS days_old,
    c.category_name,
    b.budget_amount,
    b.budget_month
FROM Budget_Alerts ba
JOIN Budgets    b ON ba.budget_id   = b.budget_id
JOIN Categories c ON b.category_id = c.category_id;
GO


-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- Paginated + filtered transaction list (two result sets: rows, total count)
CREATE PROCEDURE sp_getTransactions
    @user_id     INT,
    @page        INT            = 1,
    @limit       INT            = 20,
    @type        VARCHAR(10)    = NULL,
    @category_id INT            = NULL,
    @account_id  INT            = NULL,
    @search      VARCHAR(255)   = NULL,
    @date_from   DATE           = NULL,
    @date_to     DATE           = NULL,
    @amount_min  DECIMAL(12, 2) = NULL,
    @amount_max  DECIMAL(12, 2) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @offset INT = (@page - 1) * @limit;

    SELECT
        t.transaction_id, t.user_id, t.account_id, t.category_id,
        t.transaction_type, t.amount, t.transaction_date,
        t.description, t.payment_method, t.created_at,
        c.category_name, a.account_name
    FROM Transactions t
    LEFT JOIN Categories c ON t.category_id = c.category_id
    JOIN      Accounts   a ON t.account_id  = a.account_id
    WHERE t.user_id = @user_id
      AND (@type        IS NULL OR t.transaction_type  = @type)
      AND (@category_id IS NULL OR t.category_id       = @category_id)
      AND (@account_id  IS NULL OR t.account_id        = @account_id)
      AND (@search      IS NULL OR t.description       LIKE '%' + @search + '%'
                                OR c.category_name     LIKE '%' + @search + '%')
      AND (@date_from   IS NULL OR t.transaction_date >= @date_from)
      AND (@date_to     IS NULL OR t.transaction_date <= @date_to)
      AND (@amount_min  IS NULL OR t.amount            >= @amount_min)
      AND (@amount_max  IS NULL OR t.amount            <= @amount_max)
    ORDER BY t.transaction_date DESC, t.transaction_id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

    SELECT COUNT(*) AS total
    FROM Transactions t
    LEFT JOIN Categories c ON t.category_id = c.category_id
    WHERE t.user_id = @user_id
      AND (@type        IS NULL OR t.transaction_type  = @type)
      AND (@category_id IS NULL OR t.category_id       = @category_id)
      AND (@account_id  IS NULL OR t.account_id        = @account_id)
      AND (@search      IS NULL OR t.description       LIKE '%' + @search + '%'
                                OR c.category_name     LIKE '%' + @search + '%')
      AND (@date_from   IS NULL OR t.transaction_date >= @date_from)
      AND (@date_to     IS NULL OR t.transaction_date <= @date_to)
      AND (@amount_min  IS NULL OR t.amount            >= @amount_min)
      AND (@amount_max  IS NULL OR t.amount            <= @amount_max);
END;
GO

-- Validate and execute an account-to-account transfer.
-- Raises descriptive errors that the API layer maps to HTTP status codes.
CREATE PROCEDURE sp_createTransfer
    @user_id         INT,
    @from_account_id INT,
    @to_account_id   INT,
    @amount          DECIMAL(12, 2),
    @transfer_date   DATE,
    @description     VARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @from_account_id = @to_account_id
    BEGIN
        RAISERROR('Source and destination accounts must be different.', 16, 1);
        RETURN;
    END

    DECLARE @balance DECIMAL(12, 2);
    SELECT @balance = current_balance
    FROM   Accounts
    WHERE  account_id = @from_account_id AND user_id = @user_id AND is_active = 1;

    IF @balance IS NULL
    BEGIN
        RAISERROR('Source account not found or inactive.', 16, 1);
        RETURN;
    END

    IF @balance < @amount
    BEGIN
        RAISERROR('Insufficient balance in source account.', 16, 1);
        RETURN;
    END

    INSERT INTO Account_Transfers (user_id, from_account_id, to_account_id, amount, transfer_date, description)
    VALUES (@user_id, @from_account_id, @to_account_id, @amount, @transfer_date, @description);

    SELECT SCOPE_IDENTITY() AS transfer_id;
END;
GO

-- Generate a real transaction from an active recurring template.
-- Updates last_generated_date; the INSERT trigger handles balance + budget alerts.
CREATE PROCEDURE sp_generateRecurring
    @recurring_id INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @today            DATE         = CAST(GETDATE() AS DATE);
    DECLARE @user_id          INT;
    DECLARE @account_id       INT;
    DECLARE @category_id      INT;
    DECLARE @transaction_type VARCHAR(10);
    DECLARE @amount           DECIMAL(12, 2);
    DECLARE @description      VARCHAR(255);
    DECLARE @payment_method   VARCHAR(50);

    SELECT
        @user_id          = user_id,
        @account_id       = account_id,
        @category_id      = category_id,
        @transaction_type = transaction_type,
        @amount           = amount,
        @description      = ISNULL(description, 'Recurring transaction'),
        @payment_method   = payment_method
    FROM Recurring_Transactions
    WHERE recurring_id = @recurring_id AND is_active = 1;

    IF @user_id IS NULL
    BEGIN
        RAISERROR('Active recurring transaction not found.', 16, 1);
        RETURN;
    END

    INSERT INTO Transactions
        (user_id, account_id, category_id, transaction_type, amount, transaction_date, description, payment_method)
    VALUES
        (@user_id, @account_id, @category_id, @transaction_type, @amount, @today, @description, @payment_method);

    DECLARE @transaction_id INT = SCOPE_IDENTITY();

    UPDATE Recurring_Transactions
    SET    last_generated_date = @today
    WHERE  recurring_id = @recurring_id;

    SELECT @transaction_id AS transaction_id;
END;
GO

-- Scan all current budgets for a user and create any missing alerts.
-- Carryover-aware: percentage includes any overspend carried from last month.
-- Called on Dashboard load and Alerts page load to keep alerts current.
-- Returns the number of alerts inserted.
CREATE PROCEDURE sp_syncBudgetAlerts
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Budget_Alerts (budget_id, user_id, alert_type, alert_message, percentage_used, is_read)
    SELECT
        b.budget_id,
        b.user_id,
        CASE WHEN pct.val >= 100 THEN 'Exceeded' ELSE 'Near Limit' END,
        CASE
            WHEN pct.val >= 100
                THEN 'You have exceeded your ' + c.category_name + ' budget for ' + FORMAT(b.budget_month, 'MMMM yyyy')
            ELSE
                'You are near your ' + c.category_name + ' budget limit for ' + FORMAT(b.budget_month, 'MMMM yyyy')
        END,
        ROUND(pct.val, 2),
        0
    FROM Budgets b
    JOIN Categories c ON c.category_id = b.category_id
    CROSS APPLY (
        SELECT (ISNULL(SUM(t.amount), 0) + b.carryover_amount) / b.budget_amount * 100 AS val
        FROM Transactions t
        WHERE t.category_id      = b.category_id
          AND t.user_id          = b.user_id
          AND t.transaction_type = 'Expense'
          AND DATEFROMPARTS(YEAR(t.transaction_date), MONTH(t.transaction_date), 1) = b.budget_month
    ) pct
    WHERE b.user_id  = @user_id
      AND pct.val   >= b.alert_threshold
      AND NOT EXISTS (
          SELECT 1 FROM Budget_Alerts ba
          WHERE ba.budget_id  = b.budget_id
            AND ba.is_read    = 0
            AND ba.alert_type = CASE WHEN pct.val >= 100 THEN 'Exceeded' ELSE 'Near Limit' END
      );

    SELECT @@ROWCOUNT AS alerts_created;
END;
GO

-- Copy last month's budgets into the current month (idempotent).
-- Any overspend from last month is carried forward as carryover_amount,
-- so the new month opens pre-loaded with that deficit.
-- Example: 5 000 budget, 7 000 spent → next month starts at 2 000 / 5 000.
CREATE PROCEDURE sp_rolloverBudgets
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @this_month DATE = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
    DECLARE @last_month DATE = DATEFROMPARTS(
        YEAR(DATEADD(MONTH, -1, GETDATE())),
        MONTH(DATEADD(MONTH, -1, GETDATE())),
        1
    );

    INSERT INTO Budgets (user_id, category_id, budget_amount, budget_month, alert_threshold, carryover_amount)
    SELECT
        b.user_id,
        b.category_id,
        b.budget_amount,
        @this_month,
        b.alert_threshold,
        CASE
            WHEN (ISNULL(spent.total, 0) + b.carryover_amount) > b.budget_amount
                THEN (ISNULL(spent.total, 0) + b.carryover_amount) - b.budget_amount
            ELSE 0
        END
    FROM Budgets b
    LEFT JOIN (
        SELECT category_id, SUM(amount) AS total
        FROM Transactions
        WHERE user_id          = @user_id
          AND transaction_type = 'Expense'
          AND DATEFROMPARTS(YEAR(transaction_date), MONTH(transaction_date), 1) = @last_month
        GROUP BY category_id
    ) spent ON spent.category_id = b.category_id
    WHERE b.user_id      = @user_id
      AND b.budget_month = @last_month
      AND NOT EXISTS (
          SELECT 1 FROM Budgets b2
          WHERE b2.user_id      = b.user_id
            AND b2.category_id  = b.category_id
            AND b2.budget_month = @this_month
      );

    SELECT @@ROWCOUNT AS budgets_created;
END;
GO
