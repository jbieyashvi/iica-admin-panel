import type { DashboardData } from '../types';
import { DASHBOARD_DATA } from '../mock/dashboard';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Returns the dashboard payload. A real implementation would hit
// GET /admin/dashboard?range=... — the shape is intentionally API-ready.
export async function getDashboard(): Promise<DashboardData> {
  await delay(600);
  return DASHBOARD_DATA;
}
