'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { Card, Msg } from '@/components/ui';
import { useUser } from '@/components/Shell';

export default function NewBattery() {
  const router = useRouter();
  const user = useUser();
  const [lk, setLk] = useState(null);
  const [f, setF] = useState({ serial_number: '', model_id: '', manufacture_date: '', owner_id: '', cert_name: '', cert_issuing_body: '', cert_number: '', cert_issued_on: '', cert_expires_on: '' });
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/lookups').then(setLk); }, []);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  if (!['ADMIN', 'OPERATOR'].includes(user.role)) return <Msg error="Only administrators and service operators can register batteries." />;

  async function submit(e) {
    e.preventDefault(); setErr('');
    try { const r = await api('/api/batteries', { method: 'POST', body: f }); router.push(`/batteries/${r.battery_id}`); }
    catch (x) { setErr(x.message); }
  }
  const input = (k, label, type = 'text', req = false) => (<div><label>{label}{req && ' *'}</label><input type={type} value={f[k]} required={req} onChange={(e) => set(k, e.target.value)} /></div>);
  return (
    <>
      <h1>Register battery</h1>
      <p className="sub">Creates the passport, initial owner and optional certificate in a single database transaction.</p>
      <form onSubmit={submit}>
        <Card title="Battery">
          <div className="fields">
            {input('serial_number', 'Serial number (6-40 chars, A-Z 0-9 -)', 'text', true)}
            <div><label>Battery model *</label><select required value={f.model_id} onChange={(e) => set('model_id', e.target.value)}><option value="">Select…</option>{lk?.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
            {input('manufacture_date', 'Manufacture date', 'date', true)}
            <div><label>Initial owner</label><select value={f.owner_id} onChange={(e) => set('owner_id', e.target.value)}><option value="">— none —</option>{lk?.stakeholders.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
          </div>
        </Card>
        <Card title="Certification (optional)">
          <div className="fields">
            {input('cert_name', 'Certificate name')}{input('cert_issuing_body', 'Issuing body')}{input('cert_number', 'Certificate number')}
            {input('cert_issued_on', 'Issued on', 'date')}{input('cert_expires_on', 'Expires on', 'date')}
          </div>
        </Card>
        <Msg error={err} />
        <button>Register battery</button>
      </form>
    </>
  );
}
