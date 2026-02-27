# Deliverable 1 — Database Schema Design

**Release tag:** `v1.0-deliverable-1`

This deliverable covers the complete relational database schema for the Personal Finance Tracker system, including all table definitions, constraints, relationships, and diagrams.

---

## Contents

| File | Description |
|---|---|
| `finance_tracker_schema.sql` | Full schema — `CREATE TABLE` statements, constraints, and sample data |
| `Database_Schema_Report.pdf` | Formal report with table descriptions, relationships, and sample queries |
| `diagrams/schema_diagram_detailed.png` | ER diagram with all columns, types, and FK relationships |
| `diagrams/schema_diagram_simple.png` | Simplified relationship diagram showing cardinality |

---

## Tables

| Table | Purpose |
|---|---|
| Users | User accounts and authentication |
| Categories | Income/Expense classification |
| Accounts | Financial accounts (bank, cash, wallets) |
| Transactions | All income, expense, and transfer records |
| Budgets | Monthly category-wise spending limits |

---

## How to Run

```bash
mysql -u your_username -p your_database < finance_tracker_schema.sql
```

The script drops and recreates all tables, then inserts sample data for one test user.

---

## Scope

This deliverable covers concepts up to **JOINs and subqueries** only. Triggers, stored procedures, views, and transactions are out of scope for this stage.
