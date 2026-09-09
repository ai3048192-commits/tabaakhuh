import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/envelope'
import { approveDriver, listPendingDrivers, rejectDriver } from './driversApi'
import { sortQueue } from './sortQueue'
import type { CardStatus, DecisionOutcome, DriverApplication } from './types'

export interface UseDriverApplications {
  status: 'loading' | 'ready' | 'error'
  entries: DriverApplication[]
  count: number
  cardState: (id: number) => CardStatus
  confirming: { id: number; kind: 'approve' | 'reject' } | null
  refresh: () => void
  openConfirm: (id: number, kind: 'approve' | 'reject') => void
  closeConfirm: (id: number) => void
  approve: (id: number) => Promise<DecisionOutcome>
  reject: (id: number, reason: string) => Promise<DecisionOutcome>
}

/**
 * Owns the pending-driver queue: load, sort (FR-010), refresh (FR-009), per-card
 * decision state, and the approve/reject outcome classification
 * (FR-014/FR-019/FR-023..FR-027). A `401` on any call is handled upstream by the
 * shared unauthorized handler (FR-028) and never seen here.
 */
export function useDriverApplications(): UseDriverApplications {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [entries, setEntries] = useState<DriverApplication[]>([])
  const [cardStates, setCardStates] = useState<Map<number, CardStatus>>(new Map())
  const [confirming, setConfirming] = useState<{ id: number; kind: 'approve' | 'reject' } | null>(
    null,
  )

  const load = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? s : 'loading'))
    try {
      const list = await listPendingDrivers()
      setEntries(sortQueue(list))
      setStatus('ready')
    } catch {
      // FR-032: a first load that fails shows the screen error state; a failed
      // refresh keeps the list the administrator already has.
      setStatus((s) => (s === 'ready' ? s : 'error'))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setCard = useCallback((id: number, next: CardStatus | null) => {
    setCardStates((prev) => {
      const m = new Map(prev)
      if (next === null) m.delete(id)
      else m.set(id, next)
      return m
    })
  }, [])

  const removeEntry = useCallback(
    (id: number) => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
      setCard(id, null)
      setConfirming((c) => (c?.id === id ? null : c))
    },
    [setCard],
  )

  const openConfirm = useCallback(
    (id: number, kind: 'approve' | 'reject') => {
      setConfirming({ id, kind })
      setCard(id, null) // clear any prior error state
    },
    [setCard],
  )

  const closeConfirm = useCallback(
    (id: number) => {
      setConfirming((c) => (c?.id === id ? null : c))
      setCard(id, null)
    },
    [setCard],
  )

  const decide = useCallback(
    async (id: number, run: () => Promise<DriverApplication>): Promise<DecisionOutcome> => {
      setCard(id, 'submitting')
      try {
        await run() // FR-026: a 200 with an unreadable body still resolves here
        removeEntry(id)
        return { ok: true, message: '' }
      } catch (err) {
        const httpStatus = err instanceof ApiError ? err.status : -1
        if (httpStatus === 404) {
          removeEntry(id)
          void load()
          return { ok: false, reason: 'not_found' }
        }
        if (httpStatus === 422) {
          const fieldErrors = err instanceof ApiError ? err.fieldErrors : null
          const message = err instanceof ApiError ? err.message : ''
          if (fieldErrors?.reason?.length) {
            // FR-027: missing-reason validation — keep the entry and the dialog open.
            setCard(id, null)
            return { ok: false, reason: 'validation', message: fieldErrors.reason[0] || message }
          }
          removeEntry(id)
          void load()
          return { ok: false, reason: 'not_pending', message }
        }
        // 0 (network), >= 500, or anything unexpected → transient (FR-025)
        setCard(id, 'error')
        return { ok: false, reason: 'transient' }
      }
    },
    [load, removeEntry, setCard],
  )

  const approve = useCallback((id: number) => decide(id, () => approveDriver(id)), [decide])
  const reject = useCallback(
    (id: number, reason: string) => decide(id, () => rejectDriver(id, reason)),
    [decide],
  )

  const cardState = useCallback(
    (id: number): CardStatus =>
      cardStates.get(id) ?? (confirming?.id === id ? 'confirming' : 'idle'),
    [cardStates, confirming],
  )

  return {
    status,
    entries,
    count: entries.length,
    cardState,
    confirming,
    refresh: load,
    openConfirm,
    closeConfirm,
    approve,
    reject,
  }
}
