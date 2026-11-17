'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/client';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const NAV = [
  ['/', 'Dashboard'], ['/batteries', 'Batteries'], ['/alerts', 'Alerts'], ['/assessments', 'Assessments'],
  ['/recycling', 'Recycling'], ['/reports', 'Reports & Queries'], ['/search', 'Search'], ['/masterdata', 'Master Data'], ['/admin', 'Admin', 'ADMIN'],
];

export default function Shell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const isLogin = pathname === '/login';

  useEffect(() => {
    if (isLogin) return;
    api('/api/auth/me').then(setUser).catch(() => router.replace('/login'));
  }, [isLogin, router]);

  if (isLogin) return children;
  if (!user) return <div className="main muted">Loading…</div>;

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <UserContext.Provider value={user}>
      <div className="layout">
        <aside className="sidebar">
          <div className="logo">🔋 BatteryPassport</div>
          <nav>
            {NAV.filter(([, , role]) => !role || role === user.role).map(([href, label]) => (
              <Link key={href} href={href} className={href === '/' ? (pathname === '/' ? 'active' : '') : pathname.startsWith(href) ? 'active' : ''}>{label}</Link>
            ))}
          </nav>
          <div className="me">
            Signed in as <b>{user.username}</b><br />
            <span className="badge b-green">{user.role}</span>{' '}
            <button className="secondary" style={{ padding: '3px 10px', marginTop: 8 }} onClick={logout}>Log out</button>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
    </UserContext.Provider>
  );
}
