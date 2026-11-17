import { route, bad, need, clean, num, dateStr, blank } from '@/lib/api';
import { query, withTransaction } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const GET = route(undefined, async (req) => {
  const sp = new URL(req.url).searchParams;
  const where = [], params = [];
  const q = sp.get('q');
  if (q) { where.push('(serial_number LIKE ? OR manufacturer_name LIKE ? OR model_name LIKE ? OR current_vin LIKE ?)'); params.push(...Array(4).fill(`%${q}%`)); }
  if (sp.get('status')) { where.push('status = ?'); params.push(sp.get('status')); }
  if (sp.get('chemistry')) { where.push('chemistry = ?'); params.push(sp.get('chemistry')); }
  if (sp.get('minSoh')) { where.push('current_soh_pct >= ?'); params.push(Number(sp.get('minSoh'))); }
  if (sp.get('maxSoh')) { where.push('current_soh_pct <= ?'); params.push(Number(sp.get('maxSoh'))); }
  const sortable = { serial: 'serial_number', soh: 'current_soh_pct', cycles: 'total_cycles', age: 'age_months' };
  const order = sortable[sp.get('sort')] || 'serial_number';
  const dir = sp.get('dir') === 'desc' ? 'DESC' : 'ASC';
  const page = Math.max(1, Number(sp.get('page') || 1));
  const size = 15;
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM v_battery_overview ${w}`, params);
  const rows = await query(`SELECT * FROM v_battery_overview ${w} ORDER BY ${order} ${dir} LIMIT ${size} OFFSET ${(page - 1) * size}`, params);
  return { rows, total, page, pages: Math.ceil(total / size) };
});

// Register a battery: battery + initial owner + optional certification in ONE transaction.
export const POST = route(['OPERATOR'], async (req, { user }) => {
  const b = await req.json();
  need(b, ['serial_number', 'model_id', 'manufacture_date']);
  dateStr(b.manufacture_date, 'manufacture_date');
  const id = await withTransaction(async (conn) => {
    const [res] = await conn.query('INSERT INTO battery (serial_number, model_id, manufacture_date, registered_by) VALUES (?, ?, ?, ?)',
      [b.serial_number.trim().toUpperCase(), num(b.model_id, 'model_id'), b.manufacture_date, user.user_id]);
    const batteryId = res.insertId;
    if (!blank(b.owner_id)) {
      await conn.query(`INSERT INTO ownership_record (battery_id, stakeholder_id, from_date, transfer_reason) VALUES (?, ?, ?, 'Initial owner at registration')`,
        [batteryId, num(b.owner_id, 'owner_id'), b.manufacture_date]);
    }
    if (!blank(b.cert_name)) {
      need(b, ['cert_issuing_body', 'cert_number', 'cert_issued_on']);
      await conn.query(`INSERT INTO battery_certification (battery_id, cert_name, issuing_body, certificate_no, issued_on, expires_on) VALUES (?, ?, ?, ?, ?, ?)`,
        [batteryId, b.cert_name, b.cert_issuing_body, b.cert_number, dateStr(b.cert_issued_on, 'cert_issued_on'), clean(b.cert_expires_on)]);
    }
    return batteryId;
  });
  return { battery_id: id };
});
