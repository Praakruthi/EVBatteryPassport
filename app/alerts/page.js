'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, fmtDT } from '@/lib/client';
import { Card, Table, Badge, Msg } from '@/components/ui';
import { useUser } from '@/components/Shell';

export default function Alerts() {
  const user = useUser();
  const [status, setStatus] = useState('OPEN');
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const load = useCallback(() => { api(`/api/alerts${status ? `?status=${status}` : ''}`).then(setRows).catch((e) => setErr(e.message)); }, [status]);
  useEffect(() => { load(); }, [load]);
  const canAck = ['ADMIN', 'OPERATOR', 'ASSESSOR'].includes(user.role);
  async function ack(r) {
    const note = prompt('Acknowledgement note (optional):') ?? null;
    if (note === null) return;
    try { await api('/api/alerts', { method: 'PATCH', body: { alert_id: r.alert_id, note } }); load(); } catch (e) { setErr(e.message); }
  }
  return (
    <>
      <h1>Threshold alerts</h1>
      <p className="sub">Raised when telemetry in MongoDB breaches the limits configured in MySQL (see Admin → thresholds).</p>
      <Card actions={<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="OPEN">Open</option><option value="ACKNOWLEDGED">Acknowledged</option><option value="">All</option></select>}>
        <Msg error={err} />
        <Table rows={rows} empty="No alerts." columns={[
          { key: 'recorded_at', label: 'Recorded', render: (r) => fmtDT(r.recorded_at) },
          { key: 'serial_number', label: 'Battery', render: (r) => <Link href={`/batteries/${r.battery_id}`}>{r.serial_number}</Link> },
          { key: 'metric', label: 'Metric' },
          { key: 'direction', label: 'Breach', render: (r) => <Badge value={r.direction} /> },
          { key: 'observed_value', label: 'Observed' }, { key: 'limit_value', label: 'Limit' },
          { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
          { key: 'note', label: 'Note', render: (r) => r.note ? `${r.note} (${r.acknowledged_by_name})` : (r.acknowledged_by_name || '—') },
          { key: 'a', label: '', render: (r) => (r.status === 'OPEN' && canAck ? <button className="secondary" onClick={() => ack(r)}>Acknowledge</button> : '') },
        ]} />
      </Card>
    </>
  );
}
