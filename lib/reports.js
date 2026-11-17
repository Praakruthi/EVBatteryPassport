import { query } from '@/lib/db';
import { telemetryCollection } from '@/lib/mongo';

// Each report shows the exact query it runs, so the reports page doubles as the "important queries" demo.
export const REPORTS = [
  {
    key: 'fleet_health', db: 'MySQL', concepts: 'JOIN, GROUP BY, HAVING, aggregates',
    title: 'Fleet health by manufacturer and chemistry',
    sql: `SELECT m.name AS manufacturer, bm.chemistry, COUNT(*) AS batteries,
       ROUND(AVG(b.current_soh_pct), 1) AS avg_soh, MIN(b.current_soh_pct) AS worst_soh,
       SUM(b.total_cycles) AS total_cycles
FROM battery b
JOIN battery_model bm ON bm.model_id = b.model_id
JOIN manufacturer m ON m.manufacturer_id = bm.manufacturer_id
GROUP BY m.name, bm.chemistry
HAVING COUNT(*) >= 2
ORDER BY avg_soh DESC`,
  },
  {
    key: 'below_average', db: 'MySQL', concepts: 'Scalar subquery',
    title: 'Batteries with SOH below the fleet average',
    sql: `SELECT serial_number, status, current_soh_pct
FROM battery
WHERE status <> 'RECYCLED'
  AND current_soh_pct < (SELECT AVG(current_soh_pct) FROM battery WHERE status <> 'RECYCLED')
ORDER BY current_soh_pct`,
  },
  {
    key: 'soh_drop', db: 'MySQL', concepts: 'Window function LAG, derived table',
    title: 'Largest SOH drops between consecutive health records',
    sql: `SELECT * FROM (
  SELECT b.serial_number, h.recorded_at, h.soh_pct,
         LAG(h.soh_pct) OVER w AS previous_soh,
         ROUND(LAG(h.soh_pct) OVER w - h.soh_pct, 2) AS soh_drop,
         TIMESTAMPDIFF(DAY, LAG(h.recorded_at) OVER w, h.recorded_at) AS days_between
  FROM health_record h JOIN battery b ON b.battery_id = h.battery_id
  WINDOW w AS (PARTITION BY h.battery_id ORDER BY h.recorded_at)
) t
WHERE t.soh_drop IS NOT NULL
ORDER BY t.soh_drop DESC
LIMIT 10`,
  },
  {
    key: 'rank_chemistry', db: 'MySQL', concepts: 'Window function RANK',
    title: 'SOH rank inside each chemistry',
    sql: `SELECT bm.chemistry, b.serial_number, b.current_soh_pct,
       RANK() OVER (PARTITION BY bm.chemistry ORDER BY b.current_soh_pct DESC) AS rank_in_chemistry
FROM battery b JOIN battery_model bm ON bm.model_id = b.model_id
WHERE b.status <> 'RECYCLED'
ORDER BY bm.chemistry, rank_in_chemistry`,
  },
  {
    key: 'pipeline', db: 'MySQL', concepts: 'CTE, correlated subqueries, CASE, stored function',
    title: 'Second-life pipeline (indicative outcome from the configured rules)',
    sql: `WITH stats AS (
  SELECT b.battery_id, b.serial_number, b.status, b.current_soh_pct AS soh, b.total_cycles AS cycles,
         (SELECT MAX(h.max_temp_c) FROM health_record h WHERE h.battery_id = b.battery_id) AS peak_temp,
         (SELECT COUNT(*) FROM repair_record r WHERE r.battery_id = b.battery_id) AS repairs
  FROM battery b WHERE b.status IN ('REMOVED', 'REFURBISHED')
)
SELECT serial_number, status, soh, cycles, peak_temp, repairs,
  CASE
    WHEN soh < fn_get_rule('RECYCLE_BELOW_SOH') THEN 'RECYCLE'
    WHEN soh >= fn_get_rule('MIN_SOH_SECOND_LIFE') AND cycles <= fn_get_rule('MAX_CYCLES_SECOND_LIFE')
         AND COALESCE(peak_temp, 0) <= fn_get_rule('MAX_PEAK_TEMP_C') AND repairs <= fn_get_rule('MAX_REPAIRS')
      THEN 'LIKELY ELIGIBLE'
    ELSE 'NEEDS REFURBISHMENT'
  END AS indicative_outcome
FROM stats ORDER BY soh DESC`,
  },
  {
    key: 'outcomes', db: 'MySQL', concepts: 'GROUP BY, aggregates',
    title: 'Assessment outcomes',
    sql: `SELECT decision, COUNT(*) AS assessments, ROUND(AVG(score), 1) AS avg_score
FROM second_life_assessment
GROUP BY decision
ORDER BY assessments DESC`,
  },
  {
    key: 'materials', db: 'MySQL', concepts: 'View with JOIN + GROUP BY',
    title: 'Materials recovered (view v_recycling_material_summary)',
    sql: `SELECT material, symbol, batteries_processed, total_recovered_kg, avg_purity_pct
FROM v_recycling_material_summary
ORDER BY total_recovered_kg DESC`,
  },
  {
    key: 'recovery_rate', db: 'MySQL', concepts: 'JOIN, SUM, derived percentage',
    title: 'Recovery rate per recycled battery',
    sql: `SELECT b.serial_number, rr.method, rr.total_input_kg,
       SUM(rm.quantity_kg) AS recovered_kg,
       ROUND(100 * SUM(rm.quantity_kg) / rr.total_input_kg, 1) AS recovery_pct
FROM recycling_record rr
JOIN battery b ON b.battery_id = rr.battery_id
JOIN recovered_material rm ON rm.recycling_id = rr.recycling_id
GROUP BY b.serial_number, rr.method, rr.total_input_kg`,
  },
  {
    key: 'repair_cost', db: 'MySQL', concepts: 'JOIN, GROUP BY, SUM, AVG',
    title: 'Repair cost per service center',
    sql: `SELECT s.name AS service_center, COUNT(*) AS jobs, SUM(r.cost) AS total_cost, ROUND(AVG(r.cost), 0) AS avg_cost
FROM repair_record r JOIN stakeholder s ON s.stakeholder_id = r.service_stakeholder_id
GROUP BY s.name
ORDER BY total_cost DESC`,
  },
  {
    key: 'open_alerts', db: 'MySQL', concepts: 'EXISTS subquery',
    title: 'Batteries with open alerts',
    sql: `SELECT b.serial_number, b.status,
       (SELECT COUNT(*) FROM battery_alert a WHERE a.battery_id = b.battery_id AND a.status = 'OPEN') AS open_alerts
FROM battery b
WHERE EXISTS (SELECT 1 FROM battery_alert a WHERE a.battery_id = b.battery_id AND a.status = 'OPEN')`,
  },
  {
    key: 'cycle_life', db: 'MySQL', concepts: 'Stored function + CASE',
    title: 'Rated cycle life consumed',
    sql: `SELECT serial_number, total_cycles, fn_cycle_life_used_pct(battery_id) AS pct_used,
  CASE WHEN fn_cycle_life_used_pct(battery_id) < 40 THEN 'Early life'
       WHEN fn_cycle_life_used_pct(battery_id) < 80 THEN 'Mid life'
       ELSE 'End of rated life' END AS life_stage
FROM battery ORDER BY pct_used DESC`,
  },
];

export const MONGO_PIPELINE = [
  { $group: {
      _id: '$battery_id',
      readings: { $sum: 1 },
      avg_temp: { $avg: '$temperature_c' },
      peak_temp: { $max: '$temperature_c' },
      hot_readings: { $sum: { $cond: [{ $gt: ['$temperature_c', 45] }, 1, 0] } },
      latest_reading: { $max: '$ts' } } },
  { $sort: { peak_temp: -1 } },
];

export async function runAllReports() {
  const results = [];
  for (const r of REPORTS) {
    try { results.push({ ...r, rows: await query(r.sql) }); }
    catch (e) { results.push({ ...r, rows: [], error: e.sqlMessage || e.message }); }
  }
  // MongoDB aggregation joined with MySQL serial numbers in the application layer
  try {
    const col = await telemetryCollection();
    const rows = await col.aggregate(MONGO_PIPELINE).toArray();
    const ids = rows.map((r) => r._id);
    const serials = ids.length ? await query('SELECT battery_id, serial_number FROM battery WHERE battery_id IN (?)', [ids]) : [];
    const map = Object.fromEntries(serials.map((s) => [s.battery_id, s.serial_number]));
    const r1 = (x) => Math.round(x * 100) / 100;
    results.push({
      key: 'mongo_fleet', db: 'MongoDB', concepts: 'Aggregation pipeline ($group, $cond, $sort) + MySQL lookup',
      title: 'Telemetry summary per battery (MongoDB aggregation)',
      sql: JSON.stringify(MONGO_PIPELINE, null, 2),
      rows: rows.map((r) => ({ serial_number: map[r._id] || `#${r._id}`, readings: r.readings, avg_temp: r1(r.avg_temp),
        peak_temp: r1(r.peak_temp), hot_readings_over_45C: r.hot_readings, latest_reading: r.latest_reading.toISOString().slice(0, 19).replace('T', ' ') })),
    });
  } catch (e) {
    results.push({ key: 'mongo_fleet', db: 'MongoDB', title: 'Telemetry summary per battery (MongoDB aggregation)', sql: JSON.stringify(MONGO_PIPELINE, null, 2), rows: [], error: e.message });
  }
  return results;
}
