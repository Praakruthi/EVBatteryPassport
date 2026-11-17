-- =====================================================================
-- BatteryPassport  |  MySQL 8.0  |  01_schema.sql  (DDL)
-- Demonstrates: CREATE, ALTER, DROP, PK, FK, UNIQUE, CHECK, ENUM,
--               composite keys, indexes, FULLTEXT indexes
-- =====================================================================
DROP DATABASE IF EXISTS batterypassport;
CREATE DATABASE batterypassport CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE batterypassport;

-- ---------------------------------------------------------------------
-- Master / reference data
-- ---------------------------------------------------------------------
CREATE TABLE manufacturer (
  manufacturer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(60) NOT NULL,
  contact_email VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_manufacturer_name UNIQUE (name),
  CONSTRAINT chk_manufacturer_email CHECK (contact_email IS NULL OR contact_email LIKE '%_@_%._%')
) ENGINE=InnoDB;

CREATE TABLE battery_model (
  model_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  manufacturer_id INT UNSIGNED NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  chemistry ENUM('LFP','NMC','NCA','LTO','LMO') NOT NULL,
  nominal_capacity_kwh DECIMAL(7,2) NOT NULL,
  nominal_voltage_v DECIMAL(6,1) NOT NULL,
  weight_kg DECIMAL(7,2) NULL,
  rated_cycle_life INT UNSIGNED NOT NULL DEFAULT 1500,
  CONSTRAINT fk_model_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturer (manufacturer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_model_per_manufacturer UNIQUE (manufacturer_id, model_name),
  CONSTRAINT chk_model_capacity CHECK (nominal_capacity_kwh > 0),
  CONSTRAINT chk_model_voltage CHECK (nominal_voltage_v > 0),
  CONSTRAINT chk_model_weight CHECK (weight_kg IS NULL OR weight_kg > 0),
  CONSTRAINT chk_model_cycle_life CHECK (rated_cycle_life > 0)
) ENGINE=InnoDB;

CREATE TABLE stakeholder (
  stakeholder_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type ENUM('MANUFACTURER','OWNER','FLEET_OPERATOR','SERVICE_CENTER','REFURBISHER','RECYCLER','STORAGE_OPERATOR') NOT NULL,
  email VARCHAR(120) NULL,
  phone VARCHAR(20) NULL,
  address VARCHAR(200) NULL,
  CONSTRAINT uq_stakeholder_name UNIQUE (name),
  CONSTRAINT chk_stakeholder_email CHECK (email IS NULL OR email LIKE '%_@_%._%'),
  CONSTRAINT chk_stakeholder_phone CHECK (phone IS NULL OR phone REGEXP '^[0-9+() -]{7,20}$')
) ENGINE=InnoDB;

CREATE TABLE vehicle (
  vehicle_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vin CHAR(17) NOT NULL,
  make VARCHAR(60) NOT NULL,
  model VARCHAR(60) NOT NULL,
  model_year SMALLINT UNSIGNED NOT NULL,
  registration_no VARCHAR(20) NULL,
  CONSTRAINT uq_vehicle_vin UNIQUE (vin),
  CONSTRAINT uq_vehicle_registration UNIQUE (registration_no),
  CONSTRAINT chk_vehicle_year CHECK (model_year BETWEEN 2005 AND 2100)
) ENGINE=InnoDB;

CREATE TABLE material (
  material_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  symbol VARCHAR(5) NOT NULL,
  is_critical TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT uq_material_name UNIQUE (name),
  CONSTRAINT uq_material_symbol UNIQUE (symbol)
) ENGINE=InnoDB;

CREATE TABLE model_material (
  model_id INT UNSIGNED NOT NULL,
  material_id INT UNSIGNED NOT NULL,
  content_kg DECIMAL(8,3) NOT NULL,
  PRIMARY KEY (model_id, material_id),
  CONSTRAINT fk_mm_model FOREIGN KEY (model_id) REFERENCES battery_model (model_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_mm_material FOREIGN KEY (material_id) REFERENCES material (material_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_mm_content CHECK (content_kg > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------
CREATE TABLE app_user (
  user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(40) NOT NULL,
  email VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','OPERATOR','ASSESSOR','RECYCLER') NOT NULL,
  stakeholder_id INT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME NULL,
  CONSTRAINT uq_user_username UNIQUE (username),
  CONSTRAINT uq_user_email UNIQUE (email),
  CONSTRAINT fk_user_stakeholder FOREIGN KEY (stakeholder_id) REFERENCES stakeholder (stakeholder_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_user_username CHECK (CHAR_LENGTH(username) >= 3),
  CONSTRAINT chk_user_email CHECK (email LIKE '%_@_%._%')
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Battery passport core
-- ---------------------------------------------------------------------
CREATE TABLE battery (
  battery_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  serial_number VARCHAR(40) NOT NULL,
  model_id INT UNSIGNED NOT NULL,
  manufacture_date DATE NOT NULL,
  status ENUM('MANUFACTURED','IN_SERVICE','REMOVED','REFURBISHED','SECOND_LIFE','RECYCLED') NOT NULL DEFAULT 'MANUFACTURED',
  current_soh_pct DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  total_cycles INT UNSIGNED NOT NULL DEFAULT 0,
  registered_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_battery_serial UNIQUE (serial_number),
  CONSTRAINT fk_battery_model FOREIGN KEY (model_id) REFERENCES battery_model (model_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_battery_soh CHECK (current_soh_pct BETWEEN 0 AND 100),
  CONSTRAINT chk_battery_serial CHECK (serial_number REGEXP '^[A-Za-z0-9-]{6,40}$')
) ENGINE=InnoDB;

CREATE TABLE battery_certification (
  cert_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  battery_id INT UNSIGNED NOT NULL,
  cert_name VARCHAR(80) NOT NULL,
  issuing_body VARCHAR(100) NOT NULL,
  certificate_no VARCHAR(60) NOT NULL,
  issued_on DATE NOT NULL,
  expires_on DATE NULL,
  CONSTRAINT uq_cert_number UNIQUE (certificate_no),
  CONSTRAINT fk_cert_battery FOREIGN KEY (battery_id) REFERENCES battery (battery_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_cert_dates CHECK (expires_on IS NULL OR expires_on > issued_on)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Lifecycle history
-- ---------------------------------------------------------------------
CREATE TABLE installation (
  installation_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  battery_id INT UNSIGNED NOT NULL,
  vehicle_id INT UNSIGNED NOT NULL,
  installed_on DATE NOT NULL,
  removed_on DATE NULL,
  odometer_at_install_km INT UNSIGNED NOT NULL DEFAULT 0,
  odometer_at_removal_km INT UNSIGNED NULL,
  removal_reason VARCHAR(200) NULL,
  CONSTRAINT fk_inst_battery FOREIGN KEY (battery_id) REFERENCES battery (battery_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_inst_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (vehicle_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_inst_dates CHECK (removed_on IS NULL OR removed_on >= installed_on),
  CONSTRAINT chk_inst_odometer CHECK (odometer_at_removal_km IS NULL OR odometer_at_removal_km >= odometer_at_install_km)
) ENGINE=InnoDB;

CREATE TABLE ownership_record (
  ownership_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  battery_id INT UNSIGNED NOT NULL,
  stakeholder_id INT UNSIGNED NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NULL,
  transfer_reason VARCHAR(200) NULL,
  CONSTRAINT fk_own_battery FOREIGN KEY (battery_id) REFERENCES battery (battery_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_own_stakeholder FOREIGN KEY (stakeholder_id) REFERENCES stakeholder (stakeholder_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_own_dates CHECK (to_date IS NULL OR to_date >= from_date)
) ENGINE=InnoDB;

CREATE TABLE repair_record (
  repair_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  battery_id INT UNSIGNED NOT NULL,
  service_stakeholder_id INT UNSIGNED NOT NULL,
  repair_date DATE NOT NULL,
  repair_type ENUM('CELL_REPLACEMENT','MODULE_REPLACEMENT','BMS_UPDATE','COOLING_SYSTEM','CONNECTOR_REPAIR','OTHER') NOT NULL,
  description TEXT NOT NULL,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cells_replaced INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_repair_battery FOREIGN KEY (battery_id) REFERENCES battery (battery_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_repair_service FOREIGN KEY (service_stakeholder_id) REFERENCES stakeholder (stakeholder_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_repair_cost CHECK (cost >= 0)
) ENGINE=InnoDB;

CREATE TABLE health_record (
  health_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  battery_id INT UNSIGNED NOT NULL,
  recorded_at DATETIME NOT NULL,
  soh_pct DECIMAL(5,2) NOT NULL,
  cycle_count INT UNSIGNED NOT NULL,
  avg_temp_c DECIMAL(5,2) NULL,
  max_temp_c DECIMAL(5,2) NULL,
  source ENUM('TELEMETRY_SUMMARY','LAB_TEST','SERVICE_CHECK') NOT NULL DEFAULT 'TELEMETRY_SUMMARY',
  CONSTRAINT uq_health_point UNIQUE (battery_id, recorded_at, source),
  CONSTRAINT fk_health_battery FOREIGN KEY (battery_id) REFERENCES battery (battery_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_health_soh CHECK (soh_pct BETWEEN 0 AND 100),
  CONSTRAINT chk_health_temp CHECK (max_temp_c IS NULL OR avg_temp_c IS NULL OR max_temp_c >= avg_temp_c)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Monitoring configuration and alerts
-- ---------------------------------------------------------------------
CREATE TABLE telemetry_threshold (
  metric ENUM('temperature_c','voltage_v','current_a','soc_pct','soh_pct') PRIMARY KEY,
  min_value DECIMAL(8,2) NULL,
  max_value DECIMAL(8,2) NULL,
  CONSTRAINT chk_threshold_range CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value)
) ENGINE=InnoDB;

CREATE TABLE battery_alert (
  alert_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  battery_id INT UNSIGNED NOT NULL,
  metric ENUM('temperature_c','voltage_v','current_a','soc_pct','soh_pct') NOT NULL,
  observed_value DECIMAL(10,2) NOT NULL,
  limit_value DECIMAL(10,2) NOT NULL,
  direction ENUM('ABOVE_MAX','BELOW_MIN') NOT NULL,
  recorded_at DATETIME NOT NULL,
  status ENUM('OPEN','ACKNOWLEDGED') NOT NULL DEFAULT 'OPEN',
  acknowledged_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_alert_point UNIQUE (battery_id, metric, recorded_at),
  CONSTRAINT fk_alert_battery FOREIGN KEY (battery_id) REFERENCES battery (battery_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_alert_metric FOREIGN KEY (metric) REFERENCES telemetry_threshold (metric) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_alert_user FOREIGN KEY (acknowledged_by) REFERENCES app_user (user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Second-life assessment, refurbishment, recycling
-- ---------------------------------------------------------------------
CREATE TABLE assessment_rule (
  rule_key VARCHAR(50) PRIMARY KEY,
  rule_value DECIMAL(10,2) NOT NULL,
  description VARCHAR(200) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_rule_value CHECK (rule_value >= 0)
) ENGINE=InnoDB;

CREATE TABLE second_life_assessment (
  assessment_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  battery_id INT UNSIGNED NOT NULL,
  assessed_by INT UNSIGNED NOT NULL,
  assessed_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  soh_pct DECIMAL(5,2) NOT NULL,
  cycle_count INT UNSIGNED NOT NULL,
  max_temp_c DECIMAL(5,2) NULL,
  repair_count INT UNSIGNED NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  decision ENUM('SECOND_LIFE_ELIGIBLE','REFURBISH_FIRST','RECYCLE') NOT NULL,
  explanation TEXT NOT NULL,
  rules_used JSON NULL,
  CONSTRAINT fk_assess_battery FOREIGN KEY (battery_id) REFERENCES battery (battery_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_assess_user FOREIGN KEY (assessed_by) REFERENCES app_user (user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_assess_score CHECK (score BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE refurbishment_record (
  refurb_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  battery_id INT UNSIGNED NOT NULL,
  refurbisher_id INT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  work_done TEXT NOT NULL,
  soh_before DECIMAL(5,2) NOT NULL,
  soh_after DECIMAL(5,2) NULL,
  outcome ENUM('IN_PROGRESS','REUSED_STATIONARY','REUSED_VEHICLE','FAILED') NOT NULL DEFAULT 'IN_PROGRESS',
  reuse_application VARCHAR(120) NULL,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_refurb_battery FOREIGN KEY (battery_id) REFERENCES battery (battery_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_refurb_stakeholder FOREIGN KEY (refurbisher_id) REFERENCES stakeholder (stakeholder_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_refurb_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_refurb_soh CHECK (soh_before BETWEEN 0 AND 100 AND (soh_after IS NULL OR soh_after BETWEEN 0 AND 100)),
  CONSTRAINT chk_refurb_cost CHECK (cost >= 0),
  CONSTRAINT chk_refurb_outcome CHECK (outcome IN ('IN_PROGRESS','FAILED') OR soh_after IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE recycling_record (
  recycling_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  battery_id INT UNSIGNED NOT NULL,
  recycler_id INT UNSIGNED NOT NULL,
  recycled_on DATE NOT NULL,
  method ENUM('HYDROMETALLURGICAL','PYROMETALLURGICAL','DIRECT_RECYCLING') NOT NULL,
  total_input_kg DECIMAL(8,2) NOT NULL,
  notes VARCHAR(300) NULL,
  CONSTRAINT uq_recycling_battery UNIQUE (battery_id),
  CONSTRAINT fk_recycle_battery FOREIGN KEY (battery_id) REFERENCES battery (battery_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_recycle_stakeholder FOREIGN KEY (recycler_id) REFERENCES stakeholder (stakeholder_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_recycle_input CHECK (total_input_kg > 0)
) ENGINE=InnoDB;

CREATE TABLE recovered_material (
  recovery_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recycling_id INT UNSIGNED NOT NULL,
  material_id INT UNSIGNED NOT NULL,
  quantity_kg DECIMAL(10,3) NOT NULL,
  purity_pct DECIMAL(5,2) NOT NULL DEFAULT 90.00,
  CONSTRAINT uq_recovery_material UNIQUE (recycling_id, material_id),
  CONSTRAINT fk_recovered_recycling FOREIGN KEY (recycling_id) REFERENCES recycling_record (recycling_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_recovered_material FOREIGN KEY (material_id) REFERENCES material (material_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_recovered_qty CHECK (quantity_kg > 0),
  CONSTRAINT chk_recovered_purity CHECK (purity_pct BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Traceability: chronological lifecycle events + audit trail
-- (rows are written by triggers, never by the application directly)
-- ---------------------------------------------------------------------
CREATE TABLE lifecycle_event (
  event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  battery_id INT UNSIGNED NOT NULL,
  event_type ENUM('MANUFACTURED','INSTALLED','REMOVED','OWNERSHIP_TRANSFER','REPAIR','CERTIFIED','ASSESSED','REFURBISHED','REUSED','RECYCLED') NOT NULL,
  event_time DATETIME NOT NULL,
  description VARCHAR(300) NOT NULL,
  CONSTRAINT fk_event_battery FOREIGN KEY (battery_id) REFERENCES battery (battery_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE audit_log (
  log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(40) NOT NULL,
  record_id VARCHAR(60) NOT NULL,
  action VARCHAR(30) NOT NULL,
  old_value VARCHAR(255) NULL,
  new_value VARCHAR(255) NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Indexes (B-tree + FULLTEXT)
-- ---------------------------------------------------------------------
CREATE INDEX idx_battery_status ON battery (status);
CREATE INDEX idx_battery_model ON battery (model_id);
CREATE INDEX idx_battery_soh ON battery (current_soh_pct);
CREATE INDEX idx_inst_battery_open ON installation (battery_id, removed_on);
CREATE INDEX idx_inst_vehicle_open ON installation (vehicle_id, removed_on);
CREATE INDEX idx_own_battery_open ON ownership_record (battery_id, to_date);
CREATE INDEX idx_repair_battery ON repair_record (battery_id, repair_date);
CREATE INDEX idx_health_battery_time ON health_record (battery_id, recorded_at);
CREATE INDEX idx_alert_status ON battery_alert (status, recorded_at);
CREATE INDEX idx_assess_battery ON second_life_assessment (battery_id, assessed_on);
CREATE INDEX idx_event_battery_time ON lifecycle_event (battery_id, event_time);
CREATE FULLTEXT INDEX ftx_repair_description ON repair_record (description);
CREATE FULLTEXT INDEX ftx_assess_explanation ON second_life_assessment (explanation);
CREATE FULLTEXT INDEX ftx_refurb_work ON refurbishment_record (work_done);

-- ---------------------------------------------------------------------
-- ALTER examples (schema evolution)
-- ---------------------------------------------------------------------
ALTER TABLE battery
  ADD CONSTRAINT fk_battery_registered_by FOREIGN KEY (registered_by) REFERENCES app_user (user_id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE battery_alert ADD COLUMN note VARCHAR(200) NULL AFTER status;
ALTER TABLE audit_log ADD INDEX idx_audit_table_record (table_name, record_id);
