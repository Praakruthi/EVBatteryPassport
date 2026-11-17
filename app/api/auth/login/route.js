import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { signSession, COOKIE_NAME } from '@/lib/session';
import { errorResponse, bad } from '@/lib/api';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) throw bad('Username and password are required');
    const [user] = await query('SELECT user_id, username, role, password_hash, is_active FROM app_user WHERE username = ?', [username]);
    if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    await query('UPDATE app_user SET last_login = NOW() WHERE user_id = ?', [user.user_id]);
    const res = NextResponse.json({ user_id: user.user_id, username: user.username, role: user.role });
    res.cookies.set(COOKIE_NAME, await signSession(user), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 8 * 3600 });
    return res;
  } catch (e) { return errorResponse(e); }
}
