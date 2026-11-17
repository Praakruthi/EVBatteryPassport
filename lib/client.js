// Small fetch wrapper used by every page: JSON in/out, throws Error(message) on failure.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/login')) location.href = '/login';
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
export const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString();
export const fmtDate = (s) => (s ? String(s).slice(0, 10) : '—');
export const fmtDT = (s) => (s ? String(s).slice(0, 16).replace('T', ' ') : '—');
export const num = (n, d = 1) => (n === null || n === undefined ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: d }));
