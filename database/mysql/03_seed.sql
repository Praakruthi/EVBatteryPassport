-- =====================================================================
-- BatteryPassport  |  MySQL 8.0  |  03_seed.sql  (sample data, DML)
-- Generated for demonstration. Most history rows are written through the
-- stored procedures / triggers so that traceability events are produced
-- exactly as they would be by the application.
-- =====================================================================
USE batterypassport;

INSERT INTO manufacturer (name, country, contact_email) VALUES
  ('CATL', 'China', 'support@catl-demo.com'),
  ('LG Energy Solution', 'South Korea', 'support@lges-demo.com'),
  ('Panasonic Energy', 'Japan', 'support@panasonic-demo.com'),
  ('BYD', 'China', 'support@byd-demo.com'),
  ('Tata Agratas', 'India', 'support@agratas-demo.com');

INSERT INTO battery_model (manufacturer_id, model_name, chemistry, nominal_capacity_kwh, nominal_voltage_v, weight_kg, rated_cycle_life) VALUES
  (1, 'CTP-NMC-60', 'NMC', 60.0, 355.0, 380.0, 1500),
  (1, 'Prismatic-LFP-50', 'LFP', 50.0, 320.0, 340.0, 3000),
  (2, 'E78-NMC', 'NMC', 78.0, 400.0, 420.0, 1500),
  (3, 'NCA-2170-85', 'NCA', 85.0, 350.0, 480.0, 1200),
  (4, 'Blade-LFP-60', 'LFP', 60.5, 400.0, 455.0, 3500),
  (5, 'AG-LFP-30', 'LFP', 30.2, 330.0, 290.0, 2500);

INSERT INTO stakeholder (name, type, email, phone, address) VALUES
  ('GreenDrive Fleet Services', 'FLEET_OPERATOR', 'ops@greendrive-demo.in', '+91 80 4100 2000', 'Whitefield, Bengaluru'),
  ('Priya Nair', 'OWNER', 'priya.nair@example.com', '+91 98450 11122', 'Indiranagar, Bengaluru'),
  ('Rohan Mehta', 'OWNER', 'rohan.mehta@example.com', '+91 98860 33344', 'Koramangala, Bengaluru'),
  ('VoltCare Service Center', 'SERVICE_CENTER', 'service@voltcare-demo.in', '+91 80 4200 3000', 'Peenya, Bengaluru'),
  ('ReNew Cells Refurbishers', 'REFURBISHER', 'hello@renewcells-demo.in', '+91 80 4300 4000', 'Hosur Road, Bengaluru'),
  ('EcoLoop Recyclers', 'RECYCLER', 'plant@ecoloop-demo.in', '+91 80 4400 5000', 'Dobbaspet, Karnataka'),
  ('MetalReclaim Industries', 'RECYCLER', 'plant@metalreclaim-demo.in', '+91 22 4500 6000', 'Taloja, Maharashtra'),
  ('Factory Stock (Manufacturer)', 'MANUFACTURER', NULL, NULL, 'Manufacturer warehouse'),
  ('SunStore Energy Pvt Ltd', 'STORAGE_OPERATOR', 'info@sunstore-demo.in', '+91 80 4600 7000', 'Electronic City, Bengaluru'),
  ('PowerFix Battery Works', 'SERVICE_CENTER', 'care@powerfix-demo.in', '+91 80 4700 8000', 'Yeshwanthpur, Bengaluru');

INSERT INTO vehicle (vin, make, model, model_year, registration_no) VALUES
  ('MA1EV000000000001', 'Tata', 'Nexon EV', 2020, 'KA01AB1001'),
  ('MA1EV000000000002', 'Tata', 'Tigor EV', 2019, 'KA03CD2002'),
  ('MA1EV000000000003', 'MG', 'ZS EV', 2020, 'KA05EF3003'),
  ('MA1EV000000000004', 'Hyundai', 'Kona Electric', 2018, 'KA01GH4004'),
  ('MA1EV000000000005', 'Tata', 'Nexon EV Max', 2023, 'KA02JK5005'),
  ('MA1EV000000000006', 'Kia', 'Niro EV', 2019, 'KA04LM6006'),
  ('MA1EV000000000007', 'BYD', 'e6', 2021, 'KA05NP7007'),
  ('MA1EV000000000008', 'BYD', 'e6', 2020, 'KA09QR8008'),
  ('MA1EV000000000009', 'Tata', 'Tigor EV', 2022, 'KA51ST9009'),
  ('MA1EV000000000010', 'Tata', 'Tigor EV', 2022, 'KA53UV1010'),
  ('MA1EV000000000011', 'Nissan', 'Leaf', 2018, 'KA01WX1111');

INSERT INTO material (name, symbol, is_critical) VALUES
  ('Lithium', 'Li', 1),
  ('Cobalt', 'Co', 1),
  ('Nickel', 'Ni', 1),
  ('Manganese', 'Mn', 0),
  ('Copper', 'Cu', 0),
  ('Aluminium', 'Al', 0),
  ('Graphite', 'C', 1),
  ('Iron', 'Fe', 0);

INSERT INTO model_material (model_id, material_id, content_kg) VALUES
  (1, 1, 6.0),
  (1, 2, 8.0),
  (1, 3, 30.0),
  (1, 4, 8.0),
  (1, 5, 25.0),
  (1, 6, 35.0),
  (1, 7, 55.0),
  (2, 1, 4.5),
  (2, 5, 22.0),
  (2, 6, 40.0),
  (2, 7, 50.0),
  (2, 8, 40.0),
  (3, 1, 6.5),
  (3, 2, 9.0),
  (3, 3, 32.0),
  (3, 4, 8.5),
  (3, 5, 26.0),
  (3, 6, 36.0),
  (3, 7, 60.0),
  (4, 1, 7.0),
  (4, 2, 7.5),
  (4, 3, 52.0),
  (4, 5, 30.0),
  (4, 6, 40.0),
  (4, 7, 62.0),
  (5, 1, 5.0),
  (5, 5, 24.0),
  (5, 6, 42.0),
  (5, 7, 55.0),
  (5, 8, 48.0),
  (6, 1, 2.7),
  (6, 5, 14.0),
  (6, 6, 24.0),
  (6, 7, 30.0),
  (6, 8, 26.0);

INSERT INTO app_user (username, email, password_hash, role, stakeholder_id) VALUES
  ('admin', 'admin@batterypassport.local', 'scrypt:9f41783b0e5df49f0c49cc1e70169df9:99f4f02a6a786e4f7da2a6268aa4208ce00fd3f6943c0856d5647bd2c8023226255cd784795de9cab1ddaccafeba0bd22131e7eedbb85d8d46ca7da32270490f', 'ADMIN', NULL),
  ('operator', 'operator@batterypassport.local', 'scrypt:33d903036042d4bdb887f3010a3cc24c:2ec9839fa244674821f95d0f9d4face9c117151de44e556cfa9eb16db40315a154d7a8d8e0006b3ea9dde9383e75bdbbd8a1e5bc02b8c47110ce3f164aaca047', 'OPERATOR', 4),
  ('assessor', 'assessor@batterypassport.local', 'scrypt:b74bf5950d0f2a6ab4ad3bb42394d203:2abb05da400570952bcca0d9f4269aaae11997605736defb63b39c60a38b5c8ac879f6d8a5da8ecdea3da98ef36fb515902d3ffc4b8f98e606301b9ab9aa4488', 'ASSESSOR', NULL),
  ('recycler', 'recycler@batterypassport.local', 'scrypt:92be6a134870b8cb133c42124bbfb5b2:e9f69c71d414074eae742ec263c6cdbf0ed89ea773d446070518560b90b2b91c13fa252f3c305f4fc944942e3409646fde5480d5be520ac851db3dd4dcc76294', 'RECYCLER', 6);

INSERT INTO assessment_rule (rule_key, rule_value, description) VALUES
  ('MIN_SOH_SECOND_LIFE', 70, 'Minimum state of health (%) for direct second-life use'),
  ('RECYCLE_BELOW_SOH', 50, 'Below this state of health (%) the battery is sent for recycling'),
  ('MAX_CYCLES_SECOND_LIFE', 2500, 'Maximum charge cycles for second-life eligibility'),
  ('MAX_PEAK_TEMP_C', 60, 'Maximum peak temperature (C) recorded over the battery life'),
  ('MAX_REPAIRS', 3, 'Maximum number of repair events for second-life eligibility');

INSERT INTO telemetry_threshold (metric, min_value, max_value) VALUES
  ('temperature_c', -10, 55),
  ('voltage_v', 250, 450),
  ('current_a', -250, 250),
  ('soc_pct', 5, 100),
  ('soh_pct', 60, NULL);

INSERT INTO battery (serial_number, model_id, manufacture_date, registered_by) VALUES
  ('BP-CATL-NMC-0001', 1, '2020-03-15', 2),
  ('BP-CATL-NMC-0002', 1, '2019-11-10', 2),
  ('BP-CATL-LFP-0003', 2, '2020-06-05', 2),
  ('BP-LGES-E78-0004', 3, '2018-09-20', 2),
  ('BP-LGES-E78-0005', 3, '2023-02-12', 2),
  ('BP-PANA-NCA-0006', 4, '2019-05-30', 2),
  ('BP-BYD-LFP-0007', 5, '2021-08-01', 2),
  ('BP-BYD-LFP-0008', 5, '2020-01-18', 2),
  ('BP-TATA-LFP-0009', 6, '2022-04-04', 2),
  ('BP-TATA-LFP-0010', 6, '2022-06-21', 2),
  ('BP-CATL-NMC-0011', 1, '2024-01-10', 2),
  ('BP-PANA-NCA-0012', 4, '2018-02-14', 2);

-- Ownership history (stored procedure closes the previous owner and opens the new one atomically)
CALL sp_transfer_ownership(1, 8, '2020-03-15', 'Factory stock');
CALL sp_transfer_ownership(1, 1, '2020-05-25', 'Sold to fleet operator');
CALL sp_transfer_ownership(2, 8, '2019-11-10', 'Factory stock');
CALL sp_transfer_ownership(2, 1, '2020-01-10', 'Sold to fleet operator');
CALL sp_transfer_ownership(3, 8, '2020-06-05', 'Factory stock');
CALL sp_transfer_ownership(3, 1, '2020-08-20', 'Sold to fleet operator');
CALL sp_transfer_ownership(4, 8, '2018-09-20', 'Factory stock');
CALL sp_transfer_ownership(4, 1, '2018-11-20', 'Sold to fleet operator');
CALL sp_transfer_ownership(5, 8, '2023-02-12', 'Factory stock');
CALL sp_transfer_ownership(5, 2, '2023-04-10', 'Retail purchase with vehicle');
CALL sp_transfer_ownership(6, 8, '2019-05-30', 'Factory stock');
CALL sp_transfer_ownership(6, 3, '2019-08-15', 'Retail purchase with vehicle');
CALL sp_transfer_ownership(7, 8, '2021-08-01', 'Factory stock');
CALL sp_transfer_ownership(7, 3, '2021-09-30', 'Retail purchase with vehicle');
CALL sp_transfer_ownership(8, 8, '2020-01-18', 'Factory stock');
CALL sp_transfer_ownership(8, 1, '2020-03-20', 'Sold to fleet operator');
CALL sp_transfer_ownership(9, 8, '2022-04-04', 'Factory stock');
CALL sp_transfer_ownership(9, 2, '2022-06-10', 'Retail purchase with vehicle');
CALL sp_transfer_ownership(10, 8, '2022-06-21', 'Factory stock');
CALL sp_transfer_ownership(10, 3, '2022-08-25', 'Retail purchase with vehicle');
CALL sp_transfer_ownership(11, 8, '2024-01-10', 'Factory stock');
CALL sp_transfer_ownership(12, 8, '2018-02-14', 'Factory stock');
CALL sp_transfer_ownership(12, 1, '2018-04-20', 'Sold to fleet operator');

-- Installations: closed history rows are inserted directly; active ones go through sp_install_battery
INSERT INTO installation (battery_id, vehicle_id, installed_on, removed_on, odometer_at_install_km, odometer_at_removal_km, removal_reason) VALUES
  (2, 2, '2020-01-20', '2024-08-10', 0, 215000, 'Range degradation - fleet retirement'),
  (3, 3, '2020-09-01', '2025-02-15', 0, 168000, 'Vehicle sold; battery retained by fleet'),
  (4, 4, '2018-12-01', '2024-03-01', 0, 198000, 'Severe capacity fade'),
  (6, 6, '2019-09-01', '2024-11-20', 0, 121000, 'Thermal warnings repeated'),
  (8, 8, '2020-04-01', '2025-06-10', 0, 224000, 'Fleet retirement'),
  (10, 10, '2022-08-30', '2025-09-01', 0, 38000, 'Accident damage to vehicle'),
  (12, 11, '2018-05-01', '2023-10-10', 0, 156000, 'Severe capacity fade');

CALL sp_install_battery(1, 1, '2020-06-01', 12);
CALL sp_install_battery(5, 5, '2023-04-15', 8);
CALL sp_install_battery(7, 7, '2021-10-10', 15);
CALL sp_install_battery(9, 9, '2022-06-15', 10);

INSERT INTO battery_certification (battery_id, cert_name, issuing_body, certificate_no, issued_on, expires_on) VALUES
  (1, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-CATL-NMC-0001', '2020-04-14', '2030-04-14'),
  (2, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-CATL-NMC-0002', '2019-12-10', '2029-12-10'),
  (3, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-CATL-LFP-0003', '2020-07-05', '2030-07-05'),
  (4, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-LGES-E78-0004', '2018-10-20', '2028-10-20'),
  (5, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-LGES-E78-0005', '2023-03-14', '2033-03-14'),
  (6, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-PANA-NCA-0006', '2019-06-29', '2029-06-29'),
  (7, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-BYD-LFP-0007', '2021-08-31', '2031-08-31'),
  (8, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-BYD-LFP-0008', '2020-02-17', '2030-02-17'),
  (9, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-TATA-LFP-0009', '2022-05-04', '2032-05-04'),
  (10, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-TATA-LFP-0010', '2022-07-21', '2032-07-21'),
  (11, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-CATL-NMC-0011', '2024-02-09', '2034-02-09'),
  (12, 'UN 38.3 Transport Safety', 'TUV SUD India', 'UN383-BP-PANA-NCA-0012', '2018-03-16', '2028-03-16'),
  (5, 'AIS-156 Traction Battery Safety', 'ARAI', 'AIS156-BP-LGES-E78-0005', '2023-03-29', '2031-03-29'),
  (7, 'AIS-156 Traction Battery Safety', 'ARAI', 'AIS156-BP-BYD-LFP-0007', '2021-09-15', '2029-09-15'),
  (9, 'AIS-156 Traction Battery Safety', 'ARAI', 'AIS156-BP-TATA-LFP-0009', '2022-05-19', '2030-05-19'),
  (10, 'AIS-156 Traction Battery Safety', 'ARAI', 'AIS156-BP-TATA-LFP-0010', '2022-08-05', '2030-08-05'),
  (11, 'AIS-156 Traction Battery Safety', 'ARAI', 'AIS156-BP-CATL-NMC-0011', '2024-02-24', '2032-02-24');

INSERT INTO health_record (battery_id, recorded_at, soh_pct, cycle_count, avg_temp_c, max_temp_c, source) VALUES
  (1, '2020-09-01 12:00:00', 100.0, 0, 29.8, 40, 'LAB_TEST'),
  (1, '2021-03-22 12:00:00', 98.88, 98, 31.0, 43, 'TELEMETRY_SUMMARY'),
  (1, '2021-10-10 12:00:00', 97.98, 196, 32.2, 42, 'TELEMETRY_SUMMARY'),
  (1, '2022-04-29 12:00:00', 97.15, 295, 30.4, 41, 'SERVICE_CHECK'),
  (1, '2022-11-17 12:00:00', 96.36, 393, 31.6, 40, 'TELEMETRY_SUMMARY'),
  (1, '2023-06-07 12:00:00', 95.6, 491, 29.8, 43, 'TELEMETRY_SUMMARY'),
  (1, '2023-12-26 12:00:00', 94.86, 589, 31.0, 49, 'TELEMETRY_SUMMARY'),
  (1, '2024-07-15 12:00:00', 94.14, 687, 32.2, 41, 'SERVICE_CHECK'),
  (1, '2025-02-02 12:00:00', 93.44, 785, 30.4, 40, 'TELEMETRY_SUMMARY'),
  (1, '2025-08-22 12:00:00', 92.75, 884, 31.6, 43, 'TELEMETRY_SUMMARY'),
  (1, '2026-03-12 12:00:00', 92.07, 982, 29.8, 42, 'TELEMETRY_SUMMARY'),
  (1, '2026-09-30 12:00:00', 91.4, 1080, 31.0, 41, 'SERVICE_CHECK'),
  (2, '2020-04-20 12:00:00', 100.0, 0, 31.8, 42, 'LAB_TEST'),
  (2, '2020-11-02 12:00:00', 94.57, 206, 33.0, 45, 'TELEMETRY_SUMMARY'),
  (2, '2021-05-17 12:00:00', 90.21, 412, 34.2, 44, 'TELEMETRY_SUMMARY'),
  (2, '2021-11-29 12:00:00', 86.18, 619, 32.4, 43, 'SERVICE_CHECK'),
  (2, '2022-06-13 12:00:00', 82.36, 825, 33.6, 54, 'TELEMETRY_SUMMARY'),
  (2, '2022-12-26 12:00:00', 78.67, 1031, 31.8, 45, 'TELEMETRY_SUMMARY'),
  (2, '2023-07-10 12:00:00', 75.1, 1238, 33.0, 44, 'TELEMETRY_SUMMARY'),
  (2, '2024-01-22 12:00:00', 71.61, 1444, 34.2, 43, 'SERVICE_CHECK'),
  (2, '2024-08-05 12:00:00', 68.2, 1650, 32.4, 42, 'TELEMETRY_SUMMARY'),
  (3, '2020-12-01 12:00:00', 100.0, 0, 28.8, 39, 'LAB_TEST'),
  (3, '2021-07-08 12:00:00', 96.56, 200, 30.0, 42, 'TELEMETRY_SUMMARY'),
  (3, '2022-02-12 12:00:00', 93.79, 400, 31.2, 41, 'TELEMETRY_SUMMARY'),
  (3, '2022-09-19 12:00:00', 91.24, 600, 29.4, 40, 'SERVICE_CHECK'),
  (3, '2023-04-25 12:00:00', 88.81, 800, 30.6, 48, 'TELEMETRY_SUMMARY'),
  (3, '2023-11-30 12:00:00', 86.48, 1000, 28.8, 42, 'TELEMETRY_SUMMARY'),
  (3, '2024-07-06 12:00:00', 84.21, 1200, 30.0, 41, 'TELEMETRY_SUMMARY'),
  (3, '2025-02-10 12:00:00', 82.0, 1400, 31.2, 40, 'SERVICE_CHECK'),
  (4, '2019-03-01 12:00:00', 100.0, 0, 32.8, 43, 'LAB_TEST'),
  (4, '2019-09-19 12:00:00', 91.66, 200, 34.0, 46, 'TELEMETRY_SUMMARY'),
  (4, '2020-04-09 12:00:00', 84.96, 400, 35.2, 45, 'TELEMETRY_SUMMARY'),
  (4, '2020-10-28 12:00:00', 78.78, 600, 33.4, 44, 'SERVICE_CHECK'),
  (4, '2021-05-19 12:00:00', 72.9, 800, 34.6, 43, 'TELEMETRY_SUMMARY'),
  (4, '2021-12-07 12:00:00', 67.23, 1000, 32.8, 52, 'TELEMETRY_SUMMARY'),
  (4, '2022-06-28 12:00:00', 61.74, 1200, 34.0, 45, 'TELEMETRY_SUMMARY'),
  (4, '2023-01-16 12:00:00', 56.39, 1400, 35.2, 44, 'SERVICE_CHECK'),
  (4, '2023-08-07 12:00:00', 51.14, 1600, 33.4, 43, 'TELEMETRY_SUMMARY'),
  (4, '2024-02-25 12:00:00', 46.0, 1800, 34.6, 46, 'TELEMETRY_SUMMARY'),
  (5, '2023-07-15 12:00:00', 100.0, 0, 27.8, 38, 'LAB_TEST'),
  (5, '2024-03-06 12:00:00', 98.75, 104, 29.0, 41, 'TELEMETRY_SUMMARY'),
  (5, '2024-10-26 12:00:00', 97.75, 208, 30.2, 40, 'TELEMETRY_SUMMARY'),
  (5, '2025-06-18 12:00:00', 96.83, 312, 28.4, 45, 'SERVICE_CHECK'),
  (5, '2026-02-07 12:00:00', 95.95, 416, 29.6, 38, 'TELEMETRY_SUMMARY'),
  (5, '2026-09-30 12:00:00', 95.1, 520, 27.8, 41, 'TELEMETRY_SUMMARY'),
  (6, '2019-12-01 12:00:00', 100.0, 0, 34.8, 45, 'LAB_TEST'),
  (6, '2020-06-19 12:00:00', 95.52, 122, 36.0, 48, 'TELEMETRY_SUMMARY'),
  (6, '2021-01-06 12:00:00', 91.92, 244, 37.2, 47, 'TELEMETRY_SUMMARY'),
  (6, '2021-07-27 12:00:00', 88.6, 367, 35.4, 46, 'SERVICE_CHECK'),
  (6, '2022-02-13 12:00:00', 85.44, 489, 36.6, 45, 'TELEMETRY_SUMMARY'),
  (6, '2022-09-02 12:00:00', 82.4, 611, 34.8, 63, 'TELEMETRY_SUMMARY'),
  (6, '2023-03-22 12:00:00', 79.45, 733, 36.0, 47, 'TELEMETRY_SUMMARY'),
  (6, '2023-10-10 12:00:00', 76.58, 856, 37.2, 46, 'SERVICE_CHECK'),
  (6, '2024-04-28 12:00:00', 73.76, 978, 35.4, 45, 'TELEMETRY_SUMMARY'),
  (6, '2024-11-15 12:00:00', 71.0, 1100, 36.6, 48, 'TELEMETRY_SUMMARY'),
  (7, '2022-01-10 12:00:00', 100.0, 0, 28.8, 39, 'LAB_TEST'),
  (7, '2022-08-14 12:00:00', 99.11, 110, 30.0, 42, 'TELEMETRY_SUMMARY'),
  (7, '2023-03-17 12:00:00', 98.4, 220, 31.2, 41, 'TELEMETRY_SUMMARY'),
  (7, '2023-10-18 12:00:00', 97.74, 330, 29.4, 40, 'SERVICE_CHECK'),
  (7, '2024-05-21 12:00:00', 97.12, 440, 30.6, 44, 'TELEMETRY_SUMMARY'),
  (7, '2024-12-23 12:00:00', 96.51, 550, 28.8, 42, 'TELEMETRY_SUMMARY'),
  (7, '2025-07-26 12:00:00', 95.93, 660, 30.0, 41, 'TELEMETRY_SUMMARY'),
  (7, '2026-02-26 12:00:00', 95.36, 770, 31.2, 40, 'SERVICE_CHECK'),
  (7, '2026-09-30 12:00:00', 94.8, 880, 29.4, 39, 'TELEMETRY_SUMMARY'),
  (8, '2020-07-01 12:00:00', 100.0, 0, 29.8, 40, 'LAB_TEST'),
  (8, '2021-01-17 12:00:00', 96.6, 211, 31.0, 42, 'TELEMETRY_SUMMARY'),
  (8, '2021-08-05 12:00:00', 93.87, 422, 32.2, 42, 'TELEMETRY_SUMMARY'),
  (8, '2022-02-21 12:00:00', 91.35, 633, 30.4, 41, 'SERVICE_CHECK'),
  (8, '2022-09-09 12:00:00', 88.96, 844, 31.6, 40, 'TELEMETRY_SUMMARY'),
  (8, '2023-03-28 12:00:00', 86.65, 1056, 29.8, 44, 'TELEMETRY_SUMMARY'),
  (8, '2023-10-14 12:00:00', 84.41, 1267, 31.0, 42, 'TELEMETRY_SUMMARY'),
  (8, '2024-05-01 12:00:00', 82.23, 1478, 32.2, 41, 'SERVICE_CHECK'),
  (8, '2024-11-17 12:00:00', 80.1, 1689, 30.4, 40, 'TELEMETRY_SUMMARY'),
  (8, '2025-06-05 12:00:00', 78.0, 1900, 31.6, 42, 'TELEMETRY_SUMMARY'),
  (9, '2022-09-15 12:00:00', 100.0, 0, 27.8, 38, 'LAB_TEST'),
  (9, '2023-04-14 12:00:00', 99.33, 86, 29.0, 40, 'TELEMETRY_SUMMARY'),
  (9, '2023-11-11 12:00:00', 98.79, 171, 30.2, 40, 'TELEMETRY_SUMMARY'),
  (9, '2024-06-09 12:00:00', 98.3, 257, 28.4, 39, 'SERVICE_CHECK'),
  (9, '2025-01-05 12:00:00', 97.82, 343, 29.6, 42, 'TELEMETRY_SUMMARY'),
  (9, '2025-08-04 12:00:00', 97.37, 429, 27.8, 40, 'TELEMETRY_SUMMARY'),
  (9, '2026-03-03 12:00:00', 96.93, 514, 29.0, 40, 'TELEMETRY_SUMMARY'),
  (9, '2026-09-30 12:00:00', 96.5, 600, 30.2, 39, 'SERVICE_CHECK'),
  (10, '2022-11-30 12:00:00', 100.0, 0, 31.8, 42, 'LAB_TEST'),
  (10, '2023-08-07 12:00:00', 87.07, 75, 33.0, 45, 'TELEMETRY_SUMMARY'),
  (10, '2024-04-13 12:00:00', 76.7, 150, 34.2, 57, 'TELEMETRY_SUMMARY'),
  (10, '2024-12-18 12:00:00', 67.11, 225, 32.4, 43, 'SERVICE_CHECK'),
  (10, '2025-08-25 12:00:00', 58.0, 300, 33.6, 42, 'TELEMETRY_SUMMARY'),
  (12, '2018-08-01 12:00:00', 100.0, 0, 33.8, 44, 'LAB_TEST'),
  (12, '2019-02-27 12:00:00', 91.35, 132, 35.0, 47, 'TELEMETRY_SUMMARY'),
  (12, '2019-09-25 12:00:00', 84.41, 264, 36.2, 46, 'TELEMETRY_SUMMARY'),
  (12, '2020-04-22 12:00:00', 77.99, 397, 34.4, 45, 'SERVICE_CHECK'),
  (12, '2020-11-18 12:00:00', 71.89, 529, 35.6, 44, 'TELEMETRY_SUMMARY'),
  (12, '2021-06-17 12:00:00', 66.02, 661, 33.8, 50, 'TELEMETRY_SUMMARY'),
  (12, '2022-01-13 12:00:00', 60.33, 793, 35.0, 46, 'TELEMETRY_SUMMARY'),
  (12, '2022-08-11 12:00:00', 54.77, 926, 36.2, 45, 'SERVICE_CHECK'),
  (12, '2023-03-09 12:00:00', 49.33, 1058, 34.4, 44, 'TELEMETRY_SUMMARY'),
  (12, '2023-10-05 12:00:00', 44.0, 1190, 35.6, 47, 'TELEMETRY_SUMMARY'),
  (11, '2024-01-15 10:00:00', 100.0, 0, 25.0, 27.0, 'LAB_TEST');

INSERT INTO repair_record (battery_id, service_stakeholder_id, repair_date, repair_type, description, cost, cells_replaced) VALUES
  (1, 4, '2024-05-14', 'BMS_UPDATE', 'BMS firmware update to correct SOC estimation drift', 4500, 0),
  (2, 4, '2022-03-18', 'CELL_REPLACEMENT', 'Replaced 4 weak cells in module 3 after cell imbalance was detected', 42000, 4),
  (2, 10, '2023-07-09', 'BMS_UPDATE', 'BMS recalibration after repeated SOC jumps during fast charging', 6000, 0),
  (3, 10, '2023-02-22', 'COOLING_SYSTEM', 'Coolant pump replaced and thermal sensor recalibrated after overheating warning', 18500, 0),
  (4, 4, '2021-09-02', 'MODULE_REPLACEMENT', 'Module 2 replaced after sudden voltage drop under load', 85000, 12),
  (4, 4, '2022-12-12', 'CONNECTOR_REPAIR', 'High-voltage connector corrosion cleaned and reseated', 7000, 0),
  (4, 10, '2023-05-30', 'CELL_REPLACEMENT', 'Swapped 6 cells in module 5 showing rapid capacity fade', 31000, 6),
  (6, 10, '2022-04-11', 'COOLING_SYSTEM', 'Cooling plate leak repaired after overheating alert and thermal runaway warning', 26000, 0),
  (6, 4, '2023-09-19', 'CELL_REPLACEMENT', 'Replaced 3 cells with elevated internal resistance', 21000, 3),
  (9, 4, '2025-02-05', 'CONNECTOR_REPAIR', 'Loose busbar connector tightened after intermittent power loss', 3500, 0),
  (10, 4, '2023-01-16', 'MODULE_REPLACEMENT', 'Module replaced after minor collision damage to battery casing', 64000, 8),
  (10, 10, '2023-03-08', 'CONNECTOR_REPAIR', 'HV connector replaced and insulation resistance retested after collision repair', 9000, 0),
  (12, 4, '2020-08-10', 'BMS_UPDATE', 'BMS software update to fix charge cutoff fault', 5000, 0);

INSERT INTO battery_alert (battery_id, metric, observed_value, limit_value, direction, recorded_at, status, acknowledged_by) VALUES
  (5, 'temperature_c', 56.4, 55.0, 'ABOVE_MAX', '2026-10-12 14:20:00', 'OPEN', NULL),
  (1, 'soc_pct', 3.8, 5.0, 'BELOW_MIN', '2026-10-20 06:45:00', 'OPEN', NULL),
  (6, 'temperature_c', 63.0, 55.0, 'ABOVE_MAX', '2024-10-30 16:10:00', 'ACKNOWLEDGED', 3);

-- Second-life assessments via the rule-based stored procedure (assessor user_id = 3)
CALL sp_assess_second_life(2, 3, '2024-08-20 10:00:00');
CALL sp_assess_second_life(3, 3, '2025-03-01 11:30:00');
CALL sp_assess_second_life(4, 3, '2024-03-20 09:15:00');
CALL sp_assess_second_life(6, 3, '2024-12-05 14:00:00');
CALL sp_assess_second_life(8, 3, '2025-06-25 10:30:00');
CALL sp_assess_second_life(10, 3, '2025-09-15 16:20:00');
CALL sp_assess_second_life(12, 3, '2023-11-01 12:00:00');

INSERT INTO refurbishment_record (battery_id, refurbisher_id, start_date, end_date, work_done, soh_before, soh_after, outcome, reuse_application, cost) VALUES
  (8, 5, '2025-07-10', '2025-08-20', 'Module-level capacity testing, replaced 6 weak cells, new BMS firmware and re-balancing for stationary duty', 78.0, 83.5, 'REUSED_STATIONARY', 'Rooftop solar home storage (5 kWh bank)', 38500),
  (2, 5, '2024-09-05', NULL, 'Cell-level diagnostics and balancing; evaluating module 2 replacement', 68.2, NULL, 'IN_PROGRESS', NULL, 0);

CALL sp_transfer_ownership(8, 9, '2025-08-25', 'Sold for stationary energy storage');

-- Recycling: ownership moves to the recycler, then one transaction records the event and recovered materials
CALL sp_transfer_ownership(4, 6, '2025-05-01', 'Sent for recycling');
CALL sp_record_recycling(4, 6, '2025-05-10', 'HYDROMETALLURGICAL', 418.50, 'Black mass recovered; electrolyte treated on site',
  '[{"material_id":1,"quantity_kg":4.8,"purity_pct":88},{"material_id":2,"quantity_kg":7.2,"purity_pct":95},{"material_id":3,"quantity_kg":29.5,"purity_pct":96},{"material_id":4,"quantity_kg":7.1,"purity_pct":90},{"material_id":5,"quantity_kg":24.6,"purity_pct":97},{"material_id":6,"quantity_kg":33.0,"purity_pct":94}]');
CALL sp_transfer_ownership(12, 7, '2024-12-01', 'Sent for recycling');
CALL sp_record_recycling(12, 7, '2024-12-10', 'PYROMETALLURGICAL', 478.00, 'Smelting route; Li recovered from slag',
  '[{"material_id":1,"quantity_kg":5.1,"purity_pct":86},{"material_id":2,"quantity_kg":6.8,"purity_pct":94},{"material_id":3,"quantity_kg":41.0,"purity_pct":95},{"material_id":5,"quantity_kg":28.3,"purity_pct":97},{"material_id":6,"quantity_kg":37.5,"purity_pct":95}]');
