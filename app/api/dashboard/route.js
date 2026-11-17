import { route } from '@/lib/api';
import { query, queryOne } from '@/lib/db';
import { telemetryCollection } from '@/lib/mongo';
export const dynamic = 'force-dynamic';

export const GET = route(undefined, async () => {
  const [statusCounts, grades, outcomes, kpi, recycling, events, openAlerts] = await Promise.all([
    query('SELECT status, COUNT(*) AS n FROM battery GROUP BY status'),
    query(`SELECT fn_health_grade(current_soh_pct) AS grade, COUNT(*) AS n FROM battery WHERE status <> 'RECYCLED' GROUP BY grade ORDER BY grade`),
    query('SELECT decision, COUNT(*) AS n FROM v_latest_assessment GROUP BY decision'),
    queryOne(`SELECT COUNT(*) AS total, ROUND(AVG(CASE WHEN status = 'IN_SERVICE' THEN current_soh_pct END), 1) AS avg_soh_in_service,
                     ROUND(AVG(CASE WHEN status <> 'RECYCLED' THEN current_soh_pct END), 1) AS avg_soh_active FROM battery`),
    queryOne(`SELECT COUNT(*) AS batteries, COALESCE(SUM(rr.total_input_kg), 0) AS processed_kg,
                     COALESCE((SELECT SUM(quantity_kg) FROM recovered_material), 0) AS recovered_kg FROM recycling_record rr`),
    query(`SELECT e.event_time, e.event_type, e.description, b.serial_number, b.battery_id
           FROM lifecycle_event e JOIN battery b ON b.battery_id = e.battery_id
           ORDER BY e.event_time DESC, e.event_id DESC LIMIT 8`),
    queryOne(`SELECT COUNT(*) AS n FROM battery_alert WHERE status = 'OPEN'`),
  ]);
  let telemetry = null;
  try {
    const col = await telemetryCollection();
    const [last] = await col.find({}, { projection: { ts: 1 } }).sort({ ts: -1 }).limit(1).toArray();
    const count = await col.estimatedDocumentCount();
    let avgTemp24h = null;
    if (last) {
      const [a] = await col.aggregate([
        { $match: { ts: { $gte: new Date(last.ts.getTime() - 24 * 3600e3) } } },
        { $group: { _id: null, avg: { $avg: '$temperature_c' }, max: { $max: '$temperature_c' } } }]).toArray();
      avgTemp24h = a ? { avg: Math.round(a.avg * 10) / 10, max: a.max } : null;
    }
    telemetry = { readings: count, last_reading: last ? last.ts.toISOString() : null, last24h: avgTemp24h };
  } catch (e) { telemetry = { error: e.message }; }
  return { statusCounts, grades, outcomes, kpi, recycling, events, openAlerts: openAlerts.n, telemetry };
});
