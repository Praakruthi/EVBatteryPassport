import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const bad = (msg) => new ApiError(400, msg);

// Translate MySQL / Mongo errors into friendly HTTP responses.
export function errorResponse(e) {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
  const map = { 1644: 400, 3819: 400, 1062: 409, 1452: 400, 1451: 409, 1048: 400, 1264: 400, 1265: 400, 1292: 400, 1406: 400, 1366: 400 };
  if (e?.errno && map[e.errno]) {
    const prefix = { 1062: 'Duplicate value: ', 1452: 'Invalid reference: ', 1451: 'Cannot delete, record is referenced elsewhere: ',
                     3819: 'Validation rule violated: ', 1048: 'Missing required value: ' }[e.errno] || '';
    return NextResponse.json({ error: prefix + (e.sqlMessage || e.message), code: e.errno }, { status: map[e.errno] });
  }
  if (e?.code === 11000) return NextResponse.json({ error: 'Duplicate document (battery/timestamp already stored)' }, { status: 409 });
  if (e?.code === 121) return NextResponse.json({ error: 'MongoDB document validation failed' }, { status: 400 });
  console.error(e);
  return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
}

// Wrap a handler: authentication + role-based authorisation + error mapping.
// roles = undefined -> any authenticated user; ADMIN is always allowed.
export function route(roles, fn) {
  return async (req, ctx) => {
    try {
      const user = await getSessionUser(req);
      if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      if (roles && user.role !== 'ADMIN' && !roles.includes(user.role)) {
        return NextResponse.json({ error: `Your role (${user.role}) is not allowed to do this` }, { status: 403 });
      }
      const params = ctx?.params ? await ctx.params : {};
      const out = await fn(req, { params, user });
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

// ---- tiny input helpers ----
export const blank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
export const clean = (v) => (blank(v) ? null : typeof v === 'string' ? v.trim() : v);
export function need(body, fields) {
  for (const f of fields) if (blank(body[f])) throw bad(`Field "${f}" is required`);
}
export function num(v, name) {
  const n = Number(v);
  if (blank(v) || Number.isNaN(n)) throw bad(`"${name}" must be a number`);
  return n;
}
export function dateStr(v, name) {
  if (blank(v) || !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw bad(`"${name}" must be a date (YYYY-MM-DD)`);
  return String(v);
}
export const today = () => new Date().toISOString().slice(0, 10);
