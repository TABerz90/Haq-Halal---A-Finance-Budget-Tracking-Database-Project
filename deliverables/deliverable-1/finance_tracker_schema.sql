-- Personal Finance Tracker and Budget Management System
-- Database Schema - Deliverable 1
-- FAST-NU, Lahore, Pakistan
-- Spring 2026

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS Transactions;
DROP TABLE IF EXISTS Budgets;
DROP TABLE IF EXISTS Accounts;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Users;

-- ============================================
-- Table: Users
-- Purpose: Store user account information
-- ============================================
CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- ============================================
-- Table: Categories
-- Purpose: Store transaction categories
-- ============================================
CREATE TABLE Categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_name VARCHAR(50) NOT NULL,
    category_type ENUM('Income', 'Expense') NOT NULL,
    description VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_category (user_id, category_name)
);

-- ============================================
-- Table: Accounts
-- Purpose: Store user's financial accounts
-- ============================================
CREATE TABLE Accounts (
    account_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type ENUM('Cash', 'Bank', 'Digital Wallet', 'Credit Card') NOT NULL,
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_account (user_id, account_name)
);

-- ============================================
-- Table: Transactions
-- Purpose: Store all income and expense records
-- ============================================
CREATE TABLE Transactions (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    category_id INT NOT NULL,
    transaction_type ENUM('Income', 'Expense', 'Transfer') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    description VARCHAR(255),
    payment_method VARCHAR(50),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency ENUM('Daily', 'Weekly', 'Monthly', 'Yearly') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES Accounts(account_id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE RESTRICT,
    CHECK (amount > 0)
);

-- ============================================
-- Table: Budgets
-- Purpose: Store budget limits for categories
-- ============================================
CREATE TABLE Budgets (
    budget_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    budget_amount DECIMAL(15, 2) NOT NULL,
    budget_month DATE NOT NULL,
    alert_threshold DECIMAL(5, 2) DEFAULT 90.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_category_month (user_id, category_id, budget_month),
    CHECK (budget_amount > 0),
    CHECK (alert_threshold >= 0 AND alert_threshold <= 100)
);

-- ============================================
-- Sample Data Insertion (for testing)
-- ============================================

-- Insert sample user
INSERT INTO Users (username, email, password_hash, full_name) 
VALUES ('talha_ahmad', 'talha@example.com', 'hashed_password_123', 'Talha Ahmad');

-- Insert sample categories for the user
INSERT INTO Categories (user_id, category_name, category_type, description) VALUES
(1, 'Salary', 'Income', 'Monthly salary'),
(1, 'Freelance', 'Income', 'Freelance income'),
(1, 'Groceries', 'Expense', 'Food and household items'),
(1, 'Transportation', 'Expense', 'Travel expenses'),
(1, 'Entertainment', 'Expense', 'Movies, games, etc.'),
(1, 'Utilities', 'Expense', 'Bills and utilities');

-- Insert sample accounts for the user
INSERT INTO Accounts (user_id, account_name, account_type, current_balance) VALUES
(1, 'Main Bank Account', 'Bank', 50000.00),
(1, 'Cash Wallet', 'Cash', 5000.00),
(1, 'JazzCash', 'Digital Wallet', 2000.00);

-- Insert sample transactions
INSERT INTO Transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date, description, payment_method, is_recurring, recurring_frequency) VALUES
(1, 1, 1, 'Income', 75000.00, '2026-02-01', 'February Salary', 'Bank Transfer', TRUE, 'Monthly'),
(1, 1, 3, 'Expense', 8000.00, '2026-02-05', 'Monthly groceries', 'Debit Card', TRUE, 'Monthly'),
(1, 2, 4, 'Expense', 1500.00, '2026-02-08', 'Uber rides', 'Cash', FALSE, NULL),
(1, 3, 5, 'Expense', 1200.00, '2026-02-10', 'Movie tickets', 'Digital Wallet', FALSE, NULL),
(1, 1, 6, 'Expense', 4500.00, '2026-02-12', 'Electricity bill', 'Bank Transfer', TRUE, 'Monthly');

-- Insert sample budgets
INSERT INTO Budgets (user_id, category_id, budget_amount, budget_month, alert_threshold) VALUES
(1, 3, 10000.00, '2026-02-01', 90.00),
(1, 4, 5000.00, '2026-02-01', 85.00),
(1, 5, 3000.00, '2026-02-01', 90.00),
(1, 6, 6000.00, '2026-02-01', 95.00);

-- ============================================
-- Useful Queries for Testing
-- ============================================

-- View all transactions for a user
-- SELECT t.*, c.category_name, a.account_name 
-- FROM Transactions t
-- JOIN Categories c ON t.category_id = c.category_id
-- JOIN Accounts a ON t.account_id = a.account_id
-- WHERE t.user_id = 1
-- ORDER BY t.transaction_date DESC;

-- Check budget vs actual spending for a category
-- SELECT b.budget_amount, 
--        COALESCE(SUM(t.amount), 0) as total_spent,
--        b.budget_amount - COALESCE(SUM(t.amount), 0) as remaining
-- FROM Budgets b
-- LEFT JOIN Transactions t ON b.category_id = t.category_id 
--     AND b.user_id = t.user_id 
--     AND DATE_FORMAT(t.transaction_date, '%Y-%m-01') = b.budget_month
--     AND t.transaction_type = 'Expense'
-- WHERE b.user_id = 1 AND b.budget_month = '2026-02-01'
-- GROUP BY b.budget_id;
