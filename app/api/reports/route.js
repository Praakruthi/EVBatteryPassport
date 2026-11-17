import { route } from '@/lib/api';
import { runAllReports } from '@/lib/reports';
export const dynamic = 'force-dynamic';
export const GET = route(undefined, async () => runAllReports());
