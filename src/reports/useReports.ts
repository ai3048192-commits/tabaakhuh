import { useCallback, useEffect, useRef, useState } from 'react'
import { getFinancialReport } from './reportsApi'
import type {
  FinancialReport,
  GroupBy,
  ReportFilters,
  ReportsScreenStatus,
} from './types'

function ymd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Default range: last 30 days (Africa/Cairo), grouped by day. */
function defaultFilters(): ReportFilters {
  const now = Date.now()
  return {
    from: ymd(new Date(now - 30 * 86_400_000)),
    to: ymd(new Date(now)),
    groupBy: 'day',
    cityId: null,
  }
}

export interface UseReports {
  status: ReportsScreenStatus
  report: FinancialReport | null
  filters: ReportFilters
  draftFrom: string
  draftTo: string
  draftGroupBy: GroupBy
  dateError: boolean

  setDraftFrom: (v: string) => void
  setDraftTo: (v: string) => void
  setDraftGroupBy: (g: GroupBy) => void
  apply: () => void
  refresh: () => void
}

/** Owns the financial-report filters (date range + grouping) and the fetched report. */
export function useReports(): UseReports {
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters)
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [status, setStatus] = useState<ReportsScreenStatus>('loading')

  const [draftFrom, setDraftFrom] = useState(filters.from)
  const [draftTo, setDraftTo] = useState(filters.to)
  const [draftGroupBy, setDraftGroupBy] = useState<GroupBy>(filters.groupBy)
  const [dateError, setDateError] = useState(false)

  const hasReportRef = useRef(false)
  useEffect(() => {
    hasReportRef.current = report != null
  }, [report])

  const load = useCallback(async () => {
    if (!hasReportRef.current) setStatus('loading')
    try {
      setReport(await getFinancialReport(filters))
      setStatus('ready')
    } catch {
      setStatus(hasReportRef.current ? 'ready' : 'error')
    }
  }, [filters])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const apply = useCallback(() => {
    if (draftFrom && draftTo && draftFrom > draftTo) {
      setDateError(true)
      return
    }
    setDateError(false)
    setFilters((f) => ({ ...f, from: draftFrom, to: draftTo, groupBy: draftGroupBy }))
  }, [draftFrom, draftTo, draftGroupBy])

  return {
    status,
    report,
    filters,
    draftFrom,
    draftTo,
    draftGroupBy,
    dateError,
    setDraftFrom: (v) => {
      setDraftFrom(v)
      setDateError(false)
    },
    setDraftTo: (v) => {
      setDraftTo(v)
      setDateError(false)
    },
    setDraftGroupBy,
    apply,
    refresh: () => void load(),
  }
}
