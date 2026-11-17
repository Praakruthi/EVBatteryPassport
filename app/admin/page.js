'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, fmtDT } from '@/lib/client';
import { Card, Table, Badge, Msg } from '@/components/ui';
import { useUser } from '@/components/Shell';

export default function Admin() {
  const user = useUser();
  const [users, setUsers] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [nu, setNu] = useState({ username: '', email: '', password: '', role: 'OPERATOR' });
  const [state, setState] = useState({});
  const load = useCallback(() => {
    if (user.role !== 'ADMIN') return;
    api('/api/admin/users').then(setUsers).catch((e) => setState({ error: e.message }));
    api('/api/admin/rules').then(setCfg).catch((e) => setState({ error: e.message }));
  }, [user.role]);
  useEffect(() => { load(); }, [load]);
  if (user.role !== 'ADMIN') return <Msg error="Administrator access required." />;

  const wrap = (fn, okMsg) => async (...a) => { setState({}); try { await fn(...a); setState({ ok: okMsg }); load(); } catch (e) { setState({ error: e.message }); } };
  const addUser = wrap(async (e) => { e.preventDefault(); await api('/api/admin/users', { method: 'POST', body: nu }); setNu({ username: '', email: '', password: '', role: 'OPERATOR' }); }, 'User created.');
  const patch = wrap((body) => api('/api/admin/users', { method: 'PATCH', body }), 'User updated.');
  const saveCfg = wrap(() => api('/api/admin/rules', { method: 'PUT', body: cfg }), 'Rules and thresholds saved (changes are written to the audit log by a trigger).');
  const setRule = (k, v) => setCfg({ ...cfg, rules: cfg.rules.map((r) => (r.rule_key === k ? { ...r, rule_value: v } : r)) });
  const setTh = (m, f, v) => setCfg({ ...cfg, thresholds: cfg.thresholds.map((t) => (t.metric === m ? { ...t, [f]: v } : t)) });

  return (
    <>
      <h1>Administration</h1>
      <p className="sub">User accounts, role-based access, second-life rules and telemetry thresholds.</p>
      <Msg {...state} />
      <Card title="Users">
        <Table rows={users} columns={[
          { key: 'username', label: 'Username', render: (r) => <b>{r.username}</b> }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role', render: (r) => (
            <select value={r.role} onChange={(e) => patch({ user_id: r.user_id, role: e.target.value })}>{['ADMIN', 'OPERATOR', 'ASSESSOR', 'RECYCLER'].map((x) => <option key={x}>{x}</option>)}</select>) },
          { key: 'organisation', label: 'Organisation', render: (r) => r.organisation || '—' }, { key: 'last_login', label: 'Last login', render: (r) => fmtDT(r.last_login) },
          { key: 'is_active', label: 'Active', render: (r) => <Badge value={r.is_active ? 'A' : 'E'} /> },
          { key: 'x', label: '', render: (r) => <button className="secondary" onClick={() => patch({ user_id: r.user_id, is_active: !r.is_active })}>{r.is_active ? 'Deactivate' : 'Activate'}</button> },
        ]} />
        <form onSubmit={addUser} style={{ marginTop: 16 }}>
          <h3>Create user</h3>
          <div className="fields">
            {['username', 'email', 'password'].map((k) => <div key={k}><label>{k}</label><input type={k === 'password' ? 'password' : 'text'} required value={nu[k]} onChange={(e) => setNu({ ...nu, [k]: e.target.value })} /></div>)}
            <div><label>role</label><select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>{['ADMIN', 'OPERATOR', 'ASSESSOR', 'RECYCLER'].map((x) => <option key={x}>{x}</option>)}</select></div>
          </div>
          <button>Create user</button>
        </form>
      </Card>
      {cfg && (
        <>
          <div className="grid g2">
            <Card title="Second-life assessment rules">
              {cfg.rules.map((r) => <div key={r.rule_key} style={{ marginBottom: 10 }}><label>{r.rule_key} — {r.description}</label><input type="number" step="any" value={r.rule_value} onChange={(e) => setRule(r.rule_key, e.target.value)} /></div>)}
            </Card>
            <Card title="Telemetry thresholds (blank = no limit)">
              <Table rows={cfg.thresholds} columns={[{ key: 'metric', label: 'Metric' },
                { key: 'min_value', label: 'Min', render: (r) => <input type="number" step="any" value={r.min_value ?? ''} onChange={(e) => setTh(r.metric, 'min_value', e.target.value)} /> },
                { key: 'max_value', label: 'Max', render: (r) => <input type="number" step="any" value={r.max_value ?? ''} onChange={(e) => setTh(r.metric, 'max_value', e.target.value)} /> }]} />
            </Card>
          </div>
          <button onClick={saveCfg}>Save rules &amp; thresholds</button>
          <Card title="Audit log (written by triggers)"><Table rows={cfg.audit} columns={[{ key: 'changed_at', label: 'When', render: (r) => fmtDT(r.changed_at) }, { key: 'table_name', label: 'Table' }, { key: 'record_id', label: 'Record' }, { key: 'action', label: 'Action' }, { key: 'old_value', label: 'Old' }, { key: 'new_value', label: 'New' }]} /></Card>
        </>
      )}
    </>
  );
}
