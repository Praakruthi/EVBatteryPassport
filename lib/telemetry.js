import { telemetryCollection } from '@/lib/mongo';
import { query, pool } from '@/lib/db';
import { bad } from '@/lib/api';

export const METRICS = ['temperature_c', 'voltage_v', 'current_a', 'soc_pct', 'soh_pct'];
export const toMysqlTs = (d) => new Date(d).toISOString().slice(0, 19).replace('T', ' ');

export async function getThresholds() {
  const rows = await query('SELECT metric, min_value, max_value FROM telemetry_threshold');
  return Object.fromEntries(rows.map((r) => [r.metric, r]));
}

export function findViolations(reading, thresholds) {
  const out = [];
  for (const m of METRICS) {
    const t = thresholds[m]; const v = reading[m];
    if (!t || typeof v !== 'number') continue;
    if (t.max_value !== null && v > t.max_value) out.push({ metric: m, value: v, limit: t.max_value, direction: 'ABOVE_MAX', ts: reading.ts });
    if (t.min_value !== null && v < t.min_value) out.push({ metric: m, value: v, limit: t.min_value, direction: 'BELOW_MIN', ts: reading.ts });
  }
  return out;
}

// Store the worst violation per metric/direction as an alert row in MySQL (duplicates ignored by UNIQUE key).
export async function raiseAlerts(batteryId, violations) {
  const worst = new Map();
  for (const v of violations) {
    const k = `${v.metric}|${v.direction}`;
    const dev = Math.abs(v.value - v.limit);
    if (!worst.has(k) || dev > worst.get(k).dev) worst.set(k, { ...v, dev });
  }
  let created = 0;
  for (const v of worst.values()) {
    const [res] = await pool.query(
      `INSERT IGNORE INTO battery_alert (battery_id, metric, observed_value, limit_value, direction, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [batteryId, v.metric, v.value, v.limit, v.direction, toMysqlTs(v.ts)]);
    created += res.affectedRows;
  }
  return created;
}

export function validateReading(r) {
  const out = { ts: r.ts ? new Date(r.ts) : new Date() };
  if (Number.isNaN(out.ts.getTime())) throw bad('Invalid timestamp in reading');
  for (const m of METRICS) {
    const n = Number(r[m]);
    if (r[m] === undefined || r[m] === null || r[m] === '' || Number.isNaN(n)) throw bad(`Reading field "${m}" must be a number`);
    out[m] = n;
  }
  out.cycle_count = Math.round(Number(r.cycle_count ?? 0));
  if (r.extra && typeof r.extra === 'object') out.extra = r.extra;
  return out;
}

export async function ingestReadings(battery, readings) {
  const col = await telemetryCollection();
  const docs = readings.map((r) => ({
    ...validateReading(r),
    battery_id: battery.battery_id,
    serial_number: battery.serial_number,
    source: r.source || 'BMS',
  }));
  let inserted = 0;
  try {
    inserted = (await col.insertMany(docs, { ordered: false })).insertedCount;
  } catch (e) {
    if (e?.result?.insertedCount !== undefined) inserted = e.result.insertedCount; else throw e;
  }
  const thresholds = await getThresholds();
  const violations = docs.flatMap((d) => findViolations(d, thresholds));
  const alerts = await raiseAlerts(battery.battery_id, violations);
  return { inserted, violations: violations.length, alerts_created: alerts };
}

// Simulated BMS readings (project uses simulated telemetry unless a real source is connected).
export function simulateReadings(battery, count, scenario) {
  const n = Math.min(Math.max(Number(count) || 24, 1), 500);
  const now = Date.now();
  const stepMs = 10 * 60 * 1000;
  const volt = Number(battery.nominal_voltage_v) || 350;
  let soc = 50 + Math.random() * 30;
  const out = [];
  for (let i = 0; i < n; i++) {
    soc = Math.min(98, Math.max(10, soc + (Math.random() - 0.55) * 3));
    const current = (Math.random() - 0.5) * 120;
    let temp = 30 + Math.abs(current) / 20 + (Math.random() - 0.5) * 2;
    let s = soc;
    if (scenario === 'overheat' && i >= n - 6) temp = 52 + (i - (n - 6)) * 2.2 + Math.random();
    if (scenario === 'lowsoc' && i >= n - 3) s = 4.2 - (i - (n - 3)) * 0.6;
    out.push({
      ts: new Date(now - (n - 1 - i) * stepMs).toISOString(),
      temperature_c: +temp.toFixed(2),
      voltage_v: +(volt * (0.86 + 0.16 * s / 100) + (Math.random() - 0.5) * 2).toFixed(2),
      current_a: +current.toFixed(2),
      soc_pct: +s.toFixed(2),
      soh_pct: +Number(battery.current_soh_pct).toFixed(2),
      cycle_count: battery.total_cycles,
      source: 'SIMULATED',
      extra: battery.chemistry === 'LFP' ? { cell_voltage_delta_mv: +(8 + Math.random() * 6).toFixed(1) } : { coolant_temp_c: +(temp - 6).toFixed(1) },
    });
  }
  return out;
}

// MongoDB aggregation: time-bucketed summary of one battery.
export async function telemetrySeries(batteryId, { from, to, bucket }) {
  const col = await telemetryCollection();
  const match = { battery_id: batteryId, ts: { $gte: from, $lte: to } };
  if (bucket === 'raw') {
    const docs = await col.find(match, { projection: { _id: 0, extra: 0 } }).sort({ ts: -1 }).limit(500).toArray();
    return docs.reverse().map((d) => ({ t: d.ts.toISOString(), avg_temp: d.temperature_c, max_temp: d.temperature_c,
      min_soc: d.soc_pct, avg_voltage: d.voltage_v, avg_soh: d.soh_pct, max_cycles: d.cycle_count, readings: 1 }));
  }
  const rows = await col.aggregate([
    { $match: match },
    { $group: {
        _id: { $dateTrunc: { date: '$ts', unit: bucket === 'hour' ? 'hour' : 'day' } },
        avg_temp: { $avg: '$temperature_c' }, max_temp: { $max: '$temperature_c' },
        min_soc: { $min: '$soc_pct' }, avg_voltage: { $avg: '$voltage_v' },
        avg_soh: { $avg: '$soh_pct' }, max_cycles: { $max: '$cycle_count' }, readings: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  const r1 = (x) => Math.round(x * 100) / 100;
  return rows.map((r) => ({ t: r._id.toISOString(), avg_temp: r1(r.avg_temp), max_temp: r1(r.max_temp), min_soc: r1(r.min_soc),
    avg_voltage: r1(r.avg_voltage), avg_soh: r1(r.avg_soh), max_cycles: r.max_cycles, readings: r.readings }));
}

// MongoDB aggregation used to build a MySQL health_record (telemetry summary).
export async function telemetrySummary(batteryId, since) {
  const col = await telemetryCollection();
  const [s] = await col.aggregate([
    { $match: { battery_id: batteryId, ts: { $gte: since } } },
    { $sort: { ts: 1 } },
    { $group: { _id: null, avg_temp: { $avg: '$temperature_c' }, max_temp: { $max: '$temperature_c' },
        soh: { $last: '$soh_pct' }, cycles: { $max: '$cycle_count' }, last_ts: { $max: '$ts' }, readings: { $sum: 1 } } },
  ]).toArray();
  return s || null;
}

export async function scanViolations(batteryId, since) {
  const col = await telemetryCollection();
  const thresholds = await getThresholds();
  const or = [];
  for (const m of METRICS) {
    const t = thresholds[m]; if (!t) continue;
    if (t.max_value !== null) or.push({ [m]: { $gt: t.max_value } });
    if (t.min_value !== null) or.push({ [m]: { $lt: t.min_value } });
  }
  const docs = await col.find({ battery_id: batteryId, ts: { $gte: since }, $or: or }).toArray();
  const violations = docs.flatMap((d) => findViolations(d, thresholds));
  return { violations: violations.length, alerts_created: await raiseAlerts(batteryId, violations) };
}
