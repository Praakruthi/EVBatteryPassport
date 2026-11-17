import { route, bad, need, clean } from '@/lib/api';
import { query, pool } from '@/lib/db';
import { hashPassword } from '@/lib/password';
export const dynamic = 'force-dynamic';

const ROLE_LIST = ['ADMIN', 'OPERATOR', 'ASSESSOR', 'RECYCLER'];

export const GET = route([], async () =>
  query(`SELECT u.user_id, u.username, u.email, u.role, u.is_active, u.last_login, s.name AS organisation
         FROM app_user u LEFT JOIN stakeholder s ON s.stakeholder_id = u.stakeholder_id ORDER BY u.user_id`));

export const POST = route([], async (req) => {
  const b = await req.json();
  need(b, ['username', 'email', 'password', 'role']);
  if (!ROLE_LIST.includes(b.role)) throw bad('Invalid role');
  if (String(b.password).length < 8) throw bad('Password must be at least 8 characters');
  const [r] = await pool.query('INSERT INTO app_user (username, email, password_hash, role, stakeholder_id) VALUES (?, ?, ?, ?, ?)',
    [b.username.trim(), b.email.trim(), hashPassword(b.password), b.role, clean(b.stakeholder_id)]);
  return { user_id: r.insertId };
});

export const PATCH = route([], async (req, { user }) => {
  const b = await req.json();
  need(b, ['user_id']);
  if (Number(b.user_id) === user.user_id && (b.is_active === false || (b.role && b.role !== 'ADMIN'))) throw bad('You cannot deactivate or demote your own account');
  const sets = [], vals = [];
  if (b.role) { if (!ROLE_LIST.includes(b.role)) throw bad('Invalid role'); sets.push('role = ?'); vals.push(b.role); }
  if (typeof b.is_active === 'boolean') { sets.push('is_active = ?'); vals.push(b.is_active ? 1 : 0); }
  if (b.password) { if (String(b.password).length < 8) throw bad('Password must be at least 8 characters'); sets.push('password_hash = ?'); vals.push(hashPassword(b.password)); }
  if (!sets.length) throw bad('Nothing to update');
  const [r] = await pool.query(`UPDATE app_user SET ${sets.join(', ')} WHERE user_id = ?`, [...vals, Number(b.user_id)]);
  return { updated: r.affectedRows };
});
