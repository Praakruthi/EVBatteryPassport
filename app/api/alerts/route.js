import { route, bad } from '@/lib/api';
import { query, pool } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const GET = route(undefined, async (req) => {
  const status = new URL(req.url).searchParams.get('status');
  const w = status ? 'WHERE a.status = ?' : '';
  return query(`SELECT a.*, b.serial_number, u.username AS acknowledged_by_name
                FROM battery_alert a JOIN battery b ON b.battery_id = a.battery_id
                LEFT JOIN app_user u ON u.user_id = a.acknowledged_by
                ${w} ORDER BY a.status, a.recorded_at DESC LIMIT 200`, status ? [status] : []);
});

export const PATCH = route(['OPERATOR', 'ASSESSOR'], async (req, { user }) => {
  const { alert_id, note } = await req.json();
  if (!alert_id) throw bad('alert_id is required');
  const [r] = await pool.query(`UPDATE battery_alert SET status = 'ACKNOWLEDGED', acknowledged_by = ?, note = ? WHERE alert_id = ? AND status = 'OPEN'`,
    [user.user_id, note || null, Number(alert_id)]);
  return { updated: r.affectedRows };
});
