import { route } from '@/lib/api';
import { query } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const GET = route(undefined, async (req) => {
  const latest = new URL(req.url).searchParams.get('latest') === '1';
  const src = latest ? 'v_latest_assessment' : 'second_life_assessment';
  return query(`SELECT a.assessment_id, a.battery_id, b.serial_number, b.status AS battery_status, a.assessed_on, a.soh_pct, a.score, a.decision, a.explanation, u.username AS assessor
                FROM ${src} a JOIN battery b ON b.battery_id = a.battery_id JOIN app_user u ON u.user_id = a.assessed_by
                ORDER BY a.assessed_on DESC`);
});
