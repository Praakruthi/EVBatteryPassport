import { route } from '@/lib/api';
import { query } from '@/lib/db';
export const dynamic = 'force-dynamic';

// MySQL FULLTEXT (BOOLEAN MODE) over repair descriptions, assessment explanations and refurbishment notes.
export const GET = route(undefined, async (req) => {
  const raw = (new URL(req.url).searchParams.get('q') || '').trim();
  const terms = raw.replace(/[+\-<>()~*"@]/g, ' ').split(/\s+/).filter((t) => t.length >= 2);
  if (!terms.length) return { batteries: [], repairs: [], assessments: [], refurbishments: [] };
  const boolQ = terms.map((t) => `${t}*`).join(' ');
  const [batteries, repairs, assessments, refurbishments] = await Promise.all([
    query(`SELECT battery_id, serial_number, manufacturer_name, model_name, status, current_soh_pct FROM v_battery_overview
           WHERE serial_number LIKE ? OR manufacturer_name LIKE ? OR model_name LIKE ? LIMIT 20`, Array(3).fill(`%${raw}%`)),
    query(`SELECT r.repair_id, r.battery_id, b.serial_number, r.repair_date, r.repair_type, r.description,
                  MATCH(r.description) AGAINST (? IN BOOLEAN MODE) AS relevance
           FROM repair_record r JOIN battery b ON b.battery_id = r.battery_id
           WHERE MATCH(r.description) AGAINST (? IN BOOLEAN MODE) ORDER BY relevance DESC LIMIT 20`, [boolQ, boolQ]),
    query(`SELECT a.assessment_id, a.battery_id, b.serial_number, a.decision, a.explanation,
                  MATCH(a.explanation) AGAINST (? IN BOOLEAN MODE) AS relevance
           FROM second_life_assessment a JOIN battery b ON b.battery_id = a.battery_id
           WHERE MATCH(a.explanation) AGAINST (? IN BOOLEAN MODE) ORDER BY relevance DESC LIMIT 20`, [boolQ, boolQ]),
    query(`SELECT f.refurb_id, f.battery_id, b.serial_number, f.outcome, f.work_done,
                  MATCH(f.work_done) AGAINST (? IN BOOLEAN MODE) AS relevance
           FROM refurbishment_record f JOIN battery b ON b.battery_id = f.battery_id
           WHERE MATCH(f.work_done) AGAINST (? IN BOOLEAN MODE) ORDER BY relevance DESC LIMIT 20`, [boolQ, boolQ]),
  ]);
  return { batteries, repairs, assessments, refurbishments };
});
