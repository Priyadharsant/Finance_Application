# Database Export & Import Guide

This directory contains complete SQL files with all local database tables and data (1,256 rows across 40 tables) ready to be inserted into any fresh database.

---

## 📁 Files Included

| File | Description | When to Use |
| :--- | :--- | :--- |
| [`finance_database.sql`](./finance_database.sql) | **Complete Database Dump**<br>Contains `pgcrypto` extension, complete schema (40 tables, indexes, constraints) and all **1,256 rows of local data**. | Use when provisioning a **completely fresh, empty database** (Docker, fresh local Postgres, or new cloud DB instance). |
| [`finance_data_inserts.sql`](./finance_data_inserts.sql) | **Data-Only Insert Script**<br>Contains clean `INSERT INTO table (...) VALUES (...)` statements with replication role bypass. | Use when tables **already exist** in your database and you only want to populate/insert all local records. |
| [`export-database.js`](./export-database.js) | Node export utility script that dumps local DB data into clean, compatible SQL files. | Use anytime you want to refresh/re-export local DB data. |
| [`import-database.js`](./import-database.js) | Node import utility script to apply the SQL files to any target database. | Run to import data into local or remote databases. |

> **Note:** These files are also mirrored in the project root [`docs/`](../../docs/) folder.

---

## 🚀 How to Insert Data into a Fresh Database

### Option 1: Automated Script (Recommended)

From the `Backend` directory, configure your `.env` with target database details (or set `DATABASE_URL`):

#### To initialize a fresh database with full schema + data:
```powershell
# Using pnpm
pnpm db:import

# Or using npm
npm run db:import
```

#### To insert only data into an existing database schema:
```powershell
# Using pnpm
pnpm db:import:data

# Or using npm
npm run db:import:data
```

---

### Option 2: Using `psql` Command Line

You can run the SQL script against any PostgreSQL database:

```bash
# Set password
export PGPASSWORD="your_password"   # Linux/macOS
$env:PGPASSWORD="your_password"     # Windows PowerShell

# Full database creation (Schema + Data):
psql -h <host> -p <port> -U <user> -d <database> -f docs/finance_database.sql

# Data-only insert:
psql -h <host> -p <port> -U <user> -d <database> -f docs/finance_data_inserts.sql
```

---

### Option 3: Using Docker Compose

`docker-compose.yml` mounts [`Backend/docs/finance_database.sql`](./finance_database.sql) directly into PostgreSQL's initialization directory `/docker-entrypoint-initdb.d/`.

Starting the container will automatically create and populate the database:
```bash
docker compose up -d postgres
```

---

### Option 4: Cloud Databases & GUI Tools (DBeaver, pgAdmin, Supabase, Render, Neon)

1. Open your database in **DBeaver**, **pgAdmin**, or your cloud provider's **SQL Editor**.
2. Open [`docs/finance_database.sql`](./finance_database.sql) (or [`docs/finance_data_inserts.sql`](./finance_data_inserts.sql) if tables already exist).
3. Execute the script.

---

## 🔄 How to Re-Export Local DB Data in the Future

If you add or update records in your local database and want to update the `docs/` export files:

```powershell
# From Backend folder:
pnpm db:export
# or
npm run db:export
```

This will automatically dump all tables and data, clean incompatible version commands, and update both `Backend/docs/` and root `docs/`.
