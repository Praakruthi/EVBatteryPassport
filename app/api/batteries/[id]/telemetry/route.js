import { route, bad } from '@/lib/api';
import { queryOne } from '@/lib/db';
import { telemetrySeries, simulateReadings, ingestReadings, scanViolations } from '@/lib/telemetry';
export const dynamic = 'force-dynamic';

export const GET = route(undefined, async (req, { params }) => {
  const id = Number(params.id);
  const sp = new URL(req.url).searchParams;
  const bucket = ['raw', 'hour', 'day'].includes(sp.get('bucket')) ? sp.get('bucket') : 'day';
  const days = Math.min(Number(sp.get('days')) || 60, 3650);
  let to = sp.get('to') ? new Date(sp.get('to')) : null;
  // default window ends at the newest stored reading so historic batteries also show data
  if (!to) {
    const { telemetryCollection } = await import('@/lib/mongo');
    const [last] = await (await telemetryCollection()).find({ battery_id: id }, { projection: { ts: 1 } }).sort({ ts: -1 }).limit(1).toArray();
    to = last ? last.ts : new Date();
  }
  const from = sp.get('from') ? new Date(sp.get('from')) : new Date(to.getTime() - days * 86400e3);
  return { bucket, from: from.toISOString(), to: to.toISOString(), series: await telemetrySeries(id, { from, to, bucket }) };
});

export const POST = route(['OPERATOR'], async (req, { params }) => {
  const id = Number(params.id);
  const body = await req.json();
  const battery = await queryOne(
    `SELECT b.battery_id, b.serial_number, b.current_soh_pct, b.total_cycles, bm.nominal_voltage_v, bm.chemistry
     FROM battery b JOIN battery_model bm ON bm.model_id = b.model_id WHERE b.battery_id = ?`, [id]);
  if (!battery) throw bad('Battery not found');
  if (body.scan) return scanViolations(id, new Date(Date.now() - (Math.min(Number(body.days) || 365, 3650)) * 86400e3));
  if (body.simulate) return ingestReadings(battery, simulateReadings(battery, body.simulate.count, body.simulate.scenario));
  if (Array.isArray(body.readings) && body.readings.length) return ingestReadings(battery, body.readings.slice(0, 1000));
  throw bad('Provide "readings", "simulate" or "scan"');
});
