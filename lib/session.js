import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'bp_token';

function secret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set (see .env.example)');
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function signSession(user) {
  return new SignJWT({ uid: user.user_id, username: user.username, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret());
}

export async function getSessionUser(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { user_id: payload.uid, username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}
