# Database Export & Import Guide

This directory contains complete SQL files with all local database tables and data (1,256 rows across 40 tables) ready to be inserted into any fresh database.

---

## 📁 Files Included

| File | Description | When to Use |
| :--- | :--- | :--- |
| [`finance_database.sql`](./finance_database.sql) | **Complete Database Dump**<br>Contains `pgcrypto` extension, complete schema (40 tables, indexes, constraints) and all **1,256 rows of local data**. | Use when provisioning a **completely fresh, empty database** (Docker, fresh local Postgres, or new cloud DB instance). |
| [`finance_data_inserts.sql`](./finance_data_inserts.sql) | **Data-Only Insert Script**<br>Contains clean `INSERT INTO table (...) VALUES (...)` statements with replication role bypass. | Use when tables **already exist** in your database and you only want to populate/insert all local records. |

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
psql -h <host> -p <port> -U <user> -d <database> -f docs/finance_database.sql

# Data-only insert into existing tables:
psql -h <host> -p <port> -U <user> -d <database> -f docs/finance_data_inserts.sql
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
2. Open [`docs/finance_database.sql`](./finance_database.sql) (or [`docs/finance_data_inserts.sql`](./finance_data_inserts.sql) if tables already exist).
3. Execute the script.

---

## 🔄 Re-exporting from Local DB

Whenever you want to refresh the files in `docs/` from your local database:
```powershell
cd Backend
pnpm db:export
# or
npm run db:export
```
