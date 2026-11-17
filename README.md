# 🔋 BatteryPassport
**EV Battery Lifecycle, Traceability and Second-Life Assessment Platform**
DBMS Experiential Learning – Level 3 Project · **MySQL + MongoDB + Next.js**

BatteryPassport tracks every EV battery from manufacturing → vehicle installation → health monitoring → repair →
refurbishment / second-life reuse → recycling, with a tamper-evident chronological timeline, rule-based second-life
assessment and recovered-material reporting.

| Layer | Technology | Used for |
|---|---|---|
| SQL database | **MySQL 8** | Batteries, models, vehicles, ownership, installations, repairs, health summaries, assessments, refurbishment, recycling, users/roles, rules, alerts |
| NoSQL database | **MongoDB 7** | High-volume time-stamped telemetry (temperature, voltage, current, SOC, SOH, cycles) + time-bucket aggregation |
| Backend / API | Next.js Route Handlers (`app/api/**`) | Auth (JWT cookie), role checks, calls stored procedures, joins MySQL + MongoDB results |
| Frontend | Next.js 14 (App Router, React 18) | Dashboard, passport pages, forms, filters, charts, reports |

---
## 1. Prerequisites
* **Node.js 18.17+** (20 or 22 recommended)
* **MySQL 8.0+** and **MongoDB 6+** (7 recommended – uses `$dateTrunc`) – *either* install locally *or* use Docker (below)

## 2. Quick start (≈ 3 minutes)

```bash
# 1) install dependencies
npm install

# 2) start the databases  (skip if you already run MySQL 8 + MongoDB locally)
docker compose up -d

# 3) configuration – .env.local is already provided and matches docker-compose.
#    If you use your own MySQL/MongoDB, edit .env.local (MYSQL_PASSWORD, MONGODB_URI ...)

# 4) create schema, triggers, procedures, views, sample data (MySQL) + telemetry (MongoDB)
npm run db:setup

# 5) run the app
npm run dev          # → http://localhost:3000
```

`npm run db:setup` is repeatable: it **drops and recreates** the `batterypassport` database and telemetry collection.
You can also run the pieces separately: `npm run db:mysql`, `npm run db:mongo`.

> **MySQL notes** – connect as `root` (or a user allowed to create functions/triggers). If binary logging is on and your user
> lacks SUPER, run `SET GLOBAL log_bin_trust_function_creators = 1;` once (docker-compose already does this).

### Demo accounts
| Username | Password | Role | Can do |
|---|---|---|---|
| `admin` | `Admin@123` | ADMIN | Everything, user management, rules & thresholds, deletes |
| `operator` | `Operator@123` | OPERATOR | Register batteries, install/remove, ownership, repairs, certificates, refurbishment, telemetry ingest |
| `assessor` | `Assessor@123` | ASSESSOR | Run second-life assessments, sync health summaries, acknowledge alerts |
| `recycler` | `Recycler@123` | RECYCLER | Record recycling + recovered materials |

All roles can view dashboards, passports, reports and search. Permissions are enforced **in the backend** (`lib/api.js` → `route(roles, handler)`), not only in the UI.

## 3. Suggested demo flow (10 min)
1. **Login as `admin`** → Dashboard (KPIs from MySQL + MongoDB telemetry).
2. **Batteries** → filter by status/SOH/chemistry, search; open `BP-CATL-NMC-0002` → *Overview* shows the trigger-generated timeline.
3. **Telemetry tab** → MongoDB aggregation (daily/hourly/raw); click *Simulate overheating* → alert appears under **Alerts** (MongoDB → MySQL).
4. Click **Sync health summary → MySQL** → new `health_record`; trigger updates battery SOH.
5. Login as **assessor** → open a removed battery → *Assessment & end of life* → **Run assessment** (stored procedure, explanation saved).
6. Login as **operator** → *Log refurbishment* / *Transfer ownership* / *Install* (transactions).
7. Login as **recycler** → open `BP-PANA-NCA-0006`… (or any REMOVED battery) → **Record recycling** with recovered materials. Try entering more recovered kg than input → rejected by trigger, whole transaction rolled back.
8. **Reports & Queries** → 11 SQL queries + 1 Mongo pipeline with the exact query text. **Search** → FULLTEXT (try “cooling”).
9. **Admin** → change a rule (e.g. `MIN_SOH_SECOND_LIFE`), save; audit log shows the change (trigger). Re-run an assessment.

## 4. Project structure
```
BatteryPassport/
├─ database/
│  ├─ mysql/  01_schema.sql  02_programmability.sql  03_seed.sql  04_queries.sql  05_ddl_demo_and_tests.sql
│  └─ mongo/  01_setup.js   (mongosh: validator, indexes, aggregation examples)
├─ scripts/   setup-mysql.js  seed-mongo.js
├─ lib/       db.js mongo.js session.js password.js api.js telemetry.js reports.js master.js client.js
├─ app/       pages (dashboard, batteries, alerts, assessments, recycling, reports, search, masterdata, admin, login)
│  └─ api/    REST route handlers
├─ components/  Shell, ui, LineChart, ActionForm
├─ middleware.js   edge guard – every route needs a valid session
└─ docs/      DOCUMENTATION.md  ER_diagram.png/.svg/.mmd  relational_schema.md  data_dictionary.md  TEST_CASES.md  REQUIREMENTS_CHECKLIST.md
```

## 5. Documentation
Open **`docs/DOCUMENTATION.md`** (full project report), **`docs/ER_diagram.png`**, `docs/relational_schema.md`,
`docs/data_dictionary.md`, `docs/TEST_CASES.md`, `docs/REQUIREMENTS_CHECKLIST.md` (maps every item of the course PDF to where it is in the project).
Regenerate the ER diagram / schema / dictionary after any schema change: `python3 docs/generate_docs.py` (needs Graphviz `dot`).

## 6. Troubleshooting
| Problem | Fix |
|---|---|
| `ECONNREFUSED 3306` / `27017` | Databases not running → `docker compose up -d`, wait ~20 s for MySQL |
| `Access denied for user` | Fix `MYSQL_USER` / `MYSQL_PASSWORD` in `.env.local` |
| `You do not have the SUPER privilege ... binary logging` | `SET GLOBAL log_bin_trust_function_creators = 1;` or use root |
| `$dateTrunc` unknown / aggregation error | MongoDB < 5.0 – use MongoDB 6/7 |
| Login loops back to `/login` | `JWT_SECRET` missing in `.env.local`; restart `npm run dev` |

## 7. Scope note
Telemetry is **simulated** (seed script and the *Simulate* buttons). Second-life results are rule-based decision support for this
project and are **not** a substitute for certified battery safety testing.
