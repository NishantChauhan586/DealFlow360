# DealFlow360 Database Seed

This directory contains the database seed data and scripts to populate the local PostgreSQL instance with realistic test data for the DealFlow360 application.

## Prerequisites
- PostgreSQL database running and accessible.
- Environment variables configured (specifically `DATABASE_URL` in `.env` inside the `backend` folder).
- Node.js installed to run npm scripts.
- Python virtual environment set up in `backend/.venv`.

## Setup and Import

To generate fresh mock data and safely import it into your database, run the following command from the root of the project:

```bash
npm run seed
```

This command automatically:
1. Executes `backend/generate_json.py` to create a robust, dynamically generated seed dataset at `seed/database-seed.json` matching the current SQLAlchemy models.
2. Executes `backend/import_json.py` to safely reset all tables and idempotently insert the generated data using the database transaction.

## Expected Record Counts
The seed generation script produces approximately **684 total records** distributed across 18 backend tables:
- **Users**: 6
- **Products**: 6
- **Quotes**: 50
- **Quote Items**: 150
- **Orders**: 25
- **Alerts, Anomalies, Subscriptions, Pricing, Tiers, etc.**

## Development Login Credentials
You can log in to the application using any of the seeded roles. The default password for all seed accounts is `password` (hashed locally in the DB according to standard configuration).

- Admin: `admin@dealflow360.com`
- Rep: `rep@dealflow360.com`
- Manager: `manager@dealflow360.com`
- Finance: `finance@dealflow360.com`
- VP: `vp@dealflow360.com`

## Reset/Reseed Instructions
The seed script (`import_json.py`) is designed to be fully idempotent. You can re-run `npm run seed` as many times as you like. It automatically empties all tables respecting foreign key relationships before importing the latest JSON.

## Warnings
- **DO NOT** run this against a production database. The `import_json.py` script automatically aborts if the `ENVIRONMENT` environment variable is set to `production`.
- Running the script permanently purges existing local database state across all seeded entities.
