import { route } from '@/lib/api';
import { query } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const GET = route(undefined, async () => {
  const [records, materials, candidates] = await Promise.all([
    query(`SELECT rr.recycling_id, rr.battery_id, b.serial_number, rr.recycled_on, rr.method, rr.total_input_kg, s.name AS recycler,
                  COALESCE(SUM(rm.quantity_kg), 0) AS recovered_kg,
                  ROUND(100 * COALESCE(SUM(rm.quantity_kg), 0) / rr.total_input_kg, 1) AS recovery_pct
           FROM recycling_record rr JOIN battery b ON b.battery_id = rr.battery_id JOIN stakeholder s ON s.stakeholder_id = rr.recycler_id
           LEFT JOIN recovered_material rm ON rm.recycling_id = rr.recycling_id
           GROUP BY rr.recycling_id, rr.battery_id, b.serial_number, rr.recycled_on, rr.method, rr.total_input_kg, s.name
           ORDER BY rr.recycled_on DESC`),
    query('SELECT * FROM v_recycling_material_summary ORDER BY total_recovered_kg DESC'),
    query(`SELECT b.battery_id, b.serial_number, b.status, b.current_soh_pct, la.decision
           FROM battery b LEFT JOIN v_latest_assessment la ON la.battery_id = b.battery_id
           WHERE b.status IN ('REMOVED','REFURBISHED','SECOND_LIFE') ORDER BY (la.decision = 'RECYCLE') DESC, b.current_soh_pct`),
  ]);
  return { records, materials, candidates };
});
