import { route, bad } from '@/lib/api';
import { query, queryOne, pool } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const GET = route(undefined, async (req, { params }) => {
  const id = Number(params.id);
  const battery = await queryOne('SELECT * FROM v_battery_overview WHERE battery_id = ?', [id]);
  if (!battery) throw Object.assign(bad('Battery not found'), { status: 404 });
  const [materials, timeline, installations, ownership, repairs, certifications, health, assessments, refurbishments, recycling, alerts] = await Promise.all([
    query(`SELECT mt.name, mt.symbol, mm.content_kg FROM model_material mm JOIN material mt ON mt.material_id = mm.material_id WHERE mm.model_id = ? ORDER BY mm.content_kg DESC`, [battery.model_id]),
    query('SELECT event_time, event_type, description FROM lifecycle_event WHERE battery_id = ? ORDER BY event_time, event_id', [id]),
    query(`SELECT i.*, v.vin, CONCAT(v.make, ' ', v.model) AS vehicle FROM installation i JOIN vehicle v ON v.vehicle_id = i.vehicle_id WHERE i.battery_id = ? ORDER BY i.installed_on`, [id]),
    query(`SELECT o.*, s.name AS owner, s.type FROM ownership_record o JOIN stakeholder s ON s.stakeholder_id = o.stakeholder_id WHERE o.battery_id = ? ORDER BY o.from_date, o.ownership_id`, [id]),
    query(`SELECT r.*, s.name AS service_center FROM repair_record r JOIN stakeholder s ON s.stakeholder_id = r.service_stakeholder_id WHERE r.battery_id = ? ORDER BY r.repair_date`, [id]),
    query('SELECT * FROM battery_certification WHERE battery_id = ? ORDER BY issued_on', [id]),
    query('SELECT * FROM health_record WHERE battery_id = ? ORDER BY recorded_at', [id]),
    query(`SELECT a.*, u.username AS assessor FROM second_life_assessment a JOIN app_user u ON u.user_id = a.assessed_by WHERE a.battery_id = ? ORDER BY a.assessed_on DESC`, [id]),
    query(`SELECT f.*, s.name AS refurbisher FROM refurbishment_record f JOIN stakeholder s ON s.stakeholder_id = f.refurbisher_id WHERE f.battery_id = ? ORDER BY f.start_date`, [id]),
    query(`SELECT r.*, s.name AS recycler FROM recycling_record r JOIN stakeholder s ON s.stakeholder_id = r.recycler_id WHERE r.battery_id = ?`, [id]),
    query('SELECT * FROM battery_alert WHERE battery_id = ? ORDER BY recorded_at DESC LIMIT 20', [id]),
  ]);
  let recovered = [];
  if (recycling[0]) {
    recovered = await query(`SELECT mt.name, mt.symbol, rm.quantity_kg, rm.purity_pct FROM recovered_material rm JOIN material mt ON mt.material_id = rm.material_id WHERE rm.recycling_id = ? ORDER BY rm.quantity_kg DESC`, [recycling[0].recycling_id]);
  }
  return { battery, materials, timeline, installations, ownership, repairs, certifications, health, assessments, refurbishments, recycling: recycling[0] || null, recovered, alerts };
});

// Only batteries with no history can be deleted (FK RESTRICT protects traceability).
export const DELETE = route([], async (req, { params }) => {
  const [res] = await pool.query('DELETE FROM battery WHERE battery_id = ?', [Number(params.id)]);
  return { deleted: res.affectedRows };
});
