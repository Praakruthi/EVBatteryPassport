'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/client';
import { Card, Table, Msg } from '@/components/ui';
import { useUser } from '@/components/Shell';

const TABS = [['manufacturers', 'Manufacturers'], ['models', 'Battery models'], ['vehicles', 'Vehicles'], ['stakeholders', 'Stakeholders'], ['materials', 'Materials']];

export default function MasterData() {
  const user = useUser();
  const [tab, setTab] = useState('manufacturers');
  const [d, setD] = useState(null);
  const [lk, setLk] = useState(null);
  const [form, setForm] = useState({});
  const [state, setState] = useState({});
  const canEdit = ['ADMIN', 'OPERATOR'].includes(user.role);

  const load = useCallback(() => { setD(null); api(`/api/master/${tab}`).then(setD).catch((e) => setState({ error: e.message })); }, [tab]);
  useEffect(() => { load(); setForm({}); setState({}); }, [load]);
  useEffect(() => { api('/api/lookups').then(setLk); }, []);

  async function add(e) {
    e.preventDefault(); setState({});
    try { await api(`/api/master/${tab}`, { method: 'POST', body: form }); setForm({}); setState({ ok: 'Added.' }); load(); } catch (x) { setState({ error: x.message }); }
  }
  async function del(row) {
    if (!confirm('Delete this record?')) return;
    try { await api(`/api/master/${tab}?id=${row[d.pk]}`, { method: 'DELETE' }); load(); } catch (x) { setState({ error: x.message }); }
  }
  const options = (f) => (f.lookup ? lk?.[f.lookup]?.map((o) => ({ value: o.id, label: o.label })) : f.options?.map((o) => ({ value: o, label: o })) ) || [];

  return (
    <>
      <h1>Master data</h1>
      <p className="sub">Reference entities used by batteries and lifecycle events. Deleting a row that is referenced elsewhere is blocked by foreign keys.</p>
      <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <Msg {...state} />
      {d && (
        <>
          {canEdit && (
            <Card title={`Add ${d.label.toLowerCase()}`}>
              <form onSubmit={add}>
                <div className="fields">
                  {d.fields.map((f) => (
                    <div key={f.name}><label>{f.label}{f.required && ' *'}</label>
                      {f.type === 'select'
                        ? <select required={f.required} value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}><option value="">Select…</option>{options(f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                        : <input type={f.type || 'text'} step={f.type === 'number' ? 'any' : undefined} required={f.required} value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />}
                    </div>
                  ))}
                </div>
                <button>Add</button>
              </form>
            </Card>
          )}
          <Card title={d.label}>
            <Table rows={d.rows} columns={[...Object.keys(d.rows[0] || {}).filter((k) => k !== 'created_at').map((k) => ({ key: k, label: k.replaceAll('_', ' ') })),
              ...(user.role === 'ADMIN' ? [{ key: '_d', label: '', render: (r) => <button className="danger" style={{ padding: '3px 10px' }} onClick={() => del(r)}>Delete</button> }] : [])]} />
          </Card>
        </>
      )}
    </>
  );
}
