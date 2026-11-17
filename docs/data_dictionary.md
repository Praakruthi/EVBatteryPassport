# Data dictionary (MySQL)

22 tables. Key: PK primary key, FK foreign key, U unique.

## Master / reference data

### `manufacturer`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| manufacturer_id | `INT UNSIGNED` | NO | PK | auto-increment |
| name | `VARCHAR(100)` | NO | U |  |
| country | `VARCHAR(60)` | NO |  |  |
| contact_email | `VARCHAR(120)` | YES |  |  |
| created_at | `TIMESTAMP` | NO |  | default CURRENT_TIMESTAMP |

Constraints & indexes:
- CHECK `chk_manufacturer_email`: `contact_email IS NULL OR contact_email LIKE '%_@_%._%'`

### `battery_model`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| model_id | `INT UNSIGNED` | NO | PK | auto-increment |
| manufacturer_id | `INT UNSIGNED` | NO | FK → manufacturer |  |
| model_name | `VARCHAR(100)` | NO |  |  |
| chemistry | `ENUM('LFP','NMC','NCA','LTO','LMO')` | NO |  |  |
| nominal_capacity_kwh | `DECIMAL(7,2)` | NO |  |  |
| nominal_voltage_v | `DECIMAL(6,1)` | NO |  |  |
| weight_kg | `DECIMAL(7,2)` | YES |  |  |
| rated_cycle_life | `INT UNSIGNED` | NO |  | default 1500 |

Constraints & indexes:
- UNIQUE (manufacturer_id, model_name)
- CHECK `chk_model_capacity`: `nominal_capacity_kwh > 0`
- CHECK `chk_model_voltage`: `nominal_voltage_v > 0`
- CHECK `chk_model_weight`: `weight_kg IS NULL OR weight_kg > 0`
- CHECK `chk_model_cycle_life`: `rated_cycle_life > 0`

### `stakeholder`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| stakeholder_id | `INT UNSIGNED` | NO | PK | auto-increment |
| name | `VARCHAR(120)` | NO | U |  |
| type | `ENUM('MANUFACTURER','OWNER','FLEET_OPERATOR','SERVICE_CENTER','REFURBISHER','RECYCLER','STORAGE_OPERATOR')` | NO |  |  |
| email | `VARCHAR(120)` | YES |  |  |
| phone | `VARCHAR(20)` | YES |  |  |
| address | `VARCHAR(200)` | YES |  |  |

Constraints & indexes:
- CHECK `chk_stakeholder_email`: `email IS NULL OR email LIKE '%_@_%._%'`
- CHECK `chk_stakeholder_phone`: `phone IS NULL OR phone REGEXP '^[0-9+() -]{7,20}$'`

### `vehicle`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| vehicle_id | `INT UNSIGNED` | NO | PK | auto-increment |
| vin | `CHAR(17)` | NO | U |  |
| make | `VARCHAR(60)` | NO |  |  |
| model | `VARCHAR(60)` | NO |  |  |
| model_year | `SMALLINT UNSIGNED` | NO |  |  |
| registration_no | `VARCHAR(20)` | YES | U |  |

Constraints & indexes:
- CHECK `chk_vehicle_year`: `model_year BETWEEN 2005 AND 2100`

### `material`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| material_id | `INT UNSIGNED` | NO | PK | auto-increment |
| name | `VARCHAR(60)` | NO | U |  |
| symbol | `VARCHAR(5)` | NO | U |  |
| is_critical | `TINYINT(1)` | NO |  | default 0 |

### `model_material`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| model_id | `INT UNSIGNED` | NO | PK, FK → battery_model |  |
| material_id | `INT UNSIGNED` | NO | PK, FK → material |  |
| content_kg | `DECIMAL(8,3)` | NO |  |  |

Constraints & indexes:
- CHECK `chk_mm_content`: `content_kg > 0`

## Battery passport core

### `battery`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| battery_id | `INT UNSIGNED` | NO | PK | auto-increment |
| serial_number | `VARCHAR(40)` | NO | U |  |
| model_id | `INT UNSIGNED` | NO | FK → battery_model |  |
| manufacture_date | `DATE` | NO |  |  |
| status | `ENUM('MANUFACTURED','IN_SERVICE','REMOVED','REFURBISHED','SECOND_LIFE','RECYCLED')` | NO |  | default 'MANUFACTURED' |
| current_soh_pct | `DECIMAL(5,2)` | NO |  | default 100.00 |
| total_cycles | `INT UNSIGNED` | NO |  | default 0 |
| registered_by | `INT UNSIGNED` | YES | FK → app_user |  |
| created_at | `TIMESTAMP` | NO |  | default CURRENT_TIMESTAMP |
| updated_at | `TIMESTAMP` | NO |  | default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

Constraints & indexes:
- CHECK `chk_battery_soh`: `current_soh_pct BETWEEN 0 AND 100`
- CHECK `chk_battery_serial`: `serial_number REGEXP '^[A-Za-z0-9-]{6,40}$'`
- B-TREE index `idx_battery_status` on (status)
- B-TREE index `idx_battery_model` on (model_id)
- B-TREE index `idx_battery_soh` on (current_soh_pct)

### `battery_certification`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| cert_id | `INT UNSIGNED` | NO | PK | auto-increment |
| battery_id | `INT UNSIGNED` | NO | FK → battery |  |
| cert_name | `VARCHAR(80)` | NO |  |  |
| issuing_body | `VARCHAR(100)` | NO |  |  |
| certificate_no | `VARCHAR(60)` | NO | U |  |
| issued_on | `DATE` | NO |  |  |
| expires_on | `DATE` | YES |  |  |

Constraints & indexes:
- CHECK `chk_cert_dates`: `expires_on IS NULL OR expires_on > issued_on`

## Lifecycle history

### `installation`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| installation_id | `INT UNSIGNED` | NO | PK | auto-increment |
| battery_id | `INT UNSIGNED` | NO | FK → battery |  |
| vehicle_id | `INT UNSIGNED` | NO | FK → vehicle |  |
| installed_on | `DATE` | NO |  |  |
| removed_on | `DATE` | YES |  |  |
| odometer_at_install_km | `INT UNSIGNED` | NO |  | default 0 |
| odometer_at_removal_km | `INT UNSIGNED` | YES |  |  |
| removal_reason | `VARCHAR(200)` | YES |  |  |

Constraints & indexes:
- CHECK `chk_inst_dates`: `removed_on IS NULL OR removed_on >= installed_on`
- CHECK `chk_inst_odometer`: `odometer_at_removal_km IS NULL OR odometer_at_removal_km >= odometer_at_install_km`
- B-TREE index `idx_inst_battery_open` on (battery_id, removed_on)
- B-TREE index `idx_inst_vehicle_open` on (vehicle_id, removed_on)

### `ownership_record`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| ownership_id | `INT UNSIGNED` | NO | PK | auto-increment |
| battery_id | `INT UNSIGNED` | NO | FK → battery |  |
| stakeholder_id | `INT UNSIGNED` | NO | FK → stakeholder |  |
| from_date | `DATE` | NO |  |  |
| to_date | `DATE` | YES |  |  |
| transfer_reason | `VARCHAR(200)` | YES |  |  |

Constraints & indexes:
- CHECK `chk_own_dates`: `to_date IS NULL OR to_date >= from_date`
- B-TREE index `idx_own_battery_open` on (battery_id, to_date)

### `repair_record`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| repair_id | `INT UNSIGNED` | NO | PK | auto-increment |
| battery_id | `INT UNSIGNED` | NO | FK → battery |  |
| service_stakeholder_id | `INT UNSIGNED` | NO | FK → stakeholder |  |
| repair_date | `DATE` | NO |  |  |
| repair_type | `ENUM('CELL_REPLACEMENT','MODULE_REPLACEMENT','BMS_UPDATE','COOLING_SYSTEM','CONNECTOR_REPAIR','OTHER')` | NO |  |  |
| description | `TEXT` | NO |  |  |
| cost | `DECIMAL(10,2)` | NO |  | default 0.00 |
| cells_replaced | `INT UNSIGNED` | NO |  | default 0 |

Constraints & indexes:
- CHECK `chk_repair_cost`: `cost >= 0`
- B-TREE index `idx_repair_battery` on (battery_id, repair_date)
- FULLTEXT index `ftx_repair_description` on (description)

### `health_record`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| health_id | `INT UNSIGNED` | NO | PK | auto-increment |
| battery_id | `INT UNSIGNED` | NO | FK → battery |  |
| recorded_at | `DATETIME` | NO |  |  |
| soh_pct | `DECIMAL(5,2)` | NO |  |  |
| cycle_count | `INT UNSIGNED` | NO |  |  |
| avg_temp_c | `DECIMAL(5,2)` | YES |  |  |
| max_temp_c | `DECIMAL(5,2)` | YES |  |  |
| source | `ENUM('TELEMETRY_SUMMARY','LAB_TEST','SERVICE_CHECK')` | NO |  | default 'TELEMETRY_SUMMARY' |

Constraints & indexes:
- UNIQUE (battery_id, recorded_at, source)
- CHECK `chk_health_soh`: `soh_pct BETWEEN 0 AND 100`
- CHECK `chk_health_temp`: `max_temp_c IS NULL OR avg_temp_c IS NULL OR max_temp_c >= avg_temp_c`
- B-TREE index `idx_health_battery_time` on (battery_id, recorded_at)

### `lifecycle_event`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| event_id | `BIGINT UNSIGNED` | NO | PK | auto-increment |
| battery_id | `INT UNSIGNED` | NO | FK → battery |  |
| event_type | `ENUM('MANUFACTURED','INSTALLED','REMOVED','OWNERSHIP_TRANSFER','REPAIR','CERTIFIED','ASSESSED','REFURBISHED','REUSED','RECYCLED')` | NO |  |  |
| event_time | `DATETIME` | NO |  |  |
| description | `VARCHAR(300)` | NO |  |  |

Constraints & indexes:
- B-TREE index `idx_event_battery_time` on (battery_id, event_time)

## Assessment & end of life

### `second_life_assessment`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| assessment_id | `INT UNSIGNED` | NO | PK | auto-increment |
| battery_id | `INT UNSIGNED` | NO | FK → battery |  |
| assessed_by | `INT UNSIGNED` | NO | FK → app_user |  |
| assessed_on | `DATETIME` | NO |  | default CURRENT_TIMESTAMP |
| soh_pct | `DECIMAL(5,2)` | NO |  |  |
| cycle_count | `INT UNSIGNED` | NO |  |  |
| max_temp_c | `DECIMAL(5,2)` | YES |  |  |
| repair_count | `INT UNSIGNED` | NO |  |  |
| score | `DECIMAL(5,2)` | NO |  |  |
| decision | `ENUM('SECOND_LIFE_ELIGIBLE','REFURBISH_FIRST','RECYCLE')` | NO |  |  |
| explanation | `TEXT` | NO |  |  |
| rules_used | `JSON` | YES |  |  |

Constraints & indexes:
- CHECK `chk_assess_score`: `score BETWEEN 0 AND 100`
- B-TREE index `idx_assess_battery` on (battery_id, assessed_on)
- FULLTEXT index `ftx_assess_explanation` on (explanation)

### `refurbishment_record`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| refurb_id | `INT UNSIGNED` | NO | PK | auto-increment |
| battery_id | `INT UNSIGNED` | NO | FK → battery |  |
| refurbisher_id | `INT UNSIGNED` | NO | FK → stakeholder |  |
| start_date | `DATE` | NO |  |  |
| end_date | `DATE` | YES |  |  |
| work_done | `TEXT` | NO |  |  |
| soh_before | `DECIMAL(5,2)` | NO |  |  |
| soh_after | `DECIMAL(5,2)` | YES |  |  |
| outcome | `ENUM('IN_PROGRESS','REUSED_STATIONARY','REUSED_VEHICLE','FAILED')` | NO |  | default 'IN_PROGRESS' |
| reuse_application | `VARCHAR(120)` | YES |  |  |
| cost | `DECIMAL(10,2)` | NO |  | default 0.00 |

Constraints & indexes:
- CHECK `chk_refurb_dates`: `end_date IS NULL OR end_date >= start_date`
- CHECK `chk_refurb_soh`: `soh_before BETWEEN 0 AND 100 AND (soh_after IS NULL OR soh_after BETWEEN 0 AND 100)`
- CHECK `chk_refurb_cost`: `cost >= 0`
- CHECK `chk_refurb_outcome`: `outcome IN ('IN_PROGRESS','FAILED') OR soh_after IS NOT NULL`
- FULLTEXT index `ftx_refurb_work` on (work_done)

### `recycling_record`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| recycling_id | `INT UNSIGNED` | NO | PK | auto-increment |
| battery_id | `INT UNSIGNED` | NO | FK → battery, U |  |
| recycler_id | `INT UNSIGNED` | NO | FK → stakeholder |  |
| recycled_on | `DATE` | NO |  |  |
| method | `ENUM('HYDROMETALLURGICAL','PYROMETALLURGICAL','DIRECT_RECYCLING')` | NO |  |  |
| total_input_kg | `DECIMAL(8,2)` | NO |  |  |
| notes | `VARCHAR(300)` | YES |  |  |

Constraints & indexes:
- CHECK `chk_recycle_input`: `total_input_kg > 0`

### `recovered_material`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| recovery_id | `INT UNSIGNED` | NO | PK | auto-increment |
| recycling_id | `INT UNSIGNED` | NO | FK → recycling_record |  |
| material_id | `INT UNSIGNED` | NO | FK → material |  |
| quantity_kg | `DECIMAL(10,3)` | NO |  |  |
| purity_pct | `DECIMAL(5,2)` | NO |  | default 90.00 |

Constraints & indexes:
- UNIQUE (recycling_id, material_id)
- CHECK `chk_recovered_qty`: `quantity_kg > 0`
- CHECK `chk_recovered_purity`: `purity_pct BETWEEN 0 AND 100`

## Monitoring configuration / audit

### `telemetry_threshold`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| metric | `ENUM('temperature_c','voltage_v','current_a','soc_pct','soh_pct')` | NO | PK |  |
| min_value | `DECIMAL(8,2)` | YES |  |  |
| max_value | `DECIMAL(8,2)` | YES |  |  |

Constraints & indexes:
- CHECK `chk_threshold_range`: `min_value IS NULL OR max_value IS NULL OR min_value <= max_value`

### `battery_alert`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| alert_id | `INT UNSIGNED` | NO | PK | auto-increment |
| battery_id | `INT UNSIGNED` | NO | FK → battery |  |
| metric | `ENUM('temperature_c','voltage_v','current_a','soc_pct','soh_pct')` | NO | FK → telemetry_threshold |  |
| observed_value | `DECIMAL(10,2)` | NO |  |  |
| limit_value | `DECIMAL(10,2)` | NO |  |  |
| direction | `ENUM('ABOVE_MAX','BELOW_MIN')` | NO |  |  |
| recorded_at | `DATETIME` | NO |  |  |
| status | `ENUM('OPEN','ACKNOWLEDGED')` | NO |  | default 'OPEN' |
| acknowledged_by | `INT UNSIGNED` | YES | FK → app_user |  |
| created_at | `TIMESTAMP` | NO |  | default CURRENT_TIMESTAMP |
| note | `VARCHAR(200)` | YES |  |  |

Constraints & indexes:
- UNIQUE (battery_id, metric, recorded_at)
- B-TREE index `idx_alert_status` on (status, recorded_at)

### `assessment_rule`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| rule_key | `VARCHAR(50)` | NO | PK |  |
| rule_value | `DECIMAL(10,2)` | NO |  |  |
| description | `VARCHAR(200)` | NO |  |  |
| updated_at | `TIMESTAMP` | NO |  | default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

Constraints & indexes:
- CHECK `chk_rule_value`: `rule_value >= 0`

### `audit_log`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| log_id | `BIGINT UNSIGNED` | NO | PK | auto-increment |
| table_name | `VARCHAR(40)` | NO |  |  |
| record_id | `VARCHAR(60)` | NO |  |  |
| action | `VARCHAR(30)` | NO |  |  |
| old_value | `VARCHAR(255)` | YES |  |  |
| new_value | `VARCHAR(255)` | YES |  |  |
| changed_at | `TIMESTAMP` | NO |  | default CURRENT_TIMESTAMP |

## Access control

### `app_user`

| Column | Type | Null | Key | Default / notes |
|---|---|---|---|---|
| user_id | `INT UNSIGNED` | NO | PK | auto-increment |
| username | `VARCHAR(40)` | NO | U |  |
| email | `VARCHAR(120)` | NO | U |  |
| password_hash | `VARCHAR(255)` | NO |  |  |
| role | `ENUM('ADMIN','OPERATOR','ASSESSOR','RECYCLER')` | NO |  |  |
| stakeholder_id | `INT UNSIGNED` | YES | FK → stakeholder |  |
| is_active | `TINYINT(1)` | NO |  | default 1 |
| created_at | `TIMESTAMP` | NO |  | default CURRENT_TIMESTAMP |
| last_login | `DATETIME` | YES |  |  |

Constraints & indexes:
- CHECK `chk_user_username`: `CHAR_LENGTH(username) >= 3`
- CHECK `chk_user_email`: `email LIKE '%_@_%._%'`
