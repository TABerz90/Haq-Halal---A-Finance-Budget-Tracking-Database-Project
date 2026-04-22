# Personal Finance Tracker and Budget Management System

A relational database project built for **CS Database Systems — Spring 2026**
at the National University of Computer and Emerging Sciences (FAST-NU, Lahore).

---

## Team

| Name | Roll No |
|---|---|
| Talha Ahmad | 24L-0620 |
| Muhammad Ibrahim | 24L-0630 |
| Muhammad Aariz | 24L-0631 |

**Instructor:** Ahmed Jaan &nbsp;|&nbsp; **Lab TA:** Shahzeb Mubashar

---

## Project Overview

This system is designed to help users manage their personal finances through a structured relational database. It supports:

- Secure user authentication and isolated data per user
- Multiple financial accounts (bank, cash, digital wallets, credit cards)
- Income and expense transaction tracking with categories
- Recurring transaction support (salaries, rent, subscriptions)
- Monthly, category-wise budget planning with alert thresholds
- Financial reporting via joins and subqueries

---

## Deliverables

| # | Title | Tag | Status |
|---|---|---|---|
| 1 | Database Schema Design | `v1.0-deliverable-1` | ✅ Complete |

---

## Repository Structure

```
finance-tracker/
│
├── deliverables/
│   └── deliverable-1/          # Schema Design
│       ├── finance_tracker_schema.sql
│       ├── Database_Schema_Report.pdf
│       └── diagrams/
│           ├── schema_diagram_detailed.png
│           └── schema_diagram_simple.png
│
└── README.md
```

---

## Database Schema (Summary)

Five tables form the core of the system:

- **Users** — accounts and authentication
- **Categories** — user-defined income/expense categories
- **Accounts** — financial accounts per user
- **Transactions** — all income, expense, and transfer records
- **Budgets** — monthly spending limits per category

See the [Deliverable 1 README](deliverables/deliverable-1/README.md) for full details.
