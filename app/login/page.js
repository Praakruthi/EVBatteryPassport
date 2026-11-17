'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export default function Login() {
  const router = useRouter();
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/auth/login', { method: 'POST', body: f }); router.replace('/'); router.refresh(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>🔋 BatteryPassport</h1>
        <p className="sub">EV battery lifecycle, traceability &amp; second-life assessment</p>
        <label>Username</label>
        <input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoFocus required />
        <label style={{ marginTop: 12 }}>Password</label>
        <input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        {err && <div className="msg err">{err}</div>}
        <button style={{ width: '100%', marginTop: 16 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="hint">
          Demo accounts:<br />
          <b>admin</b> / Admin@123 · <b>operator</b> / Operator@123<br />
          <b>assessor</b> / Assessor@123 · <b>recycler</b> / Recycler@123
        </div>
      </form>
    </div>
  );
}
