-- =====================================================================
-- BatteryPassport  |  MySQL 8.0  |  05_ddl_demo_and_tests.sql
-- Part A: ALTER / DROP / DML demonstrations (safe to run)
-- Part B: integrity tests - EACH statement below is EXPECTED TO FAIL.
--         Run them one at a time and note the error message for the report.
-- =====================================================================
USE batterypassport;

-- ---------------------------------------------------------------------
-- PART A: ALTER / DROP / INSERT / UPDATE / DELETE
-- ---------------------------------------------------------------------
CREATE TABLE temp_demo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(30) NOT NULL
);
ALTER TABLE temp_demo ADD COLUMN created_on DATE NULL;
ALTER TABLE temp_demo MODIFY COLUMN label VARCHAR(80) NOT NULL;
ALTER TABLE temp_demo ADD INDEX idx_temp_label (label);
ALTER TABLE temp_demo DROP INDEX idx_temp_label;
ALTER TABLE temp_demo RENAME COLUMN label TO title;
INSERT INTO temp_demo (title, created_on) VALUES ('first row', CURDATE()), ('second row', CURDATE());
UPDATE temp_demo SET title = 'renamed row' WHERE id = 2;
DELETE FROM temp_demo WHERE id = 1;
SELECT * FROM temp_demo;
DROP TABLE temp_demo;

-- Transaction with SAVEPOINT / ROLLBACK
START TRANSACTION;
UPDATE assessment_rule SET rule_value = 65 WHERE rule_key = 'MIN_SOH_SECOND_LIFE';
SAVEPOINT after_rule_change;
UPDATE assessment_rule SET rule_value = 0 WHERE rule_key = 'MAX_REPAIRS';
ROLLBACK TO SAVEPOINT after_rule_change;
SELECT rule_key, rule_value FROM assessment_rule;   -- MIN_SOH=65, MAX_REPAIRS unchanged
ROLLBACK;                                           -- everything undone
SELECT rule_key, rule_value FROM assessment_rule;   -- original values

-- ---------------------------------------------------------------------
-- PART B: integrity tests (expected errors)
-- ---------------------------------------------------------------------

-- T1. UNIQUE: duplicate serial number                       -> ERROR 1062
INSERT INTO battery (serial_number, model_id, manufacture_date) VALUES ('BP-CATL-NMC-0001', 1, '2024-01-01');

-- T2. CHECK: SOH out of range                               -> ERROR 3819
UPDATE battery SET current_soh_pct = 120 WHERE battery_id = 1;

-- T3. CHECK: serial number format                           -> ERROR 3819
INSERT INTO battery (serial_number, model_id, manufacture_date) VALUES ('bad serial!', 1, '2024-01-01');

-- T4. FK: unknown model                                     -> ERROR 1452
INSERT INTO battery (serial_number, model_id, manufacture_date) VALUES ('BP-TEST-0001', 999, '2024-01-01');

-- T5. TRIGGER: manufacture date in the future               -> ERROR 1644
INSERT INTO battery (serial_number, model_id, manufacture_date) VALUES ('BP-TEST-0002', 1, '2099-01-01');

-- T6. TRIGGER: install a battery that is already installed  -> ERROR 1644
CALL sp_install_battery(1, 11, CURDATE(), 0);

-- T7. TRIGGER: vehicle already has an active battery        -> ERROR 1644
CALL sp_install_battery(11, 5, CURDATE(), 0);

-- T8. TRIGGER: recycle a battery installed in a vehicle     -> ERROR 1644
CALL sp_record_recycling(1, 6, CURDATE(), 'HYDROMETALLURGICAL', 300, 'test', NULL);

-- T9. TRIGGER: recovered material heavier than input        -> ERROR 1644 (whole transaction rolled back)
CALL sp_record_recycling(2, 6, CURDATE(), 'HYDROMETALLURGICAL', 10, 'test',
  '[{"material_id":3,"quantity_kg":50,"purity_pct":90}]');
SELECT COUNT(*) AS should_be_zero FROM recycling_record WHERE battery_id = 2;

-- T10. TRIGGER: recycled battery is terminal                -> ERROR 1644
UPDATE battery SET status = 'IN_SERVICE' WHERE serial_number = 'BP-LGES-E78-0004';

-- T11. PROCEDURE rule: cannot assess a battery still in service -> ERROR 1644
CALL sp_assess_second_life(1, 3, NULL);

-- T12. FK RESTRICT: cannot delete a battery that has history -> ERROR 1451
DELETE FROM battery WHERE battery_id = 2;

-- T13. CHECK: removal date before install date              -> ERROR 3819
UPDATE installation SET removed_on = '2000-01-01' WHERE installation_id = 1;

-- T14. CHECK: refurbishment completed without SOH after      -> ERROR 3819
INSERT INTO refurbishment_record (battery_id, refurbisher_id, start_date, work_done, soh_before, outcome)
VALUES (3, 5, CURDATE(), 'test', 82, 'REUSED_STATIONARY');
