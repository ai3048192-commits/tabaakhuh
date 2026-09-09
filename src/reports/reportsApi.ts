import { authedRequest } from '../api/httpClient'
import type { FinancialReport, ReportFilters } from './types'

/**
 * `GET /admin/reports/financial?from=&to=&group_by=day|month&city_id=`
 * — implemented backend-side (see `admin-dashboard-api.md` Phase 8).
 * `from`/`to` are `YYYY-MM-DD` wall-clock dates in Africa/Cairo and are
 * optional (backend defaults to the last 30 days).
 */
export function getFinancialReport(
  f: ReportFilters,
  signal?: AbortSignal,
): Promise<FinancialReport> {
  const sp = new URLSearchParams()
  sp.set('from', f.from)
  sp.set('to', f.to)
  sp.set('group_by', f.groupBy)
  if (f.cityId != null) sp.set('city_id', String(f.cityId))
  return authedRequest<FinancialReport>(`/admin/reports/financial?${sp.toString()}`, { signal })
}
