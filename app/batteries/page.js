'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, qs, fmtDate } from '@/lib/client';
import { Card, Table, Badge, SohBar, Msg } from '@/components/ui';
import { useUser } from '@/components/Shell';

const STATUSES = ['MANUFACTURED', 'IN_SERVICE', 'REMOVED', 'REFURBISHED', 'SECOND_LIFE', 'RECYCLED'];

export default function Batteries() {
  const router = useRouter();
  const user = useUser();
  const [f, setF] = useState({ q: '', status: '', chemistry: '', minSoh: '', maxSoh: '', sort: 'serial', dir: 'asc', page: 1 });
  const [data, setData] = useState({ rows: [], total: 0, pages: 1 });
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api(`/api/batteries?${qs(f)}`).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message));
  }, [f]);
  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v, page: k === 'page' ? v : 1 }));

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><h1>Batteries</h1><p className="sub">{data.total} batteries match. Click a row to open its passport.</p></div>
        {['ADMIN', 'OPERATOR'].includes(user.role) && <Link className="btn" href="/batteries/new">+ Register battery</Link>}
      </div>
      <Card>
        <div className="filters">
          <div style={{ flex: 1, minWidth: 220 }}><label>Search</label><input placeholder="serial, manufacturer, model, VIN…" value={f.q} onChange={(e) => set('q', e.target.value)} /></div>
          <div><label>Status</label><select value={f.status} onChange={(e) => set('status', e.target.value)}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select></div>
          <div><label>Chemistry</label><select value={f.chemistry} onChange={(e) => set('chemistry', e.target.value)}><option value="">All</option>{['LFP', 'NMC', 'NCA', 'LTO', 'LMO'].map((c) => <option key={c}>{c}</option>)}</select></div>
          <div style={{ minWidth: 90 }}><label>SOH min %</label><input type="number" value={f.minSoh} onChange={(e) => set('minSoh', e.target.value)} /></div>
          <div style={{ minWidth: 90 }}><label>SOH max %</label><input type="number" value={f.maxSoh} onChange={(e) => set('maxSoh', e.target.value)} /></div>
          <div><label>Sort by</label>
            <select value={`${f.sort}:${f.dir}`} onChange={(e) => { const [s, d] = e.target.value.split(':'); setF((p) => ({ ...p, sort: s, dir: d })); }}>
              <option value="serial:asc">Serial A→Z</option><option value="soh:asc">SOH low→high</option><option value="soh:desc">SOH high→low</option>
              <option value="cycles:desc">Most cycles</option><option value="age:desc">Oldest</option>
            </select></div>
        </div>
      </Card>
      <Msg error={err} />
      <Card>
        <Table onRowClick={(r) => router.push(`/batteries/${r.battery_id}`)} rows={data.rows} columns={[
          { key: 'serial_number', label: 'Serial', render: (r) => <b>{r.serial_number}</b> },
          { key: 'manufacturer_name', label: 'Manufacturer' },
          { key: 'model_name', label: 'Model', render: (r) => `${r.model_name} (${r.chemistry})` },
          { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
          { key: 'current_soh_pct', label: 'SOH', render: (r) => <SohBar value={r.current_soh_pct} /> },
          { key: 'health_grade', label: 'Grade', render: (r) => <Badge value={r.health_grade} /> },
          { key: 'total_cycles', label: 'Cycles', render: (r) => `${r.total_cycles} (${r.cycle_life_used_pct}%)` },
          { key: 'current_owner', label: 'Owner' },
          { key: 'manufacture_date', label: 'Made', render: (r) => fmtDate(r.manufacture_date) },
        ]} />
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <span className="muted">Page {data.page || 1} of {data.pages || 1}</span>
          <div className="row"><button className="secondary" disabled={f.page <= 1} onClick={() => set('page', f.page - 1)}>← Prev</button>
            <button className="secondary" disabled={f.page >= (data.pages || 1)} onClick={() => set('page', f.page + 1)}>Next →</button></div>
        </div>
      </Card>
    </>
  );
}
