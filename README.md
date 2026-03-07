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
- 🔒 **Automatic Balance Updates** - Database triggers ensure data consistency
- 📊 **Complex Analytics** - 10+ database views for in-depth financial analysis
- 🔗 **RESTful API** - 30+ endpoints for seamless frontend integration
- 🏷️ **Flexible Tagging** - Custom tags for enhanced transaction organization
- 📈 **Trend Analysis** - Year-over-year comparisons and forecasting

## 🏗️ System Architecture

```
┌─────────────────┐
│   Frontend      │  (React - Planned)
│   (React App)   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│   Backend       │  (Node.js + Express)
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
| **Database Driver** | mssql (npm package) | SQL Server connectivity |
| **Environment** | dotenv | Secure configuration management |
| **Testing** | Postman | API endpoint testing |
| **Version Control** | Git + GitHub | Source code management |

## 📁 Repository Structure

```
haq-halal/
├── deliverables/
│   ├── deliverable-1/           # Initial schema design
│   │   ├── schema.sql
│   │   ├── diagrams/
│   │   │   ├── schema_diagram_detailed.png
│   │   │   └── schema_diagram_simple.png
│   │   ├── Database_Schema_Report.pdf
│   │   └── README.md
│   │
│   └── deliverable-2/           # Upgraded schema, views & API
│       ├── finance_tracker_schema_v2.sql
│       ├── views_and_queries.sql
│       ├── server.js
│       ├── package.json
│       ├── .env
│       ├── .gitignore
│       ├── Deliverable2_HaqHalal_Report.pdf
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
   git clone https://github.com/your-username/haq-halal.git
   cd haq-halal
   ```

2. **Set up the database**
   ```bash
   # Open SQL Server Management Studio
   # Execute the SQL files in order:
   # 1. deliverables/deliverable-2/schema_enhanced_sqlserver.sql
   # 2. deliverables/deliverable-2/views_queries_sqlserver.sql
   ```

3. **Install backend dependencies**
   ```bash
   cd deliverables/deliverable-2
   npm install
   ```

4. **Configure environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env with your database credentials
   # DB_SERVER=localhost
   # DB_PORT=64513
   # DB_DATABASE=haqhalal
   # DB_USER=your_username
   # DB_PASSWORD=your_password
   # PORT=5000
   ```

5. **Start the API server**
   ```bash
   npm start
   # Server runs on http://localhost:5000
   ```

6. **Test the API**
   ```bash
   # Open your browser
   http://localhost:5000
   
   # Or use curl
   curl http://localhost:5000/api/users
   ```

## 📖 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints Overview

| Resource | GET (Read) | POST (Create) | PUT (Update) | DELETE |
|----------|------------|---------------|--------------|--------|
| Users | `/users` | `/users` | `/users/:id` | `/users/:id` |
| Categories | `/categories/user/:userId` | `/categories` | `/categories/:id` | `/categories/:id` |
| Accounts | `/accounts/user/:userId` | `/accounts` | `/accounts/:id` | `/accounts/:id` |
| Transactions | `/transactions/user/:userId` | `/transactions` | `/transactions/:id` | `/transactions/:id` |
| Budgets | `/budgets/user/:userId` | `/budgets` | `/budgets/:id` | `/budgets/:id` |

### Analytics Endpoints

- `GET /api/dashboard/:userId` - User financial dashboard summary
- `GET /api/budget-status/:userId` - Real-time budget status

### Example Request

```bash
# Create a new transaction
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "account_id": 1,
    "category_id": 3,
    "transaction_type": "Expense",
    "amount": 5000.00,
    "transaction_date": "2026-03-07",
    "description": "Monthly groceries",
    "payment_method": "Debit Card"
  }'
```

## 📚 Deliverables

### Deliverable 1 
- Initial database schema design
- Entity-Relationship diagrams
- Comprehensive documentation
- Sample data and test queries
- **Status:** Released v1.0

### Deliverable 2 
- Enhanced schema with statistics tables
- 10+ database views and complex queries
- Complete RESTful API (30+ endpoints)
- Comprehensive PDF report
- **Status:** Released v2.0

## 🧪 Testing

### Database Testing
```bash
# Run the SQL test queries in SQL Server Management Studio
# Files: deliverables/deliverable-2/test_queries.sql
```

### API Testing
```bash
# Install and use Postman
# Import collection from: deliverables/deliverable-2/postman_collection.json

# Or test with curl
curl http://localhost:5000/api/users
curl http://localhost:5000/api/dashboard/1
```

## 📈 Performance Optimization

1. **Statistics Tables** - Pre-computed monthly summaries reduce query time by ~80%
2. **Database Indexes** - 10+ strategic indexes on frequently queried columns
3. **Connection Pooling** - Reuses database connections for better performance
4. **Views Instead of Tables** - Eliminated redundant Budget_Performance table
5. **Triggers for Automation** - Automatic balance updates reduce application logic

## 🔒 Security Features

- ✅ Parameterized SQL queries (SQL injection prevention)
- ✅ Environment variables for sensitive credentials
- ✅ .gitignore excludes .env files from version control
- ✅ CORS enabled for controlled cross-origin requests
- ✅ Error messages don't expose internal details
- 🔜 JWT authentication (planned for Deliverable 3)
- 🔜 Rate limiting (planned for Deliverable 3)

## 🤝 Contributing

This is an academic project for FAST-NU Database Systems Lab. Contributions from team members only.

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -m "Add your feature"`
3. Push to the branch: `git push origin feature/your-feature`
4. Create a Pull Request for review

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Mr. Muhammad Naveed** - Course Instructor
- **Ahmed Jaan Butt** - Lab Instructor
- **Shahzeb Mubashar** - Lab TA
- FAST-NU Lahore - Department of Computer Science

## 📞 Contact

For questions or support, please contact:

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
