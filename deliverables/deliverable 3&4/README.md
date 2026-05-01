# Haq Halal — Deliverable 3 & 4
## Full-Stack Islamic Finance Tracker

**Course:** Database Systems Lab (CL-2005) · FAST-NU Lahore · Spring 2026  
**Team:** Talha Ahmad · Muhammad Ibrahim · Muhammad Aariz

---

## Contributors

| Name | GitHub | Role |
|---|---|---|
| Talha Ahmad | [@TABerz90](https://github.com/TABerz90) | Project lead, database schema, SQL views, triggers & stored procedures |
| Muhammad Ibrahim | [@dwarf725](https://github.com/dwarf725) | Backend — Node.js/Express REST API, JWT auth, budget & alert system |
| Muhammad Aariz | [@aru125678](https://github.com/aru125678) | Frontend — React UI, all pages, charts, API integration |

---

## What's Included

```
deliverable 3&4/
├── backend/                  # Node.js + Express API
│   ├── server.js             # Entry point
│   ├── middleware/
│   │   └── auth.js           # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js           # Register, login, /me
│   │   ├── users.js
│   │   ├── categories.js
│   │   ├── accounts.js
│   │   ├── transactions.js   # Includes search, filter, pagination
│   │   ├── budgets.js        # Includes real-time spend calculation
│   │   ├── recurring.js      # Recurring transactions + manual generate
│   │   ├── transfers.js      # Account transfers
│   │   ├── tags.js           # Tags + transaction tagging
│   │   ├── alerts.js         # Budget alerts
│   │   └── dashboard.js      # Analytics endpoints
│   ├── package.json
│   └── .env.example
│
└── frontend/                 # React application
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── api/
    │   │   └── axios.js      # Axios + JWT interceptor
    │   ├── context/
    │   │   └── AuthContext.js
    │   ├── components/
    │   │   └── Layout.js     # Sidebar + ProtectedRoute
    │   ├── pages/
    │   │   ├── Auth.js       # Login + Register
    │   │   ├── Dashboard.js  # Charts + summary cards
    │   │   ├── Transactions.js
    │   │   └── OtherPages.js # Accounts, Categories, Budgets,
    │   │                     # Recurring, Transfers, Alerts
    │   ├── index.css         # Design system
    │   ├── index.js
    │   └── App.js            # Routes
    ├── package.json
    └── .env.example
```

---

## Setup Instructions

### 1. Database
Use the SQL files from Deliverable 2. No schema changes required — all 12 tables are already in BCNF.

```sql
-- In SQL Server Management Studio, run in order:
-- 1. finance_tracker_schema_v2.sql
-- 2. views_and_queries.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — fill in DB credentials and set a strong JWT_SECRET
npm start
# API running at http://localhost:5000
```

**Required .env values:**
```
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=haqhalal
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=pick_any_long_random_string
JWT_EXPIRES_IN=7d
PORT=5000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# REACT_APP_API_URL=http://localhost:5000/api  (already set)
npm start
# App running at http://localhost:3000
```

---

## API Overview

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account, returns JWT |
| POST | `/api/auth/login` | Login, returns JWT |

### Protected Endpoints (require `Authorization: Bearer <token>`)

| Resource | Endpoints |
|----------|-----------|
| Auth | `GET /api/auth/me` |
| Users | CRUD `/api/users` |
| Categories | CRUD `/api/categories` |
| Accounts | CRUD `/api/accounts` |
| Transactions | CRUD `/api/transactions` + search/filter/pagination |
| Budgets | CRUD `/api/budgets` |
| Recurring | CRUD `/api/recurring` + `POST /:id/generate` |
| Transfers | CRUD `/api/transfers` |
| Tags | CRUD `/api/tags` + tag/untag transactions |
| Alerts | CRUD `/api/alerts` + mark read/read-all |
| Dashboard | `GET /api/dashboard/:userId` |
| | `GET /api/dashboard/:userId/monthly-trend` |
| | `GET /api/dashboard/:userId/top-categories` |
| | `GET /api/dashboard/:userId/budget-status` |
| | `GET /api/dashboard/:userId/alerts` |

### Transaction Filtering
`GET /api/transactions/user/:userId` supports query params:
- `page`, `limit` — pagination
- `search` — searches description + category name
- `type` — `Income` or `Expense`
- `category_id`, `account_id`
- `date_from`, `date_to`
- `amount_min`, `amount_max`

---

## Frontend Pages

| Page | Path | Features |
|------|------|----------|
| Login | `/login` | JWT login |
| Register | `/register` | Account creation |
| Dashboard | `/dashboard` | Balance cards, 6-month bar chart, top categories, budget progress, alerts |
| Transactions | `/transactions` | Search, filter by type/category/date, pagination, add/edit/delete |
| Accounts | `/accounts` | Card view, add/edit/deactivate |
| Categories | `/categories` | Grouped by Income/Expense, full CRUD |
| Budgets | `/budgets` | Progress bars, colour-coded status, full CRUD |
| Recurring | `/recurring` | Pause/resume, full CRUD |
| Transfers | `/transfers` | Balance check before transfer, history table |
| Alerts | `/alerts` | Mark read, dismiss, mark all read |

---

## Security

- Passwords hashed with **bcryptjs** (10 salt rounds)
- **JWT** tokens expire in 7 days
- All routes except `/api/auth/*` require a valid Bearer token
- Parameterised T-SQL queries throughout (SQL injection prevention)
- `.env` excluded from version control

---

## BCNF Compliance

All 12 tables verified in BCNF:
- Every table has a surrogate PK that determines all other columns
- Composite candidate keys enforced via UNIQUE constraints
- No partial or transitive functional dependencies
- `Budget_Alerts.user_id` is a deliberate denormalization for join-free lookups — does not create a non-superkey FD

---

## Team Contributions

| Member | Responsibilities |
|--------|-----------------|
| Talha Ahmad | Project lead, database schema design, BCNF audit, SQL views, triggers, stored procedures |
| Muhammad Ibrahim | Full backend: Express server, all API routes, JWT authentication, budget rollover & alert system |
| Muhammad Aariz | Full frontend: React app, all pages, dashboard charts, budget warning modal, API integration |
