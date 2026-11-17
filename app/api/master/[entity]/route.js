import { route, bad, clean, blank } from '@/lib/api';
import { query, pool } from '@/lib/db';
import { ENTITIES } from '@/lib/master';
export const dynamic = 'force-dynamic';

function entityOf(params) {
  const e = ENTITIES[params.entity];
  if (!e) throw bad('Unknown master-data entity');
  return e;
}

export const GET = route(undefined, async (req, { params }) => {
  const e = entityOf(params);
  return { label: e.label, pk: e.pk, fields: e.fields, rows: await query(e.list) };
});

export const POST = route(['OPERATOR'], async (req, { params }) => {
  const e = entityOf(params);
  const body = await req.json();
  const cols = [], vals = [];
  for (const f of e.fields) {
    if (f.required && blank(body[f.name])) throw bad(`${f.label} is required`);
    if (!blank(body[f.name])) { cols.push(f.name); vals.push(clean(body[f.name])); }
  }
  const [res] = await pool.query(`INSERT INTO ${e.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);
  return { id: res.insertId };
});

export const DELETE = route([], async (req, { params }) => {
  const e = entityOf(params);
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) throw bad('id is required');
  const [res] = await pool.query(`DELETE FROM ${e.table} WHERE ${e.pk} = ?`, [id]);
  return { deleted: res.affectedRows };
});
