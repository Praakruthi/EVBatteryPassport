-- =====================================================================
-- BatteryPassport  |  MySQL 8.0  |  04_queries.sql
-- Important queries: JOIN, GROUP BY, HAVING, ORDER BY, aggregates,
-- subqueries, CTE, window functions, CASE, views, FULLTEXT, procedures.
-- Run any block on its own in MySQL Workbench / mysql client.
-- =====================================================================
USE batterypassport;

-- Q1. JOIN: battery passport summary (battery + model + manufacturer)
SELECT b.serial_number, m.name AS manufacturer, bm.model_name, bm.chemistry,
       bm.nominal_capacity_kwh, b.manufacture_date, b.status, b.current_soh_pct
FROM battery b
JOIN battery_model bm ON bm.model_id = b.model_id
JOIN manufacturer m   ON m.manufacturer_id = bm.manufacturer_id
ORDER BY b.serial_number;

-- Q2. VIEW: current vehicle and owner of every battery
SELECT serial_number, status, health_grade, current_vin, current_owner, cycle_life_used_pct
FROM v_battery_overview
ORDER BY current_soh_pct DESC;

-- Q3. GROUP BY + HAVING + aggregates: fleet health by manufacturer and chemistry
SELECT m.name AS manufacturer, bm.chemistry,
       COUNT(*) AS batteries,
       ROUND(AVG(b.current_soh_pct), 1) AS avg_soh,
       MIN(b.current_soh_pct) AS worst_soh,
       SUM(b.total_cycles) AS total_cycles
FROM battery b
JOIN battery_model bm ON bm.model_id = b.model_id
JOIN manufacturer m   ON m.manufacturer_id = bm.manufacturer_id
GROUP BY m.name, bm.chemistry
HAVING COUNT(*) >= 2
ORDER BY avg_soh DESC;

-- Q4. SUBQUERY: batteries (not recycled) whose SOH is below the fleet average
SELECT serial_number, status, current_soh_pct
FROM battery
WHERE status <> 'RECYCLED'
  AND current_soh_pct < (SELECT AVG(current_soh_pct) FROM battery WHERE status <> 'RECYCLED')
ORDER BY current_soh_pct;

-- Q5. EXISTS subquery: batteries that currently have open alerts
SELECT b.serial_number, b.status,
       (SELECT COUNT(*) FROM battery_alert a WHERE a.battery_id = b.battery_id AND a.status = 'OPEN') AS open_alerts
FROM battery b
WHERE EXISTS (SELECT 1 FROM battery_alert a WHERE a.battery_id = b.battery_id AND a.status = 'OPEN');

-- Q6. CTE + CASE: indicative second-life pipeline using the configurable rules
WITH stats AS (
  SELECT b.battery_id, b.serial_number, b.status, b.current_soh_pct AS soh, b.total_cycles AS cycles,
         (SELECT MAX(h.max_temp_c) FROM health_record h WHERE h.battery_id = b.battery_id) AS peak_temp,
         (SELECT COUNT(*) FROM repair_record r WHERE r.battery_id = b.battery_id) AS repairs
  FROM battery b
  WHERE b.status IN ('REMOVED', 'REFURBISHED')
)
SELECT serial_number, status, soh, cycles, peak_temp, repairs,
       CASE
         WHEN soh < fn_get_rule('RECYCLE_BELOW_SOH') THEN 'RECYCLE'
         WHEN soh >= fn_get_rule('MIN_SOH_SECOND_LIFE')
              AND cycles <= fn_get_rule('MAX_CYCLES_SECOND_LIFE')
              AND COALESCE(peak_temp, 0) <= fn_get_rule('MAX_PEAK_TEMP_C')
              AND repairs <= fn_get_rule('MAX_REPAIRS') THEN 'LIKELY ELIGIBLE'
         ELSE 'NEEDS REFURBISHMENT'
       END AS indicative_outcome
FROM stats
ORDER BY soh DESC;

-- Q7. WINDOW FUNCTION (LAG): SOH degradation between consecutive health records
SELECT * FROM (
  SELECT b.serial_number, h.recorded_at, h.soh_pct,
         LAG(h.soh_pct) OVER w AS previous_soh,
         ROUND(LAG(h.soh_pct) OVER w - h.soh_pct, 2) AS soh_drop,
         TIMESTAMPDIFF(DAY, LAG(h.recorded_at) OVER w, h.recorded_at) AS days_between
  FROM health_record h
  JOIN battery b ON b.battery_id = h.battery_id
  WINDOW w AS (PARTITION BY h.battery_id ORDER BY h.recorded_at)
) t
WHERE t.soh_drop IS NOT NULL
ORDER BY t.soh_drop DESC
LIMIT 10;

-- Q8. WINDOW FUNCTION (RANK): SOH rank inside each chemistry
SELECT bm.chemistry, b.serial_number, b.current_soh_pct,
       RANK() OVER (PARTITION BY bm.chemistry ORDER BY b.current_soh_pct DESC) AS rank_in_chemistry
FROM battery b JOIN battery_model bm ON bm.model_id = b.model_id
WHERE b.status <> 'RECYCLED'
ORDER BY bm.chemistry, rank_in_chemistry;

-- Q9. Latest assessment per battery (view built on ROW_NUMBER)
SELECT b.serial_number, la.decision, la.score, la.assessed_on, la.explanation
FROM v_latest_assessment la JOIN battery b ON b.battery_id = la.battery_id
ORDER BY la.score DESC;

-- Q10. Assessment outcome distribution
SELECT decision, COUNT(*) AS assessments, ROUND(AVG(score), 1) AS avg_score
FROM second_life_assessment
GROUP BY decision
ORDER BY assessments DESC;

-- Q11. Materials recovered (view) and recovery rate per recycled battery
SELECT * FROM v_recycling_material_summary ORDER BY total_recovered_kg DESC;

SELECT b.serial_number, rr.method, rr.total_input_kg,
       SUM(rm.quantity_kg) AS recovered_kg,
       ROUND(100 * SUM(rm.quantity_kg) / rr.total_input_kg, 1) AS recovery_pct
FROM recycling_record rr
JOIN battery b ON b.battery_id = rr.battery_id
JOIN recovered_material rm ON rm.recycling_id = rr.recycling_id
GROUP BY b.serial_number, rr.method, rr.total_input_kg;

-- Q12. Repair cost per service center
SELECT s.name AS service_center, COUNT(*) AS jobs, SUM(r.cost) AS total_cost, ROUND(AVG(r.cost), 0) AS avg_cost
FROM repair_record r JOIN stakeholder s ON s.stakeholder_id = r.service_stakeholder_id
GROUP BY s.name
ORDER BY total_cost DESC;

-- Q13. FULLTEXT search over repair descriptions (BOOLEAN MODE, relevance-ranked)
SELECT b.serial_number, r.repair_date, r.repair_type,
       MATCH(r.description) AGAINST ('cooling* overheating*' IN BOOLEAN MODE) AS relevance,
       r.description
FROM repair_record r JOIN battery b ON b.battery_id = r.battery_id
WHERE MATCH(r.description) AGAINST ('cooling* overheating*' IN BOOLEAN MODE)
ORDER BY relevance DESC;

-- Q14. Chronological traceability timeline of one battery (written by triggers)
SELECT event_time, event_type, description
FROM lifecycle_event
WHERE battery_id = (SELECT battery_id FROM battery WHERE serial_number = 'BP-CATL-NMC-0002')
ORDER BY event_time, event_id;

-- Q15. Cycle-life consumed bucket (function + CASE)
SELECT serial_number, total_cycles, fn_cycle_life_used_pct(battery_id) AS pct_used,
       CASE WHEN fn_cycle_life_used_pct(battery_id) < 40 THEN 'Early life'
            WHEN fn_cycle_life_used_pct(battery_id) < 80 THEN 'Mid life'
            ELSE 'End of rated life' END AS life_stage
FROM battery
ORDER BY pct_used DESC;

-- Q16. Audit trail written by triggers
SELECT changed_at, table_name, record_id, action, old_value, new_value
FROM audit_log ORDER BY log_id DESC LIMIT 20;

-- Q17. Stored procedures (each is one atomic transaction)
-- Run a rule-based assessment on a removed battery (user_id 3 = assessor):
--   CALL sp_assess_second_life(6, 3, NULL);
-- Transfer ownership:
--   CALL sp_transfer_ownership(11, 2, CURDATE(), 'Sold to retail customer');
-- Install / remove:
--   CALL sp_install_battery(11, 5, CURDATE(), 0);   -- fails: vehicle 5 already has a battery
--   CALL sp_remove_battery(1, CURDATE(), 150000, 'Scheduled replacement');

-- Q18. Index usage (EXPLAIN)
EXPLAIN SELECT * FROM health_record WHERE battery_id = 1 AND recorded_at >= '2025-01-01';
EXPLAIN SELECT serial_number FROM battery WHERE status = 'REMOVED';
