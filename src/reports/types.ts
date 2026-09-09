/**
 * Financial Reports shapes — `GET /admin/reports/financial`
 * (`admin-dashboard-api.md` Phase 8).
 *
 * Metric definitions (backend):
 *  - `revenue`    Σ `orders.total` for `completed` orders placed in range.
 *  - `orders`     count of those orders.
 *  - `commission` `revenue * settings.commission_percent / 100`.
 *  - `payouts`    Σ paid withdrawals settled in range.
 */

export type GroupBy = 'day' | 'month'

export interface ReportTotals {
  revenue: number
  commission: number
  payouts: number
  orders: number
}

export interface ReportSeriesPoint {
  /** `YYYY-MM-DD` for `day`, `YYYY-MM` for `month`. */
  period: string
  revenue: number
  commission: number
  payouts: number
}

export interface ReportBreakdownRow {
  /** e.g. a city name. */
  label: string
  revenue: number
  orders: number
}

export interface FinancialReport {
  totals: ReportTotals
  series: ReportSeriesPoint[]
  breakdown: ReportBreakdownRow[]
}

export interface ReportFilters {
  from: string
  to: string
  groupBy: GroupBy
  cityId: number | null
}

export type ReportsScreenStatus = 'loading' | 'ready' | 'error'
