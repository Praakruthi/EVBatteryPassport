'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmtDT } from '@/lib/client';
import { Card, Table, Badge, Msg } from '@/components/ui';

export default function Assessments() {
  const [latest, setLatest] = useState(true);
  const [rows, setRows] = useState([]);
  const [rules, setRules] = useState([]);
  const [err, setErr] = useState('');
  useEffect(() => { api(`/api/assessments?latest=${latest ? 1 : 0}`).then(setRows).catch((e) => setErr(e.message)); }, [latest]);
  useEffect(() => { api('/api/admin/rules').then((r) => setRules(r.rules)).catch(() => {}); }, []);
  return (
    <>
      <h1>Second-life assessments</h1>
      <p className="sub">Decisions come from the stored procedure <code>sp_assess_second_life</code>, which applies the configurable rules and saves the explanation. Run assessments from a battery&apos;s passport.</p>
      <Card title="Active rules">
        <div className="row" style={{ gap: 18 }}>{rules.map((r) => <div key={r.rule_key}><div className="muted" style={{ fontSize: 12 }}>{r.rule_key}</div><b>{r.rule_value}</b></div>)}</div>
      </Card>
      <Card title={latest ? 'Latest assessment per battery' : 'All assessments'} actions={<button className="secondary" onClick={() => setLatest(!latest)}>{latest ? 'Show full history' : 'Show latest only'}</button>}>
        <Msg error={err} />
        <Table rows={rows} columns={[
          { key: 'assessed_on', label: 'Assessed', render: (r) => fmtDT(r.assessed_on) },
          { key: 'serial_number', label: 'Battery', render: (r) => <Link href={`/batteries/${r.battery_id}`}>{r.serial_number}</Link> },
          { key: 'battery_status', label: 'Now', render: (r) => <Badge value={r.battery_status} /> },
          { key: 'decision', label: 'Decision', render: (r) => <Badge value={r.decision} /> },
          { key: 'score', label: 'Score' }, { key: 'soh_pct', label: 'SOH %' },
          { key: 'explanation', label: 'Explanation' }, { key: 'assessor', label: 'By' },
        ]} />
      </Card>
    </>
  );
}
