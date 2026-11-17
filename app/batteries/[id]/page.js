'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, qs, fmtDate, fmtDT, num } from '@/lib/client';
import { Card, Table, Badge, SohBar, Msg } from '@/components/ui';
import LineChart from '@/components/LineChart';
import ActionForm from '@/components/ActionForm';
import { useUser } from '@/components/Shell';

const TABS = ['Overview', 'Telemetry', 'Health', 'History', 'Assessment & end of life'];
const today = () => new Date().toISOString().slice(0, 10);

export default function BatteryPassport() {
  const { id } = useParams();
  const router = useRouter();
  const user = useUser();
  const [d, setD] = useState(null);
  const [lk, setLk] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api(`/api/batteries/${id}`).then((x) => { setD(x); setErr(''); }).catch((e) => setErr(e.message));
  }, [id]);
  useEffect(() => { load(); api('/api/lookups').then(setLk); }, [load]);

  const can = (...roles) => user.role === 'ADMIN' || roles.includes(user.role);
  if (err) return <Msg error={err} />;
  if (!d) return <p className="muted">Loading passport…</p>;
  const b = d.battery;
  const inProgress = d.refurbishments.filter((r) => r.outcome === 'IN_PROGRESS');
  const ft = (type) => (o) => o.type === type;

  async function remove() {
    if (!confirm(`Delete battery ${b.serial_number}? This only works for batteries with no history.`)) return;
    try { await api(`/api/batteries/${id}`, { method: 'DELETE' }); router.push('/batteries'); } catch (e) { alert(e.message); }
  }

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <Link href="/batteries">← Batteries</Link>
          <h1>{b.serial_number} <Badge value={b.status} /></h1>
          <p className="sub">{b.manufacturer_name} {b.model_name} · {b.chemistry} · {b.nominal_capacity_kwh} kWh · manufactured {fmtDate(b.manufacture_date)}</p>
        </div>
        {user.role === 'ADMIN' && <button className="danger" onClick={remove}>Delete</button>}
      </div>

      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="card" style={{ marginBottom: 0 }}><div className="muted">State of health</div><SohBar value={b.current_soh_pct} /><div>Grade <Badge value={b.health_grade} /></div></div>
        <div className="card" style={{ marginBottom: 0 }}><div className="muted">Cycles</div><b style={{ fontSize: 22 }}>{b.total_cycles}</b><div className="muted">{b.cycle_life_used_pct}% of {b.rated_cycle_life} rated</div></div>
        <div className="card" style={{ marginBottom: 0 }}><div className="muted">Current vehicle</div><b>{b.current_vin || 'Not installed'}</b></div>
        <div className="card" style={{ marginBottom: 0 }}><div className="muted">Current owner</div><b>{b.current_owner || '—'}</b></div>
      </div>

      <div className="tabs">{TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>

      {tab === 'Overview' && (
        <div className="grid g2">
          <Card title="Lifecycle timeline (written automatically by database triggers)">
            <ul className="timeline">
              {d.timeline.map((e, i) => (
                <li key={i}><div className="t">{fmtDate(e.event_time)} · <Badge value={e.event_type} /></div>{e.description}</li>
              ))}
            </ul>
          </Card>
          <div>
            <Card title="Certifications">
              <Table rows={d.certifications} columns={[{ key: 'cert_name', label: 'Certificate' }, { key: 'issuing_body', label: 'Body' }, { key: 'certificate_no', label: 'No.' }, { key: 'issued_on', label: 'Issued' }, { key: 'expires_on', label: 'Expires', render: (r) => fmtDate(r.expires_on) }]} />
              {can('OPERATOR') && <div style={{ marginTop: 10 }}><ActionForm title="Add certification" action="certify" batteryId={id} onDone={load} fields={[
                { name: 'cert_name', label: 'Certificate name', required: true }, { name: 'issuing_body', label: 'Issuing body', required: true },
                { name: 'certificate_no', label: 'Certificate no.', required: true }, { name: 'issued_on', label: 'Issued on', type: 'date', required: true, def: today() },
                { name: 'expires_on', label: 'Expires on', type: 'date' }]} /></div>}
            </Card>
            <Card title="Material composition of this model (kg per pack)">
              <Table rows={d.materials} columns={[{ key: 'name', label: 'Material' }, { key: 'symbol', label: 'Symbol' }, { key: 'content_kg', label: 'kg', right: true }]} />
            </Card>
          </div>
        </div>
      )}

      {tab === 'Telemetry' && <TelemetryPanel id={id} canIngest={can('OPERATOR')} canSync={can('OPERATOR', 'ASSESSOR')} onChange={load} />}

      {tab === 'Health' && (
        <Card title="Health records (MySQL)">
          <LineChart data={d.health.map((h) => ({ t: h.recorded_at, soh: h.soh_pct }))} series={[{ key: 'soh', label: 'SOH %', color: '#0f7a4d' }]} />
          <div style={{ marginTop: 14 }}>
            <Table rows={[...d.health].reverse()} columns={[
              { key: 'recorded_at', label: 'Recorded', render: (r) => fmtDT(r.recorded_at) }, { key: 'soh_pct', label: 'SOH %' }, { key: 'cycle_count', label: 'Cycles' },
              { key: 'avg_temp_c', label: 'Avg °C' }, { key: 'max_temp_c', label: 'Max °C' }, { key: 'source', label: 'Source', render: (r) => <Badge value={r.source} /> }]} />
          </div>
        </Card>
      )}

      {tab === 'History' && (
        <>
          <div className="grid g2">
            <Card title="Vehicle installations">
              <Table rows={d.installations} columns={[{ key: 'vehicle', label: 'Vehicle', render: (r) => `${r.vehicle} (${r.vin})` }, { key: 'installed_on', label: 'In' }, { key: 'removed_on', label: 'Out', render: (r) => r.removed_on || 'active' }, { key: 'odometer_at_removal_km', label: 'km', render: (r) => (r.odometer_at_removal_km ?? '—') }, { key: 'removal_reason', label: 'Reason' }]} />
              <div className="row" style={{ marginTop: 10 }}>
                {can('OPERATOR') && b.status !== 'IN_SERVICE' && b.status !== 'RECYCLED' && lk && <ActionForm title="Install in vehicle" action="install" batteryId={id} lookups={lk} onDone={load} fields={[
                  { name: 'vehicle_id', label: 'Vehicle (free only)', type: 'select', lookup: 'vehicles', filter: (o) => !o.occupied, required: true },
                  { name: 'installed_on', label: 'Installed on', type: 'date', required: true, def: today() }, { name: 'odometer_km', label: 'Odometer (km)', type: 'number', def: 0 }]} />}
                {can('OPERATOR') && b.status === 'IN_SERVICE' && <ActionForm title="Remove from vehicle" action="remove" batteryId={id} onDone={load} fields={[
                  { name: 'removed_on', label: 'Removed on', type: 'date', required: true, def: today() }, { name: 'odometer_km', label: 'Odometer (km)', type: 'number', required: true },
                  { name: 'reason', label: 'Reason', wide: true }]} />}
              </div>
            </Card>
            <Card title="Ownership chain">
              <Table rows={d.ownership} columns={[{ key: 'owner', label: 'Owner' }, { key: 'from_date', label: 'From' }, { key: 'to_date', label: 'To', render: (r) => r.to_date || 'current' }, { key: 'transfer_reason', label: 'Reason' }]} />
              {can('OPERATOR') && b.status !== 'RECYCLED' && lk && <div style={{ marginTop: 10 }}><ActionForm title="Transfer ownership" action="transfer" batteryId={id} lookups={lk} onDone={load} fields={[
                { name: 'stakeholder_id', label: 'New owner', type: 'select', lookup: 'stakeholders', required: true }, { name: 'date', label: 'Date', type: 'date', required: true, def: today() },
                { name: 'reason', label: 'Reason', wide: true }]} /></div>}
            </Card>
          </div>
          <Card title="Repairs">
            <Table rows={d.repairs} columns={[{ key: 'repair_date', label: 'Date' }, { key: 'repair_type', label: 'Type', render: (r) => <Badge value={r.repair_type} /> }, { key: 'description', label: 'Description' }, { key: 'service_center', label: 'Service center' }, { key: 'cells_replaced', label: 'Cells' }, { key: 'cost', label: 'Cost', render: (r) => num(r.cost, 0), right: true }]} />
            {can('OPERATOR') && lk && <div style={{ marginTop: 10 }}><ActionForm title="Log repair" action="repair" batteryId={id} lookups={lk} onDone={load} fields={[
              { name: 'service_stakeholder_id', label: 'Service center', type: 'select', lookup: 'stakeholders', filter: ft('SERVICE_CENTER'), required: true },
              { name: 'repair_date', label: 'Date', type: 'date', required: true, def: today() },
              { name: 'repair_type', label: 'Type', type: 'select', required: true, options: ['CELL_REPLACEMENT', 'MODULE_REPLACEMENT', 'BMS_UPDATE', 'COOLING_SYSTEM', 'CONNECTOR_REPAIR', 'OTHER'] },
              { name: 'cost', label: 'Cost', type: 'number', def: 0 }, { name: 'cells_replaced', label: 'Cells replaced', type: 'number', def: 0 },
              { name: 'description', label: 'Description', type: 'textarea', required: true }]} /></div>}
          </Card>
        </>
      )}

      {tab === 'Assessment & end of life' && (
        <>
          <Card title="Second-life assessments (rule-based decision support)" actions={can('ASSESSOR') && <ActionForm title="Run assessment now" action="assess" batteryId={id} onDone={load} collapsed={false} fields={[]} submit="Run rule-based assessment" />}>
            {!d.assessments.length && <p className="muted">No assessment yet. The assessment reads SOH, cycles, peak temperature and repairs and applies the configurable rules.</p>}
            {d.assessments.map((a) => (
              <div key={a.assessment_id} className="card" style={{ background: '#fafdfb' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}><Badge value={a.decision} /><span className="muted">{fmtDT(a.assessed_on)} by {a.assessor} · score <b>{a.score}</b></span></div>
                <p style={{ margin: '8px 0 4px' }}>{a.explanation}</p>
                <details><summary>Rules applied</summary><pre className="sql">{JSON.stringify(typeof a.rules_used === 'string' ? JSON.parse(a.rules_used) : a.rules_used, null, 2)}</pre></details>
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12.5 }}>Rule-based decision support for this project only — not a substitute for certified battery safety testing.</p>
          </Card>

          <Card title="Refurbishment and reuse">
            <Table rows={d.refurbishments} columns={[{ key: 'refurb_id', label: '#' }, { key: 'refurbisher', label: 'Refurbisher' }, { key: 'start_date', label: 'Start' }, { key: 'end_date', label: 'End', render: (r) => r.end_date || '—' }, { key: 'work_done', label: 'Work' }, { key: 'soh_before', label: 'SOH before' }, { key: 'soh_after', label: 'SOH after', render: (r) => r.soh_after ?? '—' }, { key: 'outcome', label: 'Outcome', render: (r) => <Badge value={r.outcome} /> }, { key: 'reuse_application', label: 'Application', render: (r) => r.reuse_application || '—' }]} />
            <div className="row" style={{ marginTop: 10 }}>
              {can('OPERATOR') && !['IN_SERVICE', 'RECYCLED'].includes(b.status) && lk && <ActionForm title="Log refurbishment" action="refurbish" batteryId={id} lookups={lk} onDone={load} fields={[
                { name: 'refurbisher_id', label: 'Refurbisher', type: 'select', lookup: 'stakeholders', filter: ft('REFURBISHER'), required: true },
                { name: 'start_date', label: 'Start date', type: 'date', required: true, def: today() }, { name: 'end_date', label: 'End date', type: 'date' },
                { name: 'outcome', label: 'Outcome', type: 'select', required: true, def: 'IN_PROGRESS', options: ['IN_PROGRESS', 'REUSED_STATIONARY', 'REUSED_VEHICLE', 'FAILED'] },
                { name: 'soh_after', label: 'SOH after (%)', type: 'number' }, { name: 'cost', label: 'Cost', type: 'number', def: 0 },
                { name: 'reuse_application', label: 'Reuse application' }, { name: 'work_done', label: 'Work done', type: 'textarea', required: true }]} />}
              {can('OPERATOR') && inProgress.length > 0 && <ActionForm title="Complete refurbishment" action="complete-refurbishment" batteryId={id} onDone={load} fields={[
                { name: 'refurb_id', label: 'Refurbishment', type: 'select', required: true, options: inProgress.map((r) => ({ value: r.refurb_id, label: `#${r.refurb_id} started ${r.start_date}` })) },
                { name: 'end_date', label: 'End date', type: 'date', required: true, def: today() }, { name: 'soh_after', label: 'SOH after (%)', type: 'number', required: true },
                { name: 'outcome', label: 'Outcome', type: 'select', required: true, options: ['REUSED_STATIONARY', 'REUSED_VEHICLE', 'FAILED'] }, { name: 'reuse_application', label: 'Reuse application' }]} />}
            </div>
          </Card>

          <Card title="Recycling and recovered materials">
            {d.recycling ? (
              <>
                <dl className="kv"><dt>Recycled on</dt><dd>{fmtDate(d.recycling.recycled_on)}</dd><dt>Recycler</dt><dd>{d.recycling.recycler}</dd><dt>Method</dt><dd>{d.recycling.method.replaceAll('_', ' ')}</dd><dt>Input weight</dt><dd>{d.recycling.total_input_kg} kg</dd><dt>Notes</dt><dd>{d.recycling.notes || '—'}</dd></dl>
                <h3 style={{ marginTop: 14 }}>Recovered</h3>
                <Table rows={d.recovered} columns={[{ key: 'name', label: 'Material' }, { key: 'symbol', label: 'Symbol' }, { key: 'quantity_kg', label: 'Quantity (kg)', right: true }, { key: 'purity_pct', label: 'Purity %', right: true }]} />
              </>
            ) : (
              <>
                <p className="muted">This battery has not been recycled.</p>
                {can('RECYCLER') && lk && !['IN_SERVICE'].includes(b.status) && <ActionForm title="Record recycling" action="recycle" batteryId={id} lookups={lk} onDone={load} fields={[
                  { name: 'recycler_id', label: 'Recycler', type: 'select', lookup: 'stakeholders', filter: ft('RECYCLER'), required: true },
                  { name: 'recycled_on', label: 'Date', type: 'date', required: true, def: today() },
                  { name: 'method', label: 'Method', type: 'select', required: true, options: ['HYDROMETALLURGICAL', 'PYROMETALLURGICAL', 'DIRECT_RECYCLING'] },
                  { name: 'total_input_kg', label: 'Input weight (kg)', type: 'number', required: true }, { name: 'notes', label: 'Notes', wide: true },
                  { name: 'materials', type: 'materials' }]} submit="Record recycling (transaction)" />}
              </>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function TelemetryPanel({ id, canIngest, canSync, onChange }) {
  const [bucket, setBucket] = useState('day');
  const [days, setDays] = useState(45);
  const [t, setT] = useState(null);
  const [state, setState] = useState({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api(`/api/batteries/${id}/telemetry?${qs({ bucket, days })}`).then((x) => { setT(x); }).catch((e) => setState({ error: e.message })); }, [id, bucket, days]);
  useEffect(() => { load(); }, [load]);

  async function run(label, fn) {
    setBusy(true); setState({});
    try { const r = await fn(); setState({ ok: `${label}: ${JSON.stringify(r)}` }); load(); onChange(); } catch (e) { setState({ error: e.message }); } finally { setBusy(false); }
  }
  const post = (body) => () => api(`/api/batteries/${id}/telemetry`, { method: 'POST', body });

  return (
    <Card title="Telemetry (MongoDB aggregation)">
      <div className="filters" style={{ marginBottom: 12 }}>
        <div><label>Bucket</label><select value={bucket} onChange={(e) => setBucket(e.target.value)}><option value="day">Daily</option><option value="hour">Hourly</option><option value="raw">Raw readings</option></select></div>
        <div><label>Window (days before latest reading)</label><select value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 14, 30, 45, 90, 365].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
        {canIngest && <>
          <button className="secondary" disabled={busy} onClick={() => run('Simulated normal readings', post({ simulate: { count: 48, scenario: 'normal' } }))}>Simulate normal readings</button>
          <button className="secondary" disabled={busy} onClick={() => run('Simulated overheating', post({ simulate: { count: 48, scenario: 'overheat' } }))}>Simulate overheating</button>
          <button className="secondary" disabled={busy} onClick={() => run('Threshold scan', post({ scan: true }))}>Scan for violations</button>
        </>}
        {canSync && <button disabled={busy} onClick={() => run('Health summary stored in MySQL', () => api(`/api/batteries/${id}/actions`, { method: 'POST', body: { action: 'sync-health', days: 30 } }))}>Sync health summary → MySQL</button>}
      </div>
      <Msg {...state} />
      {t && (
        <>
          <p className="muted">{t.series.length} {bucket === 'raw' ? 'readings' : `${bucket} buckets`} · {fmtDT(t.from)} → {fmtDT(t.to)} UTC</p>
          <div className="grid g2">
            <div><h3>Temperature (°C)</h3><LineChart data={t.series} series={[{ key: 'avg_temp', label: 'Average', color: '#0f7a4d' }, { key: 'max_temp', label: 'Maximum', color: '#c53030' }]} /></div>
            <div><h3>State of charge / health (%)</h3><LineChart data={t.series} series={[{ key: 'min_soc', label: 'Min SOC', color: '#2b6cb0' }, { key: 'avg_soh', label: 'SOH', color: '#b7791f' }]} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Table rows={[...t.series].reverse().slice(0, 30)} columns={[{ key: 't', label: 'Time (UTC)', render: (r) => fmtDT(r.t) }, { key: 'avg_temp', label: 'Avg °C' }, { key: 'max_temp', label: 'Max °C' }, { key: 'min_soc', label: 'Min SOC %' }, { key: 'avg_voltage', label: 'Avg V' }, { key: 'avg_soh', label: 'SOH %' }, { key: 'readings', label: 'Readings' }]} />
          </div>
        </>
      )}
    </Card>
  );
}
