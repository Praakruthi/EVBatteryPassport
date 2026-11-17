import { route } from '@/lib/api';
import { query } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const GET = route(undefined, async () => {
  const [manufacturers, models, vehicles, stakeholders, materials] = await Promise.all([
    query('SELECT manufacturer_id AS id, name AS label FROM manufacturer ORDER BY name'),
    query(`SELECT bm.model_id AS id, CONCAT(m.name, ' - ', bm.model_name, ' (', bm.chemistry, ')') AS label, bm.nominal_voltage_v, bm.chemistry
           FROM battery_model bm JOIN manufacturer m ON m.manufacturer_id = bm.manufacturer_id ORDER BY m.name, bm.model_name`),
    query(`SELECT v.vehicle_id AS id, CONCAT(v.make, ' ', v.model, ' - ', v.vin) AS label,
                  EXISTS (SELECT 1 FROM installation i WHERE i.vehicle_id = v.vehicle_id AND i.removed_on IS NULL) AS occupied
           FROM vehicle v ORDER BY v.vehicle_id`),
    query('SELECT stakeholder_id AS id, CONCAT(name, \' (\', type, \')\') AS label, type FROM stakeholder ORDER BY name'),
    query('SELECT material_id AS id, CONCAT(name, \' (\', symbol, \')\') AS label FROM material ORDER BY name'),
  ]);
  return { manufacturers, models, vehicles, stakeholders, materials };
});
