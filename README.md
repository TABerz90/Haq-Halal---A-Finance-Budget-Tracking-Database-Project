# Haq Halal - Islamic Finance Tracker

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Database](https://img.shields.io/badge/database-SQL%20Server-blue)
![Backend](https://img.shields.io/badge/backend-Node.js-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

> A comprehensive Islamic finance management system designed to help users track their personal finances while ensuring compliance with Islamic financial principles.

## 📋 Project Overview

**Haq Halal** is a database-driven personal finance tracker built as part of the Database Systems Lab course (CL-2005) at FAST-NU Lahore. The system provides users with tools to manage their income, expenses, budgets, and accounts in accordance with Halal financial practices.

### Team Members

| Name | GitHub |
|------|--------|
| Talha Ahmad | [@talha-ahmad](https://github.com/TABerz90) |
| Muhammad Ibrahim | [@ibrahim](https://github.com/dwarf725) |
| Muhammad Aariz | [@aariz](https://github.com/aru125678) |

### Course Information

- **Course:** Database Systems Lab (CL-2005)
- **Instructor:** Mr. Muhammad Naveed
- **Lab Instructor:** Ahmed Jaan Butt
- **Lab TA:** Shahzeb Mubashar
- **Semester:** Spring 2026

## ✨ Features

### Core Functionality

- ✅ **Multi-Account Management** - Support for Bank, Cash, Digital Wallet, and Credit Card accounts
- ✅ **Transaction Tracking** - Detailed income and expense recording with categorization
- ✅ **Budget Planning** - Monthly budget limits with real-time alerts and monitoring
- ✅ **Recurring Transactions** - Automated handling of regular income and expenses
- ✅ **Account Transfers** - Seamless money movement between accounts with dual-entry tracking
- ✅ **Analytics Dashboard** - Comprehensive financial insights and reporting
- ✅ **Multi-Currency Support** - Track finances in different currencies

### Advanced Features

- 🚀 **Performance Optimization** - Pre-computed statistics tables for instant dashboard loading
- 🔒 **JWT Authentication** - Secure token-based auth with bcrypt password hashing
- 📊 **Complex Analytics** - 10+ database views for in-depth financial analysis
- 🔗 **RESTful API** - 30+ endpoints for seamless frontend integration
- 🏷️ **Flexible Tagging** - Custom tags for enhanced transaction organization
- 📈 **Trend Analysis** - Year-over-year comparisons and forecasting
- ⚡ **Rate Limiting** - Brute-force protection on auth endpoints

## 🏗️ System Architecture

```
┌─────────────────┐
│   Frontend      │  (React 18 + Recharts)
│   (React App)   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│   Backend       │  (Node.js + Express + JWT)
│   (REST API)    │
└────────┬────────┘
         │ SQL Queries
         ▼
┌─────────────────┐
│   Database      │  (SQL Server)
│   (12 Tables)   │
└─────────────────┘
```

## 📦 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Database** | Microsoft SQL Server | Relational data storage with ACID compliance |
| **Backend** | Node.js + Express.js | RESTful API server |
| **Auth** | JWT + bcryptjs | Secure authentication |
| **Frontend** | React 18 + React Router v6 | Single-page application |
| **Charts** | Recharts | Financial data visualization |
| **Database Driver** | mssql (npm package) | SQL Server connectivity |
| **Environment** | dotenv | Secure configuration management |
| **Testing** | Postman | API endpoint testing |
| **Version Control** | Git + GitHub | Source code management |

## 📁 Repository Structure

```
haq-halal/
├── deliverables/
│   ├── deliverable-1/           # Initial schema design
│   │   ├── finance_tracker_schema.sql
│   │   ├── diagrams/
│   │   │   ├── schema_diagram_detailed.png
│   │   │   └── schema_diagram_simple.png
│   │   ├── Database_Schema_Report.pdf
│   │   └── README.md
│   │
│   ├── deliverable-2/           # Upgraded schema, views & API
│   │   ├── finance_tracker_schema_v2.sql
│   │   ├── views_and_queries.sql
│   │   ├── server.js
│   │   ├── package.json
│   │   ├── .env.example
│   │   ├── .gitignore
│   │   ├── Deliverable2_HaqHalal_Report.pdf
│   │   └── README.md
│   │
│   └── deliverable-3-4/         # Full-stack app with JWT auth & React UI
│       ├── backend/
│       │   ├── server.js
│       │   ├── package.json
│       │   ├── .env.example
│       │   ├── middleware/
│       │   │   ├── auth.js
│       │   │   └── rateLimiter.js
│       │   └── routes/
│       │       ├── auth.js, users.js, accounts.js
│       │       ├── transactions.js, categories.js
│       │       ├── budgets.js, recurring.js
│       │       ├── transfers.js, tags.js
│       │       └── alerts.js, dashboard.js
│       ├── frontend/
│       │   ├── package.json
│       │   ├── public/index.html
│       │   └── src/
│       │       ├── App.js
│       │       ├── api/axios.js
│       │       ├── context/AuthContext.js
│       │       ├── components/Layout.js
│       │       └── pages/
│       │           ├── Auth.js, Dashboard.js
│       │           ├── Transactions.js, Analytics.js
│       │           └── OtherPages.js
│       └── README.md
│
├── .gitignore
└── README.md                    # This file
```

## 📊 Database Schema

### Core Tables

1. **Users** - User authentication and profile management
2. **Categories** - Income/Expense classification
3. **Accounts** - Financial account tracking
4. **Transactions** - Core transaction records
5. **Budgets** - Monthly spending limits

### Advanced Tables

6. **Recurring_Transactions** - Automated recurring income/expenses
7. **Account_Transfers** - Inter-account money transfers
8. **Budget_Alerts** - Budget monitoring notifications
9. **Tags** - Custom transaction labels
10. **Transaction_Tags** - Many-to-many tag relationships

### Statistics Tables (Performance Optimization)

11. **User_Monthly_Summary** - Pre-computed monthly financial data
12. **Category_Spending_Summary** - Category-level spending analytics

### Database Views

- User_Dashboard_Summary
- Monthly_Financial_Overview
- Top_Spending_Categories
- Budget_Status_Overview
- Recent_Transactions_Detailed
- Active_Recurring_Transactions
- Recurring_Due_This_Month
- Account_Transfer_History
- Unread_Budget_Alerts
- YoY_Financial_Comparison
- Cash_Flow_Forecast

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- SQL Server (2019 or higher)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TABerz90/Haq-Halal---A-Finance-Budget-Tracking-Database-Project.git
   cd Haq-Halal---A-Finance-Budget-Tracking-Database-Project
   ```

2. **Set up the database**
   ```bash
   # Open SQL Server Management Studio
   # Execute the SQL files in order:
   # 1. deliverables/deliverable-2/finance_tracker_schema_v2.sql
   # 2. deliverables/deliverable-2/views_and_queries.sql
   ```

3. **Install and run the backend (Deliverable 3-4)**
   ```bash
   cd deliverables/deliverable-3-4/backend
   npm install
   cp .env.example .env
   # Edit .env with your DB credentials and JWT_SECRET
   npm start
   ```

4. **Install and run the frontend (Deliverable 3-4)**
   ```bash
   cd deliverables/deliverable-3-4/frontend
   npm install
   cp .env.example .env
   npm start
   # Opens at http://localhost:3000
   ```

## 📖 API Documentation

### Deliverable 3-4 (JWT-protected)

#### Auth (public)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT
- `GET  /api/auth/me` - Get current user profile

#### Protected endpoints (require `Authorization: Bearer <token>`)
- `*    /api/users`
- `*    /api/categories`
- `*    /api/accounts`
- `*    /api/transactions`
- `*    /api/budgets`
- `*    /api/recurring`
- `*    /api/transfers`
- `*    /api/tags`
- `*    /api/alerts`
- `*    /api/dashboard`

## 📚 Deliverables

| # | Title | Status |
|---|-------|--------|
| 1 | Database Schema Design | ✅ Complete |
| 2 | Enhanced Schema, Views & REST API | ✅ Complete |
| 3-4 | Full-Stack App (JWT Auth + React Frontend) | ✅ Complete |

## 🔒 Security Features

- ✅ Parameterized SQL queries (SQL injection prevention)
- ✅ Environment variables for sensitive credentials
- ✅ .gitignore excludes .env files from version control
- ✅ CORS enabled for controlled cross-origin requests
- ✅ JWT authentication with 7-day expiry
- ✅ bcrypt password hashing (salt rounds: 10)
- ✅ Rate limiting (20 auth attempts / 15 min; 100 API req / min)

## 🤝 Contributing

This is an academic project for FAST-NU Database Systems Lab. Contributions from team members only.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Mr. Muhammad Naveed** - Course Instructor
- **Ahmed Jaan Butt** - Lab Instructor
- **Shahzeb Mubashar** - Lab TA
- FAST-NU Lahore - Department of Computer Science

## 📞 Contact

- **Talha Ahmad** - l240620@lhr.nu.edu.pk
- **Muhammad Ibrahim** - l240630@lhr.nu.edu.pk
- **Muhammad Aariz** - l240631@lhr.nu.edu.pk

---

<div align="center">
  <strong>Haq Halal</strong> - Managing finances the Halal way
  <br>
  Built with ❤️ at FAST-NU Lahore
  <br>
  <sub>Spring 2026</sub>
</div>
