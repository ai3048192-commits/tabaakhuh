import { useCallback, useEffect, useRef, useState } from 'react'
import { getOverview } from './overviewApi'
import { normalizeOverview } from './overviewModel'
import {
  REFRESH_INTERVAL_MS,
  type OverviewSnapshot,
  type OverviewStatus,
} from './types'

export interface UseOverview {
  status: OverviewStatus
  /** The last SUCCESSFUL snapshot; it survives a failed refresh (FR-014). */
  snapshot: OverviewSnapshot | null
  /** Time of the last successful fetch (FR-015). */
  lastUpdated: Date | null
  /** A re-fetch is in flight while a snapshot is already shown (FR-013). */
  refreshing: boolean
  /** The most recent re-fetch failed; cleared by the next success / next attempt (FR-014). */
  refreshError: boolean
  /** Manual re-fetch. Also resets the 60-second interval (FR-016). */
  refresh: () => void
}

/**
 * Owns the live overview snapshot: the initial load, a manual + automatic
 * refresh (every {@link REFRESH_INTERVAL_MS} while the tab is visible, paused
 * while hidden, an immediate fetch on return), the "how current" timestamp, and
 * the keep-last-good behaviour when a refresh fails. A `401` on any call is
 * handled upstream by the shared `unauthorizedHandler` and never observed here.
 */
export function useOverview(): UseOverview {
  const [status, setStatus] = useState<OverviewStatus>('loading')
  const [snapshot, setSnapshot] = useState<OverviewSnapshot | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)

  // Read the current status inside stable callbacks without re-creating them.
  const statusRef = useRef<OverviewStatus>('loading')
  useEffect(() => {
    statusRef.current = status
  }, [status])

  const inFlightRef = useRef(false)
  const intervalRef = useRef<number | null>(null)

  const fetchOnce = useCallback(async (mode: 'initial' | 'refresh') => {
    if (inFlightRef.current) return // single-flight: collapse overlapping triggers
    inFlightRef.current = true

    if (mode === 'initial') {
      setStatus((s) => (s === 'ready' ? s : 'loading'))
    } else {
      setRefreshing(true)
      setRefreshError(false)
    }

    try {
      const data = await getOverview()
      setSnapshot(normalizeOverview(data))
      setLastUpdated(new Date())
      setStatus('ready')
    } catch {
      // A 401 never reaches here (session-loss is handled upstream).
      if (mode === 'initial' && statusRef.current !== 'ready') {
        setStatus('error') // FR-011: nothing shown → screen error
      } else {
        setRefreshError(true) // FR-014: keep the last good snapshot
      }
    } finally {
      inFlightRef.current = false
      if (mode === 'refresh') setRefreshing(false)
    }
  }, [])

  // Dispatch a re-fetch without touching the interval (used by the timer + the
  // visibility handler). A failed first load routes back through the "initial"
  // path so Retry works.
  const doRefresh = useCallback(() => {
    void fetchOnce(statusRef.current === 'ready' ? 'refresh' : 'initial')
  }, [fetchOnce])

  const startInterval = useCallback(() => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    intervalRef.current = window.setInterval(() => {
      if (document.visibilityState === 'visible') doRefresh()
    }, REFRESH_INTERVAL_MS)
  }, [doRefresh])

  const refresh = useCallback(() => {
    doRefresh()
    startInterval() // FR-016: a manual refresh resets the cadence
  }, [doRefresh, startInterval])

  useEffect(() => {
    void fetchOnce('initial')
    startInterval()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        doRefresh() // FR-016: immediate catch-up on return
        startInterval() // …then the 60s cycle restarts from now
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      intervalRef.current = null
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchOnce, startInterval, doRefresh])

  return { status, snapshot, lastUpdated, refreshing, refreshError, refresh }
}
