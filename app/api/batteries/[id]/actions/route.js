import { route, ApiError, bad, need, clean, num, dateStr, blank, today } from '@/lib/api';
import { callProc, query, queryOne, pool } from '@/lib/db';
import { telemetrySummary, toMysqlTs, scanViolations } from '@/lib/telemetry';
export const dynamic = 'force-dynamic';

// Which roles may perform which lifecycle action (ADMIN may do everything).
const ROLES = {
  install: ['OPERATOR'], remove: ['OPERATOR'], transfer: ['OPERATOR'], repair: ['OPERATOR'], certify: ['OPERATOR'],
  refurbish: ['OPERATOR'], 'complete-refurbishment': ['OPERATOR'],
  assess: ['ASSESSOR'], recycle: ['RECYCLER'], 'sync-health': ['OPERATOR', 'ASSESSOR'],
};

export const POST = route(undefined, async (req, { params, user }) => {
  const id = Number(params.id);
  const b = await req.json();
  const allowed = ROLES[b.action];
  if (!allowed) throw bad('Unknown action');
  if (user.role !== 'ADMIN' && !allowed.includes(user.role)) throw new ApiError(403, `Your role (${user.role}) cannot perform "${b.action}"`);

  switch (b.action) {
    case 'install': {
      need(b, ['vehicle_id', 'installed_on']);
      return callProc('sp_install_battery', [id, num(b.vehicle_id, 'vehicle_id'), dateStr(b.installed_on, 'installed_on'), blank(b.odometer_km) ? 0 : num(b.odometer_km, 'odometer_km')]);
    }
    case 'remove': {
      need(b, ['removed_on', 'odometer_km']);
      return callProc('sp_remove_battery', [id, dateStr(b.removed_on, 'removed_on'), num(b.odometer_km, 'odometer_km'), clean(b.reason)]);
    }
    case 'transfer': {
      need(b, ['stakeholder_id', 'date']);
      return callProc('sp_transfer_ownership', [id, num(b.stakeholder_id, 'stakeholder_id'), dateStr(b.date, 'date'), clean(b.reason)]);
    }
    case 'repair': {
      need(b, ['service_stakeholder_id', 'repair_date', 'repair_type', 'description']);
      const [r] = await pool.query(
        `INSERT INTO repair_record (battery_id, service_stakeholder_id, repair_date, repair_type, description, cost, cells_replaced) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, num(b.service_stakeholder_id, 'service_stakeholder_id'), dateStr(b.repair_date, 'repair_date'), b.repair_type, b.description.trim(),
         blank(b.cost) ? 0 : num(b.cost, 'cost'), blank(b.cells_replaced) ? 0 : num(b.cells_replaced, 'cells_replaced')]);
      return { repair_id: r.insertId };
    }
    case 'certify': {
      need(b, ['cert_name', 'issuing_body', 'certificate_no', 'issued_on']);
      const [r] = await pool.query(
        `INSERT INTO battery_certification (battery_id, cert_name, issuing_body, certificate_no, issued_on, expires_on) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, b.cert_name.trim(), b.issuing_body.trim(), b.certificate_no.trim(), dateStr(b.issued_on, 'issued_on'), clean(b.expires_on)]);
      return { cert_id: r.insertId };
    }
    case 'assess':
      return callProc('sp_assess_second_life', [id, user.user_id, null]);
    case 'refurbish': {
      need(b, ['refurbisher_id', 'start_date', 'work_done', 'outcome']);
      const cur = await queryOne('SELECT current_soh_pct FROM battery WHERE battery_id = ?', [id]);
      if (!cur) throw bad('Battery not found');
      const [r] = await pool.query(
        `INSERT INTO refurbishment_record (battery_id, refurbisher_id, start_date, end_date, work_done, soh_before, soh_after, outcome, reuse_application, cost)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, num(b.refurbisher_id, 'refurbisher_id'), dateStr(b.start_date, 'start_date'), clean(b.end_date), b.work_done.trim(),
         blank(b.soh_before) ? cur.current_soh_pct : num(b.soh_before, 'soh_before'), blank(b.soh_after) ? null : num(b.soh_after, 'soh_after'),
         b.outcome, clean(b.reuse_application), blank(b.cost) ? 0 : num(b.cost, 'cost')]);
      return { refurb_id: r.insertId };
    }
    case 'complete-refurbishment': {
      need(b, ['refurb_id', 'end_date', 'soh_after', 'outcome']);
      if (b.outcome === 'IN_PROGRESS') throw bad('Choose a final outcome');
      const [r] = await pool.query(
        `UPDATE refurbishment_record SET end_date = ?, soh_after = ?, outcome = ?, reuse_application = ?
         WHERE refurb_id = ? AND battery_id = ? AND outcome = 'IN_PROGRESS'`,
        [dateStr(b.end_date, 'end_date'), num(b.soh_after, 'soh_after'), b.outcome, clean(b.reuse_application), num(b.refurb_id, 'refurb_id'), id]);
      if (!r.affectedRows) throw bad('No in-progress refurbishment with that id for this battery');
      return { updated: r.affectedRows };
    }
    case 'recycle': {
      need(b, ['recycler_id', 'recycled_on', 'method', 'total_input_kg']);
      const mats = (Array.isArray(b.materials) ? b.materials : []).filter((m) => !blank(m.material_id) && !blank(m.quantity_kg))
        .map((m) => ({ material_id: num(m.material_id, 'material'), quantity_kg: num(m.quantity_kg, 'quantity'), purity_pct: blank(m.purity_pct) ? 90 : num(m.purity_pct, 'purity') }));
      return callProc('sp_record_recycling', [id, num(b.recycler_id, 'recycler_id'), dateStr(b.recycled_on, 'recycled_on'), b.method,
        num(b.total_input_kg, 'total_input_kg'), clean(b.notes), JSON.stringify(mats)]);
    }
    case 'sync-health': {
      // MongoDB aggregation -> MySQL health_record (trigger then refreshes battery.current_soh_pct / total_cycles)
      const days = Math.min(Number(b.days) || 30, 365);
      const s = await telemetrySummary(id, new Date(Date.now() - days * 86400e3));
      if (!s) throw bad(`No telemetry found for this battery in the last ${days} days`);
      const [r] = await pool.query(
        `INSERT INTO health_record (battery_id, recorded_at, soh_pct, cycle_count, avg_temp_c, max_temp_c, source) VALUES (?, ?, ?, ?, ?, ?, 'TELEMETRY_SUMMARY')`,
        [id, toMysqlTs(s.last_ts), Math.round(s.soh * 100) / 100, s.cycles, Math.round(s.avg_temp * 100) / 100, Math.round(s.max_temp * 100) / 100]);
      return { health_id: r.insertId, readings_summarised: s.readings, soh_pct: s.soh, avg_temp_c: s.avg_temp, max_temp_c: s.max_temp };
    }
  }
  throw bad('Unknown action');
});
