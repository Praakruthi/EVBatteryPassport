'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmtDT, num } from '@/lib/client';
import { Card, Stat, Table, Badge, Msg } from '@/components/ui';

function Bars({ items, color = '#0f7a4d' }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return items.map((i) => (
    <div key={i.label} className="row" style={{ marginBottom: 6, flexWrap: 'nowrap' }}>
      <div style={{ width: 150 }}>{i.badge ? <Badge value={i.label} /> : i.label}</div>
      <div className="bar" style={{ flex: 1 }}><span style={{ width: `${(i.n / max) * 100}%`, background: color }} /></div>
      <b style={{ width: 28, textAlign: 'right' }}>{i.n}</b>
    </div>
  ));
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Msg error={err} />;
  if (!d) return <p className="muted">Loading dashboard…</p>;
  const st = Object.fromEntries(d.statusCounts.map((s) => [s.status, s.n]));
  return (
    <>
      <h1>Dashboard</h1>
      <p className="sub">Lifecycle records from MySQL combined with telemetry summaries from MongoDB.</p>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat label="Registered batteries" value={d.kpi.total} sub={`${st.IN_SERVICE || 0} in service`} />
        <Stat label="Avg SOH (in service)" value={`${num(d.kpi.avg_soh_in_service)}%`} sub={`${num(d.kpi.avg_soh_active)}% across all active`} />
        <Stat label="Open alerts" value={d.openAlerts} sub="threshold violations" />
        <Stat label="Recovered materials" value={`${num(d.recycling.recovered_kg)} kg`} sub={`from ${d.recycling.batteries} recycled batteries (${num(d.recycling.processed_kg)} kg processed)`} />
      </div>
      <div className="grid g3">
        <Card title="Batteries by lifecycle status"><Bars items={d.statusCounts.map((s) => ({ label: s.status, n: s.n, badge: true }))} /></Card>
        <Card title="Health grade (A ≥ 90, E < 50)"><Bars color="#2b6cb0" items={d.grades.map((g) => ({ label: `Grade ${g.grade}`, n: g.n }))} /></Card>
        <Card title="Latest assessment outcomes">{d.outcomes.length ? <Bars items={d.outcomes.map((o) => ({ label: o.decision, n: o.n, badge: true }))} /> : <p className="muted">No assessments yet.</p>}</Card>
      </div>
      <div className="grid g2">
        <Card title="Telemetry (MongoDB)">
          {d.telemetry?.error ? <Msg error={d.telemetry.error} /> : (
            <dl className="kv">
              <dt>Stored readings</dt><dd>{num(d.telemetry.readings, 0)}</dd>
              <dt>Latest reading</dt><dd>{fmtDT(d.telemetry.last_reading)} UTC</dd>
              <dt>Last 24h avg temp</dt><dd>{d.telemetry.last24h ? `${d.telemetry.last24h.avg} °C (peak ${d.telemetry.last24h.max} °C)` : '—'}</dd>
            </dl>
          )}
        </Card>
        <Card title="Recent lifecycle events" actions={<Link href="/batteries">All batteries →</Link>}>
          <Table columns={[
            { key: 'event_time', label: 'When', render: (r) => fmtDT(r.event_time).slice(0, 10) },
            { key: 'serial_number', label: 'Battery', render: (r) => <Link href={`/batteries/${r.battery_id}`}>{r.serial_number}</Link> },
            { key: 'event_type', label: 'Event', render: (r) => <Badge value={r.event_type} /> },
          ]} rows={d.events} />
        </Card>
      </div>
    </>
  );
}
