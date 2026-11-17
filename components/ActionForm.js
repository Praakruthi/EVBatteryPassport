'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { Msg } from '@/components/ui';

// Generic form that POSTs {action, ...values} to /api/batteries/:id/actions.
// field = { name, label, type: text|number|date|select|textarea|materials, options:[{value,label}|string], required, def, wide, step }
export default function ActionForm({ title, action, batteryId, fields, lookups, submit = 'Save', onDone, collapsed = true }) {
  const init = () => Object.fromEntries(fields.map((f) => [f.name, f.type === 'materials' ? [{ material_id: '', quantity_kg: '', purity_pct: '' }] : f.def ?? '']));
  const [open, setOpen] = useState(!collapsed);
  const [vals, setVals] = useState(init);
  const [state, setState] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  async function send(e) {
    e.preventDefault(); setBusy(true); setState({});
    try {
      const res = await api(`/api/batteries/${batteryId}/actions`, { method: 'POST', body: { action, ...vals } });
      setState({ ok: res?.explanation ? `${String(res.decision).replaceAll('_', ' ')} (score ${res.score}). ${res.explanation}` : 'Saved successfully.' });
      setVals(init());
      onDone?.(res);
    } catch (err) { setState({ error: err.message }); } finally { setBusy(false); }
  }

  if (!open) return <button className="secondary" onClick={() => setOpen(true)}>+ {title}</button>;
  return (
    <form onSubmit={send} className="card" style={{ background: '#fafdfb' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h3>{title}</h3>{collapsed && <button type="button" className="secondary" onClick={() => setOpen(false)}>Close</button>}</div>
      <div className="fields">
        {fields.map((f) => {
          const opts = (f.lookup ? lookups?.[f.lookup]?.filter(f.filter || (() => true)).map((o) => ({ value: o.id, label: o.label })) : f.options?.map((o) => (typeof o === 'string' ? { value: o, label: o.replaceAll('_', ' ') } : o))) || [];
          if (f.type === 'materials') {
            return (
              <div key={f.name} className="wide">
                <label>Recovered materials</label>
                {vals[f.name].map((m, i) => (
                  <div key={i} className="row" style={{ marginBottom: 6, flexWrap: 'nowrap' }}>
                    <select value={m.material_id} onChange={(e) => set(f.name, vals[f.name].map((x, j) => (j === i ? { ...x, material_id: e.target.value } : x)))}>
                      <option value="">Material…</option>{lookups?.materials?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                    <input type="number" step="0.001" placeholder="kg" value={m.quantity_kg} onChange={(e) => set(f.name, vals[f.name].map((x, j) => (j === i ? { ...x, quantity_kg: e.target.value } : x)))} />
                    <input type="number" step="0.1" placeholder="purity %" value={m.purity_pct} onChange={(e) => set(f.name, vals[f.name].map((x, j) => (j === i ? { ...x, purity_pct: e.target.value } : x)))} />
                  </div>
                ))}
                <button type="button" className="secondary" onClick={() => set(f.name, [...vals[f.name], { material_id: '', quantity_kg: '', purity_pct: '' }])}>+ material</button>
              </div>
            );
          }
          return (
            <div key={f.name} className={f.wide || f.type === 'textarea' ? 'wide' : ''}>
              <label>{f.label}{f.required && ' *'}</label>
              {f.type === 'select' ? (
                <select value={vals[f.name]} required={f.required} onChange={(e) => set(f.name, e.target.value)}>
                  <option value="">{f.required ? 'Select…' : '— none —'}</option>
                  {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows={2} value={vals[f.name]} required={f.required} onChange={(e) => set(f.name, e.target.value)} />
              ) : (
                <input type={f.type || 'text'} step={f.step || (f.type === 'number' ? 'any' : undefined)} value={vals[f.name]} required={f.required} onChange={(e) => set(f.name, e.target.value)} />
              )}
            </div>
          );
        })}
      </div>
      <button disabled={busy}>{busy ? 'Working…' : submit}</button>
      <Msg {...state} />
    </form>
  );
}
