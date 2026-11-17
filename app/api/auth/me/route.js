import { route } from '@/lib/api';
export const dynamic = 'force-dynamic';
export const GET = route(undefined, async (req, { user }) => user);
