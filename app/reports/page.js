'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Card, AutoTable, Msg, Badge } from '@/components/ui';

export default function Reports() {
  const [reports, setReports] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/reports').then(setReports).catch((e) => setErr(e.message)); }, []);
  if (err) return <Msg error={err} />;
  if (!reports) return <p className="muted">Running queries…</p>;
  return (
    <>
      <h1>Reports &amp; important queries</h1>
      <p className="sub">Every card runs live against the databases and shows the exact query / pipeline, with the DBMS concepts it demonstrates.</p>
      {reports.map((r) => (
        <Card key={r.key} title={r.title} actions={<><span className={`badge ${r.db === 'MongoDB' ? 'b-purple' : 'b-blue'}`}>{r.db}</span></>}>
          <p className="muted" style={{ margin: '0 0 8px' }}>Concepts: {r.concepts}</p>
          {r.error ? <Msg error={r.error} /> : <AutoTable rows={r.rows} />}
          <details><summary>Show {r.db === 'MongoDB' ? 'aggregation pipeline' : 'SQL'}</summary><pre className="sql">{r.sql}</pre></details>
        </Card>
      ))}
    </>
  );
}
