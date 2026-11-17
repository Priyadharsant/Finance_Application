# Database Export & Import Guide

Database snapshots are stored once in [`Backend/docs/`](../Backend/docs/). This guide explains how to import them.

---

## 📁 Files Included

| File | Description | When to Use |
| :--- | :--- | :--- |
| [`finance_database.sql`](../Backend/docs/finance_database.sql) | Complete schema and data dump. | Use when provisioning a fresh, empty database. |
| [`finance_data_inserts.sql`](../Backend/docs/finance_data_inserts.sql) | Data-only inserts. | Use when tables already exist and you only need to populate records. |

---

## 🚀 How to Insert Data into a Fresh Database

### Option 1: Automated Script via Backend

From the `Backend` directory:

#### To initialize a fresh database with full schema + data:
```powershell
pnpm db:import
# or
npm run db:import
```

#### To insert only data into an existing database schema:
```powershell
pnpm db:import:data
# or
npm run db:import:data
```

---

### Option 2: Using `psql` Command Line

```bash
# Windows PowerShell
$env:PGPASSWORD="your_password"

# Full database creation (Schema + Data):
psql -h <host> -p <port> -U <user> -d <database> -f Backend/docs/finance_database.sql

# Data-only insert into existing tables:
psql -h <host> -p <port> -U <user> -d <database> -f Backend/docs/finance_data_inserts.sql
```

---

### Option 3: Using Docker Compose

`docker-compose.yml` mounts `Backend/docs/finance_database.sql` directly into PostgreSQL's initialization directory `/docker-entrypoint-initdb.d/`.

```bash
docker compose up -d postgres
```

---

### Option 4: Cloud Databases & GUI Tools (DBeaver, pgAdmin, Supabase, Render, Neon)

1. Open your database in **DBeaver**, **pgAdmin**, or your cloud provider's **SQL Editor**.
2. Open [`Backend/docs/finance_database.sql`](../Backend/docs/finance_database.sql) (or [`Backend/docs/finance_data_inserts.sql`](../Backend/docs/finance_data_inserts.sql) if tables already exist).
3. Execute the script.

---

## 🔄 Re-exporting from Local DB

Whenever you want to refresh the canonical SQL snapshots in `Backend/docs/` from your local database:
```powershell
cd Backend
pnpm db:export
# or
npm run db:export
```
