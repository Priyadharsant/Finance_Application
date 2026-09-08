# Finance Application

Electron + React frontend, Node.js REST API, and PostgreSQL database for Daily Finance management.

## Start with Docker

1. Install Docker Desktop.
2. Copy `.env.example` to `.env` and set a long random `POSTGRES_PASSWORD`.
3. Start PostgreSQL and the API:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The API is available at `http://localhost:3001/api/daily-finance`. PostgreSQL is available on the configured host port (default `5432`). The first database startup applies `Backend/daily_finance/migrations/001_initial.sql` automatically.

Enter new customers and finance accounts through the application; no Excel data is loaded automatically.

The main screen is intentionally focused on the daily finance flow:

- Dashboard: total finance, amount given, total return, collected, remaining, profit, active/completed counts, and today’s collection.
- Customers: add a customer with address/notes, gross finance amount, and an upfront interest deduction (percentage or fixed amount), then open complete customer history.
- Daily entry: choose today or any previous date, enter the amount received, and edit an existing entry when needed.
- Reports: filter by customer, name, status, and daily/weekly/monthly/yearly/custom date range. Reports show period collection separately from lifetime collected, along with given, remaining, and profit.

All live values are read from PostgreSQL through the Node.js API. Excel migration is not part of the active workflow.

To stop containers while retaining database data:

```powershell
docker compose down
```

To remove the local database volume as well (destructive):

```powershell
docker compose down -v
```

## Run Node API without Docker

```powershell
cd Backend
npm install
$env:DATABASE_URL='postgresql://finance:password@localhost:5432/finance'
npm start
```

## Build the Electron desktop app

```powershell
cd Frontend
npm install
npm run build
npm run electron:build
```

The Windows installer is written to `Frontend/release`.

Never commit `.env`, database dumps, or credentials. Use PostgreSQL backups (`pg_dump`) to an encrypted location outside the application folder.
