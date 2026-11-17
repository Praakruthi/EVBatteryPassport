# Mapping to “DBMS Level 3 Project Requirements”

| # | Requirement (from the course PDF) | How BatteryPassport satisfies it | Where |
|---|---|---|---|
| 1 | Unique title, real-world problem, not simple CRUD | EV battery passport & second-life decision support; rule engine, traceability, mass balance | Whole project |
| 2 | 2-member team, clear responsibilities | Fill table in `DOCUMENTATION.md` §14; keep commits per member | docs |
| 3 | SQL (mandatory) + NoSQL or Vector | **MySQL + MongoDB** (Option 1) | `database/` |
| 4 | ER diagram → relational schema; entities, attributes, PK, FK, relationships, constraints; NoSQL data model, indexes, retrieval | `ER_diagram.png/svg/mmd`, `relational_schema.md`, `data_dictionary.md`; Mongo model/indexes/validator/retrieval | `docs/`, `DOCUMENTATION.md` §3, 4, 7.2 |
| 5 | DDL: CREATE, ALTER, DROP, PK/FK, constraints, indexes, views | 22 tables, ALTER examples, DROP DATABASE/TABLE, 14 indexes, 4 views | `01_schema.sql`, `02_programmability.sql`, `05_…sql` |
| 6 | DML (INSERT/UPDATE/DELETE/SELECT) + JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries | Seed data, app CRUD, 18 queries, 11 live reports | `03_seed.sql`, `04_queries.sql`, `/reports` |
| 7 | ≥ 4 advanced SQL concepts + 1 NoSQL/Vector | Transactions, procedures, functions, triggers, views, indexes, FULLTEXT, CTE/window functions (SQL) · Mongo aggregation + schema validation | `DOCUMENTATION.md` §7.1 |
| 8 | Vector DB (optional) | Not used; justified (data is numeric/relational time-series) | `DOCUMENTATION.md` §5 |
| 9 | Next.js web UI with forms, tables, search, filtering, dashboards | App Router pages: dashboard, batteries (filter/sort/paginate), passport, alerts, assessments, recycling, reports, search, master data, admin | `app/` |
| 10 | Backend/API layer; no hard-coded credentials; env variables | Route Handlers under `app/api`; `.env.local` / `.env.example`; `lib/db.js`, `lib/mongo.js` | `app/api`, `lib/` |
| 11 | Authentication in backend, ≥ 2 roles | JWT cookie + scrypt hashes, 4 roles (ADMIN/OPERATOR/ASSESSOR/RECYCLER), checks in `route(roles, fn)` and Edge middleware | `lib/api.js`, `lib/session.js`, `middleware.js` |
| 12 | Validation at DB level; consistency & integrity | CHECK/UNIQUE/FK/ENUM + triggers + transactions; 14 tests | `01_schema.sql`, `02_…sql`, `05_…sql` |
| 13 | Documentation (objectives … conclusion) | `DOCUMENTATION.md` (+ screenshots to be added) | `docs/` |
| 14 | Git/GitHub, per-member commits, README | `.gitignore`, README with setup/run; **initialise repo & commit per member** | root |
| 15 | Demonstration contents | ER, schema, implementation, queries, UI, integration, advanced features, test cases, contributions | README demo flow, `TEST_CASES.md` |
| 16 | Originality | Original design; no copied tutorial | — |
| 17 | Beyond CRUD; justified DB choices | Rule engine, triggers, procedures, cross-DB aggregation; justification table | `DOCUMENTATION.md` §5 |

## Git quick start
```bash
git init && git add . && git commit -m "Initial BatteryPassport project"
git branch -M main
git remote add origin https://github.com/<you>/batterypassport.git && git push -u origin main
```
(`.env.local` is git-ignored; `.env.example` is committed.)
