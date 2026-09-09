import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/envelope'
import { approveCook, listPendingCooks, rejectCook } from './cooksApi'
import { sortQueue } from './sortQueue'
import type { CardStatus, CookApplication, DecisionOutcome, PendingCookEntry } from './types'

export interface UseCookApplications {
  status: 'loading' | 'ready' | 'error'
  entries: PendingCookEntry[]
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
 * Owns the pending-cook queue: load, sort (FR-011), refresh (FR-010), per-card
 * decision state, and the approve/reject outcome classification
 * (FR-014/FR-019/FR-022/FR-023/FR-024/FR-025). A `401` on any call is handled
 * upstream by the shared unauthorized handler (FR-026) and never seen here.
 */
export function useCookApplications(): UseCookApplications {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [entries, setEntries] = useState<PendingCookEntry[]>([])
  const [cardStates, setCardStates] = useState<Map<number, CardStatus>>(new Map())
  const [confirming, setConfirming] = useState<{ id: number; kind: 'approve' | 'reject' } | null>(
    null,
  )

  const entriesRef = useRef<PendingCookEntry[]>([])
  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  const load = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? s : 'loading'))
    try {
      const list = await listPendingCooks()
      setEntries(sortQueue(list))
      setStatus('ready')
    } catch {
      // FR-029: a first load that fails shows the screen error state; a failed
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

  const removeEntry = useCallback((id: number) => {
    setEntries((prev) => prev.filter((e) => e.profile.id !== id))
    setCard(id, null)
    setConfirming((c) => (c?.id === id ? null : c))
  }, [setCard])

  const openConfirm = useCallback((id: number, kind: 'approve' | 'reject') => {
    setConfirming({ id, kind })
    setCard(id, null) // clear any prior error state
  }, [setCard])

  const closeConfirm = useCallback((id: number) => {
    setConfirming((c) => (c?.id === id ? null : c))
    setCard(id, null)
  }, [setCard])

  const decide = useCallback(
    async (id: number, run: () => Promise<CookApplication>): Promise<DecisionOutcome> => {
      const storeName =
        entriesRef.current.find((e) => e.profile.id === id)?.profile.store_name ?? ''
      setCard(id, 'submitting')
      try {
        await run() // FR-025: a 200 with an unreadable body still resolves here
        removeEntry(id)
        return { ok: true, storeName }
      } catch (err) {
        const httpStatus = err instanceof ApiError ? err.status : -1
        if (httpStatus === 404) {
          removeEntry(id)
          void load()
          return { ok: false, reason: 'not_found' }
        }
        if (httpStatus === 422) {
          removeEntry(id)
          void load()
          return {
            ok: false,
            reason: 'not_pending',
            message: err instanceof ApiError ? err.message : '',
          }
        }
        // 0 (network), >= 500, or anything unexpected → transient (FR-024)
        setCard(id, 'error')
        return { ok: false, reason: 'transient' }
      }
    },
    [load, removeEntry, setCard],
  )

  const approve = useCallback((id: number) => decide(id, () => approveCook(id)), [decide])
  const reject = useCallback(
    (id: number, reason: string) => decide(id, () => rejectCook(id, reason)),
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
