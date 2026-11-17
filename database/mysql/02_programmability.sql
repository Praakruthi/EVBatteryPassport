-- =====================================================================
-- BatteryPassport  |  MySQL 8.0  |  02_programmability.sql
-- Stored functions, stored procedures (with transactions),
-- triggers and views.
-- Run with the mysql client or via:  npm run db:mysql
-- =====================================================================
USE batterypassport;

DELIMITER $$

-- =====================================================================
-- STORED FUNCTIONS
-- =====================================================================

CREATE FUNCTION fn_get_rule(p_key VARCHAR(50)) RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
  DECLARE v_val DECIMAL(10,2);
  SELECT rule_value INTO v_val FROM assessment_rule WHERE rule_key = p_key;
  IF v_val IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Assessment rule is not configured';
  END IF;
  RETURN v_val;
END$$

CREATE FUNCTION fn_health_grade(p_soh DECIMAL(5,2)) RETURNS CHAR(1)
DETERMINISTIC
BEGIN
  RETURN CASE
    WHEN p_soh >= 90 THEN 'A'
    WHEN p_soh >= 80 THEN 'B'
    WHEN p_soh >= 70 THEN 'C'
    WHEN p_soh >= 50 THEN 'D'
    ELSE 'E'
  END;
END$$

CREATE FUNCTION fn_battery_age_months(p_battery_id INT UNSIGNED) RETURNS INT
READS SQL DATA
BEGIN
  DECLARE v_months INT;
  SELECT TIMESTAMPDIFF(MONTH, manufacture_date, CURDATE()) INTO v_months
  FROM battery WHERE battery_id = p_battery_id;
  RETURN v_months;
END$$

CREATE FUNCTION fn_cycle_life_used_pct(p_battery_id INT UNSIGNED) RETURNS DECIMAL(6,2)
READS SQL DATA
BEGIN
  DECLARE v_pct DECIMAL(6,2);
  SELECT ROUND(100 * b.total_cycles / bm.rated_cycle_life, 2) INTO v_pct
  FROM battery b JOIN battery_model bm ON bm.model_id = b.model_id
  WHERE b.battery_id = p_battery_id;
  RETURN v_pct;
END$$

-- =====================================================================
-- TRIGGERS  (integrity rules, automatic traceability, audit trail)
-- =====================================================================

-- ---- battery -------------------------------------------------------
CREATE TRIGGER trg_battery_bi BEFORE INSERT ON battery FOR EACH ROW
BEGIN
  IF NEW.manufacture_date > CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Manufacture date cannot be in the future';
  END IF;
END$$

CREATE TRIGGER trg_battery_ai AFTER INSERT ON battery FOR EACH ROW
BEGIN
  INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
  VALUES (NEW.battery_id, 'MANUFACTURED', NEW.manufacture_date,
          CONCAT('Battery ', NEW.serial_number, ' manufactured and registered in the passport'));
END$$

CREATE TRIGGER trg_battery_bu BEFORE UPDATE ON battery FOR EACH ROW
BEGIN
  IF OLD.status = 'RECYCLED' AND NEW.status <> 'RECYCLED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A recycled battery is end-of-life; its status cannot change';
  END IF;
END$$

CREATE TRIGGER trg_battery_au AFTER UPDATE ON battery FOR EACH ROW
BEGIN
  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT INTO audit_log (table_name, record_id, action, old_value, new_value)
    VALUES ('battery', NEW.battery_id, 'STATUS_CHANGE', OLD.status, NEW.status);
  END IF;
END$$

-- ---- installation ----------------------------------------------------
CREATE TRIGGER trg_installation_bi BEFORE INSERT ON installation FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_open INT;
  SELECT status INTO v_status FROM battery WHERE battery_id = NEW.battery_id;
  IF v_status = 'RECYCLED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A recycled battery cannot be installed in a vehicle';
  END IF;
  SELECT COUNT(*) INTO v_open FROM installation
   WHERE battery_id = NEW.battery_id AND removed_on IS NULL;
  IF v_open > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Battery is already installed in a vehicle; remove it first';
  END IF;
  IF NEW.removed_on IS NULL THEN
    SELECT COUNT(*) INTO v_open FROM installation
     WHERE vehicle_id = NEW.vehicle_id AND removed_on IS NULL;
    IF v_open > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vehicle already has an active battery installed';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_installation_ai AFTER INSERT ON installation FOR EACH ROW
BEGIN
  DECLARE v_vin CHAR(17);
  SELECT vin INTO v_vin FROM vehicle WHERE vehicle_id = NEW.vehicle_id;
  INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
  VALUES (NEW.battery_id, 'INSTALLED', NEW.installed_on,
          CONCAT('Installed in vehicle ', v_vin, ' at ', NEW.odometer_at_install_km, ' km'));
  IF NEW.removed_on IS NULL THEN
    UPDATE battery SET status = 'IN_SERVICE' WHERE battery_id = NEW.battery_id;
  ELSE
    INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
    VALUES (NEW.battery_id, 'REMOVED', NEW.removed_on,
            CONCAT('Removed from vehicle ', v_vin, ': ', COALESCE(NEW.removal_reason, 'no reason recorded')));
    UPDATE battery SET status = 'REMOVED' WHERE battery_id = NEW.battery_id;
  END IF;
END$$

CREATE TRIGGER trg_installation_au AFTER UPDATE ON installation FOR EACH ROW
BEGIN
  DECLARE v_vin CHAR(17);
  IF OLD.removed_on IS NULL AND NEW.removed_on IS NOT NULL THEN
    SELECT vin INTO v_vin FROM vehicle WHERE vehicle_id = NEW.vehicle_id;
    INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
    VALUES (NEW.battery_id, 'REMOVED', NEW.removed_on,
            CONCAT('Removed from vehicle ', v_vin, ': ', COALESCE(NEW.removal_reason, 'no reason recorded')));
    UPDATE battery SET status = 'REMOVED' WHERE battery_id = NEW.battery_id;
  END IF;
END$$

-- ---- ownership, repair, certification -----------------------------------
CREATE TRIGGER trg_ownership_ai AFTER INSERT ON ownership_record FOR EACH ROW
BEGIN
  DECLARE v_name VARCHAR(120);
  SELECT name INTO v_name FROM stakeholder WHERE stakeholder_id = NEW.stakeholder_id;
  INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
  VALUES (NEW.battery_id, 'OWNERSHIP_TRANSFER', NEW.from_date,
          CONCAT('Ownership transferred to ', v_name, COALESCE(CONCAT(' (', NEW.transfer_reason, ')'), '')));
END$$

CREATE TRIGGER trg_repair_ai AFTER INSERT ON repair_record FOR EACH ROW
BEGIN
  INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
  VALUES (NEW.battery_id, 'REPAIR', NEW.repair_date,
          CONCAT(REPLACE(NEW.repair_type, '_', ' '), ': ', LEFT(NEW.description, 200)));
END$$

CREATE TRIGGER trg_cert_ai AFTER INSERT ON battery_certification FOR EACH ROW
BEGIN
  INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
  VALUES (NEW.battery_id, 'CERTIFIED', NEW.issued_on,
          CONCAT('Certified: ', NEW.cert_name, ' by ', NEW.issuing_body));
END$$

-- ---- health records keep the battery summary columns current ---------------
CREATE TRIGGER trg_health_ai AFTER INSERT ON health_record FOR EACH ROW
BEGIN
  DECLARE v_latest DATETIME;
  SELECT MAX(recorded_at) INTO v_latest FROM health_record WHERE battery_id = NEW.battery_id;
  IF NEW.recorded_at >= v_latest THEN
    UPDATE battery
       SET current_soh_pct = NEW.soh_pct,
           total_cycles = GREATEST(total_cycles, NEW.cycle_count)
     WHERE battery_id = NEW.battery_id;
  END IF;
END$$

-- ---- assessment ------------------------------------------------------------
CREATE TRIGGER trg_assessment_ai AFTER INSERT ON second_life_assessment FOR EACH ROW
BEGIN
  INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
  VALUES (NEW.battery_id, 'ASSESSED', NEW.assessed_on,
          CONCAT('Second-life assessment: ', REPLACE(NEW.decision, '_', ' '), ' (score ', NEW.score, ')'));
END$$

-- ---- refurbishment ---------------------------------------------------------
CREATE TRIGGER trg_refurb_bi BEFORE INSERT ON refurbishment_record FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_type VARCHAR(30);
  SELECT status INTO v_status FROM battery WHERE battery_id = NEW.battery_id;
  IF v_status IN ('IN_SERVICE', 'RECYCLED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only batteries removed from service (and not recycled) can be refurbished';
  END IF;
  SELECT type INTO v_type FROM stakeholder WHERE stakeholder_id = NEW.refurbisher_id;
  IF v_type <> 'REFURBISHER' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected stakeholder is not a refurbisher';
  END IF;
END$$

CREATE TRIGGER trg_refurb_ai AFTER INSERT ON refurbishment_record FOR EACH ROW
BEGIN
  INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
  VALUES (NEW.battery_id, 'REFURBISHED', COALESCE(NEW.end_date, NEW.start_date),
          CONCAT('Refurbishment (', REPLACE(NEW.outcome, '_', ' '), '): ', LEFT(NEW.work_done, 180)));
  IF NEW.outcome = 'REUSED_STATIONARY' THEN
    UPDATE battery SET status = 'SECOND_LIFE', current_soh_pct = COALESCE(NEW.soh_after, current_soh_pct)
     WHERE battery_id = NEW.battery_id;
  ELSEIF NEW.outcome = 'REUSED_VEHICLE' THEN
    UPDATE battery SET status = 'REFURBISHED', current_soh_pct = COALESCE(NEW.soh_after, current_soh_pct)
     WHERE battery_id = NEW.battery_id;
  END IF;
END$$

CREATE TRIGGER trg_refurb_au AFTER UPDATE ON refurbishment_record FOR EACH ROW
BEGIN
  IF NOT (OLD.outcome <=> NEW.outcome) THEN
    INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
    VALUES (NEW.battery_id, 'REUSED', COALESCE(NEW.end_date, NEW.start_date),
            CONCAT('Refurbishment outcome: ', REPLACE(NEW.outcome, '_', ' '),
                   COALESCE(CONCAT(' - ', NEW.reuse_application), '')));
    IF NEW.outcome = 'REUSED_STATIONARY' THEN
      UPDATE battery SET status = 'SECOND_LIFE', current_soh_pct = COALESCE(NEW.soh_after, current_soh_pct)
       WHERE battery_id = NEW.battery_id;
    ELSEIF NEW.outcome = 'REUSED_VEHICLE' THEN
      UPDATE battery SET status = 'REFURBISHED', current_soh_pct = COALESCE(NEW.soh_after, current_soh_pct)
       WHERE battery_id = NEW.battery_id;
    END IF;
  END IF;
END$$

-- ---- recycling -------------------------------------------------------------
CREATE TRIGGER trg_recycling_bi BEFORE INSERT ON recycling_record FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_type VARCHAR(30);
  SELECT status INTO v_status FROM battery WHERE battery_id = NEW.battery_id;
  IF v_status = 'IN_SERVICE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A battery that is installed in a vehicle cannot be recycled';
  END IF;
  SELECT type INTO v_type FROM stakeholder WHERE stakeholder_id = NEW.recycler_id;
  IF v_type <> 'RECYCLER' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selected stakeholder is not a recycler';
  END IF;
END$$

CREATE TRIGGER trg_recycling_ai AFTER INSERT ON recycling_record FOR EACH ROW
BEGIN
  INSERT INTO lifecycle_event (battery_id, event_type, event_time, description)
  VALUES (NEW.battery_id, 'RECYCLED', NEW.recycled_on,
          CONCAT('Recycled via ', REPLACE(NEW.method, '_', ' '), ' (', NEW.total_input_kg, ' kg processed)'));
  UPDATE battery SET status = 'RECYCLED' WHERE battery_id = NEW.battery_id;
END$$

CREATE TRIGGER trg_recovered_bi BEFORE INSERT ON recovered_material FOR EACH ROW
BEGIN
  DECLARE v_total DECIMAL(10,3);
  DECLARE v_sum DECIMAL(10,3);
  SELECT total_input_kg INTO v_total FROM recycling_record WHERE recycling_id = NEW.recycling_id;
  SELECT COALESCE(SUM(quantity_kg), 0) INTO v_sum FROM recovered_material WHERE recycling_id = NEW.recycling_id;
  IF v_sum + NEW.quantity_kg > v_total THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Recovered material exceeds the weight of the battery that was processed';
  END IF;
END$$

-- ---- configuration audit ---------------------------------------------------
CREATE TRIGGER trg_rule_au AFTER UPDATE ON assessment_rule FOR EACH ROW
BEGIN
  IF NOT (OLD.rule_value <=> NEW.rule_value) THEN
    INSERT INTO audit_log (table_name, record_id, action, old_value, new_value)
    VALUES ('assessment_rule', NEW.rule_key, 'RULE_CHANGE', OLD.rule_value, NEW.rule_value);
  END IF;
END$$

-- =====================================================================
-- STORED PROCEDURES  (each one is an atomic transaction)
-- =====================================================================

CREATE PROCEDURE sp_install_battery(
  IN p_battery_id INT UNSIGNED, IN p_vehicle_id INT UNSIGNED,
  IN p_installed_on DATE, IN p_odometer_km INT UNSIGNED)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_id INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT status INTO v_status FROM battery WHERE battery_id = p_battery_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Battery not found';
  END IF;
  INSERT INTO installation (battery_id, vehicle_id, installed_on, odometer_at_install_km)
  VALUES (p_battery_id, p_vehicle_id, p_installed_on, p_odometer_km);
  SET v_id = LAST_INSERT_ID();
  COMMIT;
  SELECT v_id AS installation_id;
END$$

CREATE PROCEDURE sp_remove_battery(
  IN p_battery_id INT UNSIGNED, IN p_removed_on DATE,
  IN p_odometer_km INT UNSIGNED, IN p_reason VARCHAR(200))
BEGIN
  DECLARE v_inst INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT installation_id INTO v_inst FROM installation
   WHERE battery_id = p_battery_id AND removed_on IS NULL FOR UPDATE;
  IF v_inst IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Battery is not currently installed in any vehicle';
  END IF;
  UPDATE installation
     SET removed_on = p_removed_on, odometer_at_removal_km = p_odometer_km, removal_reason = p_reason
   WHERE installation_id = v_inst;
  COMMIT;
  SELECT v_inst AS installation_id;
END$$

CREATE PROCEDURE sp_transfer_ownership(
  IN p_battery_id INT UNSIGNED, IN p_new_owner_id INT UNSIGNED,
  IN p_date DATE, IN p_reason VARCHAR(200))
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_current INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT status INTO v_status FROM battery WHERE battery_id = p_battery_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Battery not found';
  END IF;
  IF v_status = 'RECYCLED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ownership of a recycled battery cannot change';
  END IF;
  SELECT stakeholder_id INTO v_current FROM ownership_record
   WHERE battery_id = p_battery_id AND to_date IS NULL FOR UPDATE;
  IF v_current = p_new_owner_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The selected stakeholder already owns this battery';
  END IF;
  UPDATE ownership_record SET to_date = p_date WHERE battery_id = p_battery_id AND to_date IS NULL;
  INSERT INTO ownership_record (battery_id, stakeholder_id, from_date, transfer_reason)
  VALUES (p_battery_id, p_new_owner_id, p_date, p_reason);
  COMMIT;
  SELECT LAST_INSERT_ID() AS ownership_id;
END$$

CREATE PROCEDURE sp_assess_second_life(
  IN p_battery_id INT UNSIGNED, IN p_user_id INT UNSIGNED, IN p_assessed_on DATETIME)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_soh DECIMAL(5,2);
  DECLARE v_cycles INT UNSIGNED;
  DECLARE v_max_temp DECIMAL(5,2);
  DECLARE v_repairs INT;
  DECLARE r_min_soh DECIMAL(10,2);
  DECLARE r_recycle_soh DECIMAL(10,2);
  DECLARE r_max_cycles DECIMAL(10,2);
  DECLARE r_max_temp DECIMAL(10,2);
  DECLARE r_max_repairs DECIMAL(10,2);
  DECLARE v_decision VARCHAR(25);
  DECLARE v_failed VARCHAR(500) DEFAULT '';
  DECLARE v_expl TEXT;
  DECLARE v_score DECIMAL(8,2);
  DECLARE v_cycle_score DECIMAL(8,2);
  DECLARE v_temp_score DECIMAL(8,2);
  DECLARE v_repair_score DECIMAL(8,2);
  DECLARE v_id INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT status, current_soh_pct, total_cycles INTO v_status, v_soh, v_cycles
    FROM battery WHERE battery_id = p_battery_id FOR UPDATE;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Battery not found';
  END IF;
  IF v_status IN ('IN_SERVICE', 'RECYCLED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only batteries removed from service (and not recycled) can be assessed';
  END IF;

  SELECT MAX(max_temp_c) INTO v_max_temp FROM health_record WHERE battery_id = p_battery_id;
  SELECT COUNT(*) INTO v_repairs FROM repair_record WHERE battery_id = p_battery_id;

  SET r_min_soh = fn_get_rule('MIN_SOH_SECOND_LIFE');
  SET r_recycle_soh = fn_get_rule('RECYCLE_BELOW_SOH');
  SET r_max_cycles = fn_get_rule('MAX_CYCLES_SECOND_LIFE');
  SET r_max_temp = fn_get_rule('MAX_PEAK_TEMP_C');
  SET r_max_repairs = fn_get_rule('MAX_REPAIRS');

  IF v_soh < r_min_soh THEN
    SET v_failed = CONCAT(v_failed, 'SOH ', v_soh, '% is below the minimum ', r_min_soh, '%; ');
  END IF;
  IF v_cycles > r_max_cycles THEN
    SET v_failed = CONCAT(v_failed, 'cycle count ', v_cycles, ' exceeds ', CAST(r_max_cycles AS UNSIGNED), '; ');
  END IF;
  IF v_max_temp IS NOT NULL AND v_max_temp > r_max_temp THEN
    SET v_failed = CONCAT(v_failed, 'peak temperature ', v_max_temp, ' C exceeds ', r_max_temp, ' C; ');
  END IF;
  IF v_repairs > r_max_repairs THEN
    SET v_failed = CONCAT(v_failed, 'repair count ', v_repairs, ' exceeds ', CAST(r_max_repairs AS UNSIGNED), '; ');
  END IF;

  IF v_soh < r_recycle_soh THEN
    SET v_decision = 'RECYCLE';
    SET v_expl = CONCAT('SOH of ', v_soh, '% is below the recycling threshold of ', r_recycle_soh,
                        '%. The battery is not suitable for reuse. ',
                        IF(v_failed = '', '', CONCAT('Other findings: ', v_failed)));
  ELSEIF v_failed = '' THEN
    SET v_decision = 'SECOND_LIFE_ELIGIBLE';
    SET v_expl = CONCAT('All criteria met: SOH ', v_soh, '% (min ', r_min_soh, '%), cycles ', v_cycles,
                        ' (max ', CAST(r_max_cycles AS UNSIGNED), '), peak temperature ',
                        IFNULL(CONCAT(v_max_temp, ' C'), 'not recorded'), ' (max ', r_max_temp, ' C), repairs ',
                        v_repairs, ' (max ', CAST(r_max_repairs AS UNSIGNED), ').');
  ELSE
    SET v_decision = 'REFURBISH_FIRST';
    SET v_expl = CONCAT('Refurbishment is required before reuse. Failed criteria: ', v_failed);
  END IF;

  -- Indicative score (0-100): 50% SOH, 20% cycle headroom, 20% thermal headroom, 10% repair history
  SET v_cycle_score = GREATEST(0, 100 * (1 - v_cycles / r_max_cycles));
  SET v_temp_score = IF(v_max_temp IS NULL, 100,
                        GREATEST(0, LEAST(100, (r_max_temp + 20 - v_max_temp) * 100 / 40)));
  SET v_repair_score = GREATEST(0, 100 - 25 * v_repairs);
  SET v_score = LEAST(100, 0.5 * v_soh + 0.2 * v_cycle_score + 0.2 * v_temp_score + 0.1 * v_repair_score);

  INSERT INTO second_life_assessment
    (battery_id, assessed_by, assessed_on, soh_pct, cycle_count, max_temp_c, repair_count,
     score, decision, explanation, rules_used)
  VALUES
    (p_battery_id, p_user_id, COALESCE(p_assessed_on, NOW()), v_soh, v_cycles, v_max_temp, v_repairs,
     v_score, v_decision, v_expl,
     JSON_OBJECT('MIN_SOH_SECOND_LIFE', r_min_soh, 'RECYCLE_BELOW_SOH', r_recycle_soh,
                 'MAX_CYCLES_SECOND_LIFE', r_max_cycles, 'MAX_PEAK_TEMP_C', r_max_temp,
                 'MAX_REPAIRS', r_max_repairs));
  SET v_id = LAST_INSERT_ID();
  COMMIT;
  SELECT v_id AS assessment_id, v_decision AS decision, v_score AS score, v_expl AS explanation;
END$$

CREATE PROCEDURE sp_record_recycling(
  IN p_battery_id INT UNSIGNED, IN p_recycler_id INT UNSIGNED, IN p_recycled_on DATE,
  IN p_method VARCHAR(30), IN p_total_kg DECIMAL(8,2), IN p_notes VARCHAR(300), IN p_materials JSON)
BEGIN
  DECLARE v_id INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  INSERT INTO recycling_record (battery_id, recycler_id, recycled_on, method, total_input_kg, notes)
  VALUES (p_battery_id, p_recycler_id, p_recycled_on, p_method, p_total_kg, p_notes);
  SET v_id = LAST_INSERT_ID();

  IF p_materials IS NOT NULL AND JSON_LENGTH(p_materials) > 0 THEN
    INSERT INTO recovered_material (recycling_id, material_id, quantity_kg, purity_pct)
    SELECT v_id, jt.material_id, jt.quantity_kg, jt.purity_pct
      FROM JSON_TABLE(p_materials, '$[*]' COLUMNS (
             material_id INT UNSIGNED PATH '$.material_id',
             quantity_kg DECIMAL(10,3) PATH '$.quantity_kg',
             purity_pct DECIMAL(5,2) PATH '$.purity_pct' DEFAULT '90' ON EMPTY
           )) AS jt;
  END IF;
  COMMIT;
  SELECT v_id AS recycling_id;
END$$

DELIMITER ;

-- =====================================================================
-- VIEWS
-- =====================================================================

CREATE OR REPLACE VIEW v_battery_overview AS
SELECT b.battery_id, b.serial_number, b.status, b.manufacture_date,
       b.current_soh_pct, b.total_cycles,
       fn_health_grade(b.current_soh_pct) AS health_grade,
       TIMESTAMPDIFF(MONTH, b.manufacture_date, CURDATE()) AS age_months,
       bm.model_id, bm.model_name, bm.chemistry, bm.nominal_capacity_kwh, bm.rated_cycle_life,
       ROUND(100 * b.total_cycles / bm.rated_cycle_life, 1) AS cycle_life_used_pct,
       m.manufacturer_id, m.name AS manufacturer_name,
       v.vehicle_id AS current_vehicle_id, v.vin AS current_vin,
       s.stakeholder_id AS current_owner_id, s.name AS current_owner
FROM battery b
JOIN battery_model bm ON bm.model_id = b.model_id
JOIN manufacturer m ON m.manufacturer_id = bm.manufacturer_id
LEFT JOIN installation i ON i.battery_id = b.battery_id AND i.removed_on IS NULL
LEFT JOIN vehicle v ON v.vehicle_id = i.vehicle_id
LEFT JOIN ownership_record o ON o.battery_id = b.battery_id AND o.to_date IS NULL
LEFT JOIN stakeholder s ON s.stakeholder_id = o.stakeholder_id;

CREATE OR REPLACE VIEW v_latest_assessment AS
SELECT t.assessment_id, t.battery_id, t.assessed_by, t.assessed_on, t.soh_pct, t.score, t.decision, t.explanation
FROM (
  SELECT a.assessment_id, a.battery_id, a.assessed_by, a.assessed_on, a.soh_pct, a.score, a.decision, a.explanation,
         ROW_NUMBER() OVER (PARTITION BY a.battery_id ORDER BY a.assessed_on DESC, a.assessment_id DESC) AS rn
  FROM second_life_assessment a
) t
WHERE t.rn = 1;

CREATE OR REPLACE VIEW v_open_alerts AS
SELECT a.alert_id, a.battery_id, b.serial_number, a.metric, a.observed_value, a.limit_value,
       a.direction, a.recorded_at, a.status
FROM battery_alert a JOIN battery b ON b.battery_id = a.battery_id
WHERE a.status = 'OPEN';

CREATE OR REPLACE VIEW v_recycling_material_summary AS
SELECT mt.material_id, mt.name AS material, mt.symbol, mt.is_critical,
       COUNT(DISTINCT rm.recycling_id) AS batteries_processed,
       SUM(rm.quantity_kg) AS total_recovered_kg,
       ROUND(AVG(rm.purity_pct), 1) AS avg_purity_pct
FROM material mt JOIN recovered_material rm ON rm.material_id = mt.material_id
GROUP BY mt.material_id, mt.name, mt.symbol, mt.is_critical;
