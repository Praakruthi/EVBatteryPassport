'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmtDate, num } from '@/lib/client';
import { Card, Table, Badge, Msg } from '@/components/ui';

export default function Recycling() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/recycling').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Msg error={err} />;
  if (!d) return <p className="muted">Loading…</p>;
  const link = (r) => <Link href={`/batteries/${r.battery_id}`}>{r.serial_number}</Link>;
  return (
    <>
      <h1>Recycling &amp; recovered materials</h1>
      <p className="sub">Recording a recycling event is one atomic transaction (<code>sp_record_recycling</code>); triggers mark the battery RECYCLED and reject over-recovery.</p>
      <div className="grid g2">
        <Card title="Recovered materials (view v_recycling_material_summary)">
          <Table rows={d.materials} columns={[{ key: 'material', label: 'Material', render: (r) => `${r.material} (${r.symbol})` }, { key: 'is_critical', label: 'Critical', render: (r) => (r.is_critical ? 'Yes' : '') }, { key: 'batteries_processed', label: 'Batteries' }, { key: 'total_recovered_kg', label: 'Total kg', right: true, render: (r) => num(r.total_recovered_kg, 2) }, { key: 'avg_purity_pct', label: 'Avg purity %', right: true }]} />
        </Card>
        <Card title="Ready for end-of-life handling">
          <p className="muted">Batteries removed from service; assessment decision shown if available. Open the passport to record recycling (recycler role).</p>
          <Table rows={d.candidates} columns={[{ key: 'serial_number', label: 'Battery', render: link }, { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> }, { key: 'current_soh_pct', label: 'SOH %' }, { key: 'decision', label: 'Assessment', render: (r) => <Badge value={r.decision} /> }]} />
        </Card>
      </div>
      <Card title="Recycling events">
        <Table rows={d.records} columns={[{ key: 'recycled_on', label: 'Date', render: (r) => fmtDate(r.recycled_on) }, { key: 'serial_number', label: 'Battery', render: link }, { key: 'recycler', label: 'Recycler' }, { key: 'method', label: 'Method', render: (r) => r.method.replaceAll('_', ' ') }, { key: 'total_input_kg', label: 'Input kg', right: true }, { key: 'recovered_kg', label: 'Recovered kg', right: true, render: (r) => num(r.recovered_kg, 2) }, { key: 'recovery_pct', label: 'Recovery %', right: true }]} />
      </Card>
    </>
  );
}
