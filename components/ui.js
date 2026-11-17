'use client';

const BADGE = {
  IN_SERVICE: 'green', SECOND_LIFE: 'blue', REFURBISHED: 'purple', REMOVED: 'amber', MANUFACTURED: 'grey', RECYCLED: 'grey',
  SECOND_LIFE_ELIGIBLE: 'green', REFURBISH_FIRST: 'amber', RECYCLE: 'red',
  OPEN: 'red', ACKNOWLEDGED: 'grey', IN_PROGRESS: 'amber', REUSED_STATIONARY: 'green', REUSED_VEHICLE: 'green', FAILED: 'red',
  A: 'green', B: 'green', C: 'amber', D: 'amber', E: 'red',
  ABOVE_MAX: 'red', BELOW_MIN: 'amber',
};
export function Badge({ value }) {
  if (value === null || value === undefined) return '—';
  return <span className={`badge b-${BADGE[value] || 'grey'}`}>{String(value).replaceAll('_', ' ')}</span>;
}

export function Card({ title, actions, children }) {
  return (
    <section className="card">
      {(title || actions) && <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>{title && <h2 style={{ margin: 0 }}>{title}</h2>}<div className="row">{actions}</div></div>}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }) {
  return <div className="card stat" style={{ marginBottom: 0 }}><div className="v">{value}</div><div className="l">{label}</div>{sub && <div className="muted" style={{ fontSize: 12 }}>{sub}</div>}</div>;
}

export function Msg({ error, ok }) {
  if (error) return <div className="msg err">{error}</div>;
  if (ok) return <div className="msg ok">{ok}</div>;
  return null;
}

export function Table({ columns, rows, onRowClick, empty = 'No records.' }) {
  if (!rows || !rows.length) return <p className="muted">{empty}</p>;
  return (
    <div className="scroll">
      <table>
        <thead><tr>{columns.map((c) => <th key={c.key} className={c.right ? 'right' : ''}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={onRowClick ? 'click' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {columns.map((c) => <td key={c.key} className={c.right ? 'right' : ''}>{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Render an arbitrary result set (used by the reports page).
export function AutoTable({ rows }) {
  if (!rows?.length) return <p className="muted">No rows returned.</p>;
  const keys = Object.keys(rows[0]);
  return <Table columns={keys.map((k) => ({ key: k, label: k.replaceAll('_', ' '), render: (r) => (['status', 'decision', 'indicative_outcome'].includes(k) ? <Badge value={String(r[k]).replaceAll(' ', '_')} /> : String(r[k] ?? '—')) }))} rows={rows} />;
}

export function SohBar({ value }) {
  const v = Number(value);
  const color = v >= 80 ? '#0f7a4d' : v >= 60 ? '#b7791f' : '#c53030';
  return <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><div className="bar" style={{ width: 70 }}><span style={{ width: `${v}%`, background: color }} /></div><b>{v}%</b></div>;
}
