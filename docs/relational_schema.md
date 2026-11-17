# Relational schema (MySQL)

Notation: **PK attributes in bold**, *foreign keys in italics* with `→ referenced table(column)`; `[U]` = UNIQUE; `[N]` = nullable.
The schema has 22 relations. All are in BCNF/3NF: every non-key attribute depends on the key, the whole key, and nothing but the key (e.g. owner names live only in `stakeholder`; lifecycle facts live in their own relation keyed by `battery_id`).

## Master / reference data

**MANUFACTURER** ( **manufacturer_id**, name [U], country, contact_email [N], created_at )


**BATTERY_MODEL** ( **model_id**, *manufacturer_id*, model_name, chemistry, nominal_capacity_kwh, nominal_voltage_v, weight_kg [N], rated_cycle_life )

- FK `manufacturer_id` → `manufacturer(manufacturer_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- UNIQUE `(manufacturer_id, model_name)`

**STAKEHOLDER** ( **stakeholder_id**, name [U], type, email [N], phone [N], address [N] )


**VEHICLE** ( **vehicle_id**, vin [U], make, model, model_year, registration_no [U] [N] )


**MATERIAL** ( **material_id**, name [U], symbol [U], is_critical )


**MODEL_MATERIAL** ( **model_id**, **material_id**, content_kg )

- FK `model_id` → `battery_model(model_id)` ON DELETE CASCADE ON UPDATE CASCADE
- FK `material_id` → `material(material_id)` ON DELETE RESTRICT ON UPDATE CASCADE

## Battery passport core

**BATTERY** ( **battery_id**, serial_number [U], *model_id*, manufacture_date, status, current_soh_pct, total_cycles, *registered_by* [N], created_at, updated_at )

- FK `model_id` → `battery_model(model_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- FK `registered_by` → `app_user(user_id)` ON DELETE SET NULL ON UPDATE CASCADE

**BATTERY_CERTIFICATION** ( **cert_id**, *battery_id*, cert_name, issuing_body, certificate_no [U], issued_on, expires_on [N] )

- FK `battery_id` → `battery(battery_id)` ON DELETE RESTRICT ON UPDATE CASCADE

## Lifecycle history

**INSTALLATION** ( **installation_id**, *battery_id*, *vehicle_id*, installed_on, removed_on [N], odometer_at_install_km, odometer_at_removal_km [N], removal_reason [N] )

- FK `battery_id` → `battery(battery_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- FK `vehicle_id` → `vehicle(vehicle_id)` ON DELETE RESTRICT ON UPDATE CASCADE

**OWNERSHIP_RECORD** ( **ownership_id**, *battery_id*, *stakeholder_id*, from_date, to_date [N], transfer_reason [N] )

- FK `battery_id` → `battery(battery_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- FK `stakeholder_id` → `stakeholder(stakeholder_id)` ON DELETE RESTRICT ON UPDATE CASCADE

**REPAIR_RECORD** ( **repair_id**, *battery_id*, *service_stakeholder_id*, repair_date, repair_type, description, cost, cells_replaced )

- FK `battery_id` → `battery(battery_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- FK `service_stakeholder_id` → `stakeholder(stakeholder_id)` ON DELETE RESTRICT ON UPDATE CASCADE

**HEALTH_RECORD** ( **health_id**, *battery_id*, recorded_at, soh_pct, cycle_count, avg_temp_c [N], max_temp_c [N], source )

- FK `battery_id` → `battery(battery_id)` ON DELETE CASCADE ON UPDATE CASCADE
- UNIQUE `(battery_id, recorded_at, source)`

**LIFECYCLE_EVENT** ( **event_id**, *battery_id*, event_type, event_time, description )

- FK `battery_id` → `battery(battery_id)` ON DELETE CASCADE ON UPDATE CASCADE

## Assessment & end of life

**SECOND_LIFE_ASSESSMENT** ( **assessment_id**, *battery_id*, *assessed_by*, assessed_on, soh_pct, cycle_count, max_temp_c [N], repair_count, score, decision, explanation, rules_used [N] )

- FK `battery_id` → `battery(battery_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- FK `assessed_by` → `app_user(user_id)` ON DELETE RESTRICT ON UPDATE CASCADE

**REFURBISHMENT_RECORD** ( **refurb_id**, *battery_id*, *refurbisher_id*, start_date, end_date [N], work_done, soh_before, soh_after [N], outcome, reuse_application [N], cost )

- FK `battery_id` → `battery(battery_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- FK `refurbisher_id` → `stakeholder(stakeholder_id)` ON DELETE RESTRICT ON UPDATE CASCADE

**RECYCLING_RECORD** ( **recycling_id**, *battery_id* [U], *recycler_id*, recycled_on, method, total_input_kg, notes [N] )

- FK `battery_id` → `battery(battery_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- FK `recycler_id` → `stakeholder(stakeholder_id)` ON DELETE RESTRICT ON UPDATE CASCADE

**RECOVERED_MATERIAL** ( **recovery_id**, *recycling_id*, *material_id*, quantity_kg, purity_pct )

- FK `recycling_id` → `recycling_record(recycling_id)` ON DELETE CASCADE ON UPDATE CASCADE
- FK `material_id` → `material(material_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- UNIQUE `(recycling_id, material_id)`

## Monitoring configuration / audit

**TELEMETRY_THRESHOLD** ( **metric**, min_value [N], max_value [N] )


**BATTERY_ALERT** ( **alert_id**, *battery_id*, *metric*, observed_value, limit_value, direction, recorded_at, status, *acknowledged_by* [N], created_at, note [N] )

- FK `battery_id` → `battery(battery_id)` ON DELETE CASCADE ON UPDATE CASCADE
- FK `metric` → `telemetry_threshold(metric)` ON DELETE RESTRICT ON UPDATE CASCADE
- FK `acknowledged_by` → `app_user(user_id)` ON DELETE SET NULL ON UPDATE CASCADE
- UNIQUE `(battery_id, metric, recorded_at)`

**ASSESSMENT_RULE** ( **rule_key**, rule_value, description, updated_at )


**AUDIT_LOG** ( **log_id**, table_name, record_id, action, old_value [N], new_value [N], changed_at )


## Access control

**APP_USER** ( **user_id**, username [U], email [U], password_hash, role, *stakeholder_id* [N], is_active, created_at, last_login [N] )

- FK `stakeholder_id` → `stakeholder(stakeholder_id)` ON DELETE SET NULL ON UPDATE CASCADE
