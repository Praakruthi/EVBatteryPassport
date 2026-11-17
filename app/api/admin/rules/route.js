import { route, bad, num } from '@/lib/api';
import { query, withTransaction } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const GET = route(undefined, async () => ({
  rules: await query('SELECT rule_key, rule_value, description, updated_at FROM assessment_rule ORDER BY rule_key'),
  thresholds: await query('SELECT metric, min_value, max_value FROM telemetry_threshold ORDER BY metric'),
  audit: await query(`SELECT changed_at, table_name, record_id, action, old_value, new_value FROM audit_log ORDER BY log_id DESC LIMIT 15`),
}));

// Update rules and thresholds in one transaction (triggers write the audit trail).
export const PUT = route([], async (req) => {
  const b = await req.json();
  await withTransaction(async (conn) => {
    for (const r of b.rules || []) {
      await conn.query('UPDATE assessment_rule SET rule_value = ? WHERE rule_key = ?', [num(r.rule_value, r.rule_key), r.rule_key]);
    }
    for (const t of b.thresholds || []) {
      const min = t.min_value === '' || t.min_value === null ? null : num(t.min_value, `${t.metric} min`);
      const max = t.max_value === '' || t.max_value === null ? null : num(t.max_value, `${t.metric} max`);
      await conn.query('UPDATE telemetry_threshold SET min_value = ?, max_value = ? WHERE metric = ?', [min, max, t.metric]);
    }
  });
  return { ok: true };
});
