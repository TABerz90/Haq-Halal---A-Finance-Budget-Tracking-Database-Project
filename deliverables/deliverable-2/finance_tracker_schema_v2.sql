-- Personal Finance Tracker and Budget Management System
-- Database Schema - Deliverable 2 (SQL Server / T-SQL Version)
-- FAST-NU, Lahore, Pakistan
-- Spring 2026

-- Drop existing tables if they exist (in reverse order of dependencies)
IF OBJECT_ID('Transaction_Tags', 'U') IS NOT NULL DROP TABLE Transaction_Tags;
IF OBJECT_ID('Tags', 'U') IS NOT NULL DROP TABLE Tags;
IF OBJECT_ID('Budget_Alerts', 'U') IS NOT NULL DROP TABLE Budget_Alerts;
IF OBJECT_ID('Category_Spending_Summary', 'U') IS NOT NULL DROP TABLE Category_Spending_Summary;
IF OBJECT_ID('User_Monthly_Summary', 'U') IS NOT NULL DROP TABLE User_Monthly_Summary;
IF OBJECT_ID('Account_Transfers', 'U') IS NOT NULL DROP TABLE Account_Transfers;
IF OBJECT_ID('Recurring_Transactions', 'U') IS NOT NULL DROP TABLE Recurring_Transactions;
IF OBJECT_ID('Transactions', 'U') IS NOT NULL DROP TABLE Transactions;
IF OBJECT_ID('Budgets', 'U') IS NOT NULL DROP TABLE Budgets;
IF OBJECT_ID('Accounts', 'U') IS NOT NULL DROP TABLE Accounts;
IF OBJECT_ID('Categories', 'U') IS NOT NULL DROP TABLE Categories;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
GO

-- ============================================
-- Table: Users
-- Purpose: Store user account information and authentication details
-- ============================================
CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    default_currency VARCHAR(3) DEFAULT 'PKR',
    created_at DATETIME2 DEFAULT GETDATE(),
    last_login DATETIME2 NULL
);
GO

-- ============================================
-- Table: Categories
-- Purpose: Store transaction categories
-- ============================================
CREATE TABLE Categories (
    category_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    category_name VARCHAR(50) NOT NULL,
    category_type VARCHAR(10) NOT NULL CHECK (category_type IN ('Income', 'Expense')),
    description VARCHAR(255),
    CONSTRAINT FK_Categories_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT UQ_User_Category UNIQUE (user_id, category_name)
);
GO

-- ============================================
-- Table: Accounts
-- Purpose: Store user's financial accounts
-- ============================================
CREATE TABLE Accounts (
    account_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('Cash', 'Bank', 'Digital Wallet', 'Credit Card')),
    current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency_code VARCHAR(3) DEFAULT 'PKR',
    created_at DATETIME2 DEFAULT GETDATE(),
    is_active BIT DEFAULT 1,
    CONSTRAINT FK_Accounts_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT UQ_User_Account UNIQUE (user_id, account_name)
);
GO

-- ============================================
-- Table: Transactions
-- Purpose: Store all income and expense records (NOT transfers)
-- ============================================
CREATE TABLE Transactions (
    transaction_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    category_id INT NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('Income', 'Expense')),
    amount DECIMAL(12, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    description VARCHAR(255),
    payment_method VARCHAR(50),
    transfer_id INT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Transactions_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_Transactions_Accounts FOREIGN KEY (account_id) REFERENCES Accounts(account_id),
    CONSTRAINT FK_Transactions_Categories FOREIGN KEY (category_id) REFERENCES Categories(category_id),
    CONSTRAINT CHK_Amount_Min CHECK (amount >= 0.01),
    CONSTRAINT CHK_Amount_Max CHECK (amount <= 9999999999.99)
);
GO

CREATE INDEX idx_user_date ON Transactions(user_id, transaction_date);
CREATE INDEX idx_category_date ON Transactions(category_id, transaction_date);
CREATE INDEX idx_transactions_account ON Transactions(account_id);
CREATE INDEX idx_transactions_type_date ON Transactions(user_id, transaction_type, transaction_date);
GO

-- ============================================
-- Table: Budgets
-- Purpose: Store budget limits for categories
-- ============================================
CREATE TABLE Budgets (
    budget_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    budget_amount DECIMAL(12, 2) NOT NULL,
    budget_month DATE NOT NULL,
    alert_threshold DECIMAL(5, 2) DEFAULT 90.00,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Budgets_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_Budgets_Categories FOREIGN KEY (category_id) REFERENCES Categories(category_id),
    CONSTRAINT UQ_User_Category_Month UNIQUE (user_id, category_id, budget_month),
    CONSTRAINT CHK_Budget_Amount CHECK (budget_amount > 0),
    CONSTRAINT CHK_Alert_Threshold CHECK (alert_threshold >= 0 AND alert_threshold <= 100)
);
GO

CREATE INDEX idx_budgets_user_month ON Budgets(user_id, budget_month);
GO

-- ============================================
-- Table: Recurring_Transactions
-- Purpose: Store templates for recurring transactions
-- ============================================
CREATE TABLE Recurring_Transactions (
    recurring_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    category_id INT NOT NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('Income', 'Expense')),
    amount DECIMAL(12, 2) NOT NULL,
    frequency VARCHAR(10) NOT NULL CHECK (frequency IN ('Daily', 'Weekly', 'Monthly', 'Yearly')),
    start_date DATE NOT NULL,
    end_date DATE NULL,
    description VARCHAR(255),
    payment_method VARCHAR(50),
    is_active BIT DEFAULT 1,
    last_generated_date DATE NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Recurring_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_Recurring_Accounts FOREIGN KEY (account_id) REFERENCES Accounts(account_id),
    CONSTRAINT FK_Recurring_Categories FOREIGN KEY (category_id) REFERENCES Categories(category_id),
    CONSTRAINT CHK_Recurring_Amount CHECK (amount > 0),
    CONSTRAINT CHK_Recurring_Dates CHECK (end_date IS NULL OR end_date >= start_date)
);
GO

CREATE INDEX idx_recurring_account ON Recurring_Transactions(account_id);
CREATE INDEX idx_recurring_category ON Recurring_Transactions(category_id);
GO

-- ============================================
-- Table: Account_Transfers
-- Purpose: Track money transfers between accounts
-- ============================================
CREATE TABLE Account_Transfers (
    transfer_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    from_account_id INT NOT NULL,
    to_account_id INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    transfer_date DATE NOT NULL,
    description VARCHAR(255),
    from_transaction_id INT NULL,
    to_transaction_id INT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Transfers_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_Transfers_From_Account FOREIGN KEY (from_account_id) REFERENCES Accounts(account_id),
    CONSTRAINT FK_Transfers_To_Account FOREIGN KEY (to_account_id) REFERENCES Accounts(account_id),
    CONSTRAINT FK_Transfers_From_Transaction FOREIGN KEY (from_transaction_id) REFERENCES Transactions(transaction_id),
    CONSTRAINT FK_Transfers_To_Transaction FOREIGN KEY (to_transaction_id) REFERENCES Transactions(transaction_id),
    CONSTRAINT CHK_Transfer_Amount CHECK (amount > 0),
    CONSTRAINT CHK_Transfer_Accounts CHECK (from_account_id != to_account_id)
);
GO

-- ============================================
-- Table: Budget_Alerts
-- Purpose: Store budget alert notifications
-- ============================================
CREATE TABLE Budget_Alerts (
    alert_id INT PRIMARY KEY IDENTITY(1,1),
    budget_id INT NOT NULL,
    user_id INT NOT NULL,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('Warning', 'Exceeded', 'Near Limit')),
    alert_message VARCHAR(255) NOT NULL,
    percentage_used DECIMAL(5, 2) NOT NULL,
    is_read BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Alerts_Budgets FOREIGN KEY (budget_id) REFERENCES Budgets(budget_id) ON DELETE CASCADE,
    CONSTRAINT FK_Alerts_Users FOREIGN KEY (user_id) REFERENCES Users(user_id),
    CONSTRAINT CHK_Percentage_Used CHECK (percentage_used >= 0 AND percentage_used <= 200)
);
GO

CREATE INDEX idx_alerts_budget ON Budget_Alerts(budget_id);
CREATE INDEX idx_alerts_user_read ON Budget_Alerts(user_id, is_read);
GO

-- ============================================
-- Table: User_Monthly_Summary
-- Purpose: Pre-computed monthly income/expense totals per user
-- ============================================
CREATE TABLE User_Monthly_Summary (
    summary_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    summary_month DATE NOT NULL,
    total_income DECIMAL(12, 2) DEFAULT 0.00,
    total_expenses DECIMAL(12, 2) DEFAULT 0.00,
    net_savings DECIMAL(12, 2) DEFAULT 0.00,
    transaction_count INT DEFAULT 0,
    largest_expense DECIMAL(12, 2) DEFAULT 0.00,
    largest_income DECIMAL(12, 2) DEFAULT 0.00,
    last_updated DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Summary_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT UQ_User_Month UNIQUE (user_id, summary_month)
);
GO

CREATE INDEX idx_user_month ON User_Monthly_Summary(user_id, summary_month);
GO

-- ============================================
-- Table: Category_Spending_Summary
-- Purpose: Track spending by category per month
-- ============================================
CREATE TABLE Category_Spending_Summary (
    category_summary_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    summary_month DATE NOT NULL,
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    transaction_count INT DEFAULT 0,
    average_transaction DECIMAL(12, 2) DEFAULT 0.00,
    last_updated DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Cat_Summary_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_Cat_Summary_Categories FOREIGN KEY (category_id) REFERENCES Categories(category_id),
    CONSTRAINT UQ_User_Category_Month_Summary UNIQUE (user_id, category_id, summary_month)
);
GO

CREATE INDEX idx_cat_summary_user_month ON Category_Spending_Summary(user_id, summary_month);
GO

-- ============================================
-- Table: Tags
-- Purpose: User-defined tags for better categorization
-- ============================================
CREATE TABLE Tags (
    tag_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    CONSTRAINT FK_Tags_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT UQ_User_Tag UNIQUE (user_id, tag_name)
);
GO

-- ============================================
-- Table: Transaction_Tags
-- Purpose: Many-to-many relationship between transactions and tags
-- ============================================
CREATE TABLE Transaction_Tags (
    transaction_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (transaction_id, tag_id),
    CONSTRAINT FK_TxTags_Transactions FOREIGN KEY (transaction_id) REFERENCES Transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT FK_TxTags_Tags FOREIGN KEY (tag_id) REFERENCES Tags(tag_id)
);
GO

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Update account balance after transaction
GO
CREATE TRIGGER trg_update_balance_after_transaction
ON Transactions
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE a
    SET current_balance = CASE 
        WHEN i.transaction_type = 'Income' THEN a.current_balance + i.amount
        WHEN i.transaction_type = 'Expense' THEN a.current_balance - i.amount
        ELSE a.current_balance
    END
    FROM Accounts a
    INNER JOIN inserted i ON a.account_id = i.account_id;
END;
GO

-- Trigger: Update account balances after transfer
CREATE TRIGGER trg_update_balance_after_transfer
ON Account_Transfers
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Deduct from source account
    UPDATE a
    SET current_balance = a.current_balance - i.amount
    FROM Accounts a
    INNER JOIN inserted i ON a.account_id = i.from_account_id;
    
    -- Add to destination account
    UPDATE a
    SET current_balance = a.current_balance + i.amount
    FROM Accounts a
    INNER JOIN inserted i ON a.account_id = i.to_account_id;
END;
GO

-- ============================================
-- Sample Data Insertion
-- ============================================

-- Insert sample user
INSERT INTO Users (username, email, password_hash, full_name, default_currency) 
VALUES ('john_doe', 'jd@example.com', 'hashed_password_123', 'John Doe', 'PKR');

-- Insert sample categories
INSERT INTO Categories (user_id, category_name, category_type, description) VALUES
(1, 'Salary', 'Income', 'Monthly salary'),
(1, 'Freelance', 'Income', 'Freelance income'),
(1, 'Groceries', 'Expense', 'Food and household items'),
(1, 'Transportation', 'Expense', 'Travel expenses'),
(1, 'Entertainment', 'Expense', 'Movies, games, etc.'),
(1, 'Utilities', 'Expense', 'Bills and utilities');

-- Insert sample accounts (balances will be updated by triggers)
INSERT INTO Accounts (user_id, account_name, account_type, current_balance, currency_code) VALUES
(1, 'Main Bank Account', 'Bank', 0.00, 'PKR'),
(1, 'Cash Wallet', 'Cash', 0.00, 'PKR'),
(1, 'JazzCash', 'Digital Wallet', 0.00, 'PKR');

-- Insert sample transactions (triggers will update balances)
INSERT INTO Transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date, description, payment_method) VALUES
(1, 1, 1, 'Income', 75000.00, '2026-02-01', 'February Salary', 'Bank Transfer'),
(1, 1, 3, 'Expense', 8000.00, '2026-02-05', 'Monthly groceries', 'Debit Card'),
(1, 2, 4, 'Expense', 1500.00, '2026-02-08', 'Uber rides', 'Cash'),
(1, 3, 5, 'Expense', 1200.00, '2026-02-10', 'Movie tickets', 'Digital Wallet'),
(1, 1, 6, 'Expense', 4500.00, '2026-02-12', 'Electricity bill', 'Bank Transfer'),
(1, 1, 2, 'Income', 15000.00, '2026-02-15', 'Freelance project', 'Bank Transfer'),
(1, 2, 3, 'Expense', 3500.00, '2026-02-20', 'Weekly groceries', 'Cash');

-- Insert sample budgets
INSERT INTO Budgets (user_id, category_id, budget_amount, budget_month, alert_threshold) VALUES
(1, 3, 10000.00, '2026-02-01', 90.00),
(1, 4, 5000.00, '2026-02-01', 85.00),
(1, 5, 3000.00, '2026-02-01', 90.00),
(1, 6, 6000.00, '2026-02-01', 95.00);

-- Insert sample recurring transactions
INSERT INTO Recurring_Transactions (user_id, account_id, category_id, transaction_type, amount, frequency, start_date, description, payment_method, is_active) VALUES
(1, 1, 1, 'Income', 75000.00, 'Monthly', '2026-01-01', 'Monthly salary', 'Bank Transfer', 1),
(1, 1, 6, 'Expense', 4500.00, 'Monthly', '2026-01-01', 'Electricity bill', 'Bank Transfer', 1),
(1, 1, 3, 'Expense', 8000.00, 'Monthly', '2026-01-01', 'Monthly groceries', 'Debit Card', 1);

-- Insert sample account transfers (triggers will update balances)
INSERT INTO Account_Transfers (user_id, from_account_id, to_account_id, amount, transfer_date, description) VALUES
(1, 1, 2, 10000.00, '2026-02-03', 'Cash withdrawal for daily expenses'),
(1, 1, 3, 5000.00, '2026-02-15', 'Top-up JazzCash wallet');

-- Insert sample budget alerts
INSERT INTO Budget_Alerts (budget_id, user_id, alert_type, alert_message, percentage_used, is_read) VALUES
(1, 1, 'Exceeded', 'You have exceeded your Groceries budget for February', 115.00, 0),
(2, 1, 'Near Limit', 'Transportation budget is at 30% for February', 30.00, 1);

-- Insert sample monthly summary
INSERT INTO User_Monthly_Summary (user_id, summary_month, total_income, total_expenses, net_savings, transaction_count, largest_expense, largest_income) VALUES
(1, '2026-02-01', 90000.00, 18700.00, 71300.00, 7, 8000.00, 75000.00);

-- Insert sample category spending summary
INSERT INTO Category_Spending_Summary (user_id, category_id, summary_month, total_amount, transaction_count, average_transaction) VALUES
(1, 3, '2026-02-01', 11500.00, 2, 5750.00),
(1, 4, '2026-02-01', 1500.00, 1, 1500.00),
(1, 5, '2026-02-01', 1200.00, 1, 1200.00),
(1, 6, '2026-02-01', 4500.00, 1, 4500.00);

-- Insert sample tags
INSERT INTO Tags (user_id, tag_name) VALUES
(1, 'Business'),
(1, 'Personal'),
(1, 'Urgent'),
(1, 'Recurring');

-- Insert sample transaction tags
INSERT INTO Transaction_Tags (transaction_id, tag_id) VALUES
(1, 4),  -- Salary tagged as Recurring
(2, 4),  -- Groceries tagged as Recurring
(6, 1);  -- Freelance tagged as Business

GO

-- ============================================
-- Verification Queries
-- ============================================

-- Check account balances after triggers
-- SELECT account_name, current_balance FROM Accounts WHERE user_id = 1;

-- Verify all tables created
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;
