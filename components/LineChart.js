'use client';
// Dependency-free SVG line chart. series = [{key,label,color}], data = [{t, ...values}]
export default function LineChart({ data, series, height = 200, unit = '' }) {
  if (!data?.length) return <p className="muted">No data in this range.</p>;
  const W = 720, H = height, P = { l: 44, r: 10, t: 10, b: 24 };
  const vals = data.flatMap((d) => series.map((s) => d[s.key])).filter((v) => typeof v === 'number');
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const x = (i) => P.l + (data.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (data.length - 1));
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + f * (hi - lo));
  const lbl = (t) => String(t).slice(5, 16).replace('T', ' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {ticks.map((tk, i) => (<g key={i}><line x1={P.l} x2={W - P.r} y1={y(tk)} y2={y(tk)} stroke="#e3ebe6" /><text x={P.l - 6} y={y(tk) + 4} fontSize="10" textAnchor="end" fill="#5d6f66">{tk.toFixed(1)}</text></g>))}
        {series.map((s) => (
          <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round"
            points={data.map((d, i) => (typeof d[s.key] === 'number' ? `${x(i)},${y(d[s.key])}` : null)).filter(Boolean).join(' ')} />
        ))}
        {data.length > 0 && <text x={P.l} y={H - 6} fontSize="10" fill="#5d6f66">{lbl(data[0].t)}</text>}
        {data.length > 1 && <text x={W - P.r} y={H - 6} fontSize="10" textAnchor="end" fill="#5d6f66">{lbl(data[data.length - 1].t)}</text>}
      </svg>
      <div className="row" style={{ gap: 14, fontSize: 12.5 }}>
        {series.map((s) => <span key={s.key}><span style={{ display: 'inline-block', width: 12, height: 3, background: s.color, marginRight: 5, verticalAlign: 'middle' }} />{s.label}{unit}</span>)}
      </div>
    </div>
  );
}
