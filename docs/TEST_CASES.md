# Test cases

Record the real outcome (Pass/Fail + date) in the last column when you run them. Demo accounts: see README.

## A. Database-level integrity tests (`database/mysql/05_ddl_demo_and_tests.sql`, Part B)
Each statement is **expected to fail**.

| ID | Rule tested | Statement (summary) | Expected | Result |
|---|---|---|---|---|
| DB-01 | UNIQUE serial | insert battery with existing serial | ERROR 1062 Duplicate entry | |
| DB-02 | CHECK SOH range | `UPDATE battery SET current_soh_pct = 120` | ERROR 3819 `chk_battery_soh` | |
| DB-03 | CHECK serial format | serial `'bad serial!'` | ERROR 3819 `chk_battery_serial` | |
| DB-04 | FK model | `model_id = 999` | ERROR 1452 | |
| DB-05 | Trigger – future date | manufacture date 2099 | "Manufacture date cannot be in the future" | |
| DB-06 | Trigger – double installation | `CALL sp_install_battery(1, 11, …)` | "already installed" | |
| DB-07 | Trigger – occupied vehicle | `CALL sp_install_battery(11, 5, …)` | "Vehicle already has an active battery" | |
| DB-08 | Trigger – recycle in-service battery | `CALL sp_record_recycling(1, …)` | "installed in a vehicle cannot be recycled" | |
| DB-09 | Trigger + transaction rollback | recovered 50 kg from 10 kg input | "Recovered material exceeds…", 0 rows in `recycling_record` | |
| DB-10 | Trigger – terminal status | set recycled battery IN_SERVICE | "recycled battery is end-of-life" | |
| DB-11 | Procedure rule | assess a battery that is in service | "Only batteries removed from service…" | |
| DB-12 | FK RESTRICT | delete battery that has history | ERROR 1451 | |
| DB-13 | CHECK dates | removal date before install date | ERROR 3819 `chk_inst_dates` | |
| DB-14 | CHECK outcome | refurbishment REUSED without SOH-after | ERROR 3819 `chk_refurb_outcome` | |
| DB-15 | MongoDB validator | insert reading with `temperature_c: 500` (see `01_setup.js`, A5) | "Document failed validation" | |

## B. Application tests

| ID | Area | Steps | Expected | Result |
|---|---|---|---|---|
| APP-01 | Auth | Open `/` without logging in | Redirect to `/login` | |
| APP-02 | Auth | Log in with wrong password | "Invalid username or password" | |
| APP-03 | Auth | Log in as `admin` | Dashboard shown, sidebar shows *Admin* | |
| APP-04 | API protection | `curl http://localhost:3000/api/batteries` (no cookie) | HTTP 401 JSON | |
| APP-05 | RBAC (backend) | As `recycler`, `POST /api/batteries/1/actions` with `{"action":"repair",…}` | HTTP 403 | |
| APP-06 | RBAC (UI) | As `assessor`, open a passport | Only the *Run assessment* control, no install/repair forms | |
| APP-07 | Admin only | As `operator` open `/admin` | "Administrator access required" | |
| APP-08 | Filtering | Batteries → status = REMOVED, SOH max = 75 | Only matching rows; count updates | |
| APP-09 | Search | Search page: "cool" (prefix match) | Repair notes of batteries 3 (coolant pump) and 6 (cooling plate), relevance-ordered | |
| APP-10 | Registration transaction | As `operator` register a battery with duplicate serial and a certificate | Error shown; no partial battery/owner/certificate rows | |
| APP-11 | Registration | Register `BP-TEST-0100` with owner + certificate | Passport opens; timeline shows MANUFACTURED, OWNERSHIP, CERTIFIED | |
| APP-12 | Install / remove | Install the new battery in a free vehicle, then remove it | Status IN_SERVICE → REMOVED; timeline events added by triggers | |
| APP-13 | Occupied vehicle | Try to install in a vehicle already holding a battery | Vehicle not offered / DB error shown | |
| APP-14 | Ownership | Transfer ownership of battery 1 twice to the same stakeholder | Second attempt rejected ("already owns") | |
| APP-15 | Telemetry aggregation | Battery 1 → Telemetry → Daily / Hourly / Raw | Charts + table change; counts match | |
| APP-16 | Alerts | *Simulate overheating* (operator) then open **Alerts** | New OPEN temperature alert(s) | |
| APP-17 | Health sync | *Sync health summary → MySQL* | New `health_record`; passport SOH/cycles refreshed; repeated click returns duplicate error | |
| APP-18 | Assessment | As `assessor` run assessment on battery 6 | REFURBISH_FIRST – peak temperature 63 °C exceeds 60 °C | |
| APP-19 | Rule change | As `admin` set `MAX_PEAK_TEMP_C` = 65, re-assess battery 6 | SECOND_LIFE_ELIGIBLE; audit log shows rule change | |
| APP-20 | Recycling | As `recycler` recycle battery 10 with recovered materials | Status RECYCLED, event + materials shown, dashboard totals updated | |
| APP-21 | Mass balance | Recycle another battery with recovered kg > input kg | Rejected; no recycling row created (rollback) | |
| APP-22 | Reports | Open **Reports & Queries** | 11 SQL results + Mongo aggregation, query text expandable | |
