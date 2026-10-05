import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useCityNames } from '../cities/useCityNames'
import { useCookApplications } from './useCookApplications'
import CookApplicationRow from './CookApplicationRow'
import CookReviewOverlay from './CookReviewOverlay'
import DocumentViewer from './DocumentViewer'
import ApproveDialog from './ApproveDialog'
import RejectDialog from './RejectDialog'
import { cookMessages as M } from './messages'
import type { DecisionOutcome, DocumentRef } from './types'
import PageHeader from '../shared/PageHeader'
import { bannerBtnLight } from '../shared/ui'

/** `/cooks` — the pending cook applications review screen (US1–US3). */
export default function CookApplicationsPage() {
  const q = useCookApplications()
  const cities = useCityNames()
  const [toast, setToast] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ docs: DocumentRef[]; index: number } | null>(null)
  const [reviewing, setReviewing] = useState<number | null>(null)

  const reviewingEntry =
    reviewing != null ? (q.entries.find((e) => e.profile.id === reviewing) ?? null) : null

  // Close the review screen once its application leaves the queue (decided
  // elsewhere, or removed by a refresh).
  useEffect(() => {
    if (reviewing != null && !q.entries.some((e) => e.profile.id === reviewing)) {
      setReviewing(null)
    }
  }, [q.entries, reviewing])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 6000)
  }

  const confirming = q.confirming
  const confirmingEntry = confirming
    ? q.entries.find((e) => e.profile.id === confirming.id) ?? null
    : null

  const toastFor = (o: DecisionOutcome, kind: 'approve' | 'reject', fallbackStore: string) => {
    if (o.ok) {
      showToast(
        kind === 'approve'
          ? M.approvedToast(o.storeName || fallbackStore)
          : M.rejectedToast(o.storeName || fallbackStore),
      )
    } else if (o.reason === 'not_pending') {
      showToast(o.message || M.noLongerPendingToast)
    } else if (o.reason === 'not_found') {
      showToast(M.notFoundToast)
    } else {
      showToast(M.decisionRetryToast)
    }
  }

  const runApprove = async (id: number, store: string) => {
    const o = await q.approve(id)
    q.closeConfirm(id) // approve dialog always closes; card re-enables on a transient error
    toastFor(o, 'approve', store)
  }

  const runReject = async (id: number, store: string, reason: string) => {
    const o = await q.reject(id, reason)
    // FR-020: on a transient failure keep the dialog open with the typed reason.
    if (!(o.ok === false && o.reason === 'transient')) q.closeConfirm(id)
    toastFor(o, 'reject', store)
  }

  return (
    <div className="min-h-full bg-[#f7f1e6] p-4 font-['Tajawal'] md:p-8" dir="rtl">
      <PageHeader
        title={M.pageTitle}
        subtitle={q.status === 'ready' ? M.awaitingCount(q.count) : M.subtitle}
        actions={q.status === 'ready' && (
          <button type="button" onClick={q.refresh} className={bannerBtnLight}>
            <RefreshCw size={14} aria-hidden="true" />
            {M.refresh}
          </button>
        )}
      />

      {q.status === 'loading' && <p className="text-sm text-gray-500">{M.loading}</p>}

      {q.status === 'error' && (
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">{M.queueError}</p>
          <button
            type="button"
            onClick={q.refresh}
            className="rounded-xl bg-[#7a0d0d] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#5a0909]"
          >
            {M.retry}
          </button>
        </div>
      )}

      {q.status === 'ready' && q.count === 0 && (
        <p className="rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc] p-10 text-center text-sm font-bold text-gray-400">
          {M.empty}
        </p>
      )}

      {q.status === 'ready' && q.count > 0 && (
        <div className="flex flex-col gap-3">
          {q.entries.map((entry) => (
            <CookApplicationRow
              key={entry.profile.id}
              entry={entry}
              cityName={cities.resolve(entry.profile.city_id)}
              onOpen={() => setReviewing(entry.profile.id)}
            />
          ))}
        </div>
      )}

      {reviewingEntry && (
        <CookReviewOverlay
          entry={reviewingEntry}
          cityName={cities.resolve(reviewingEntry.profile.city_id)}
          busy={q.cardState(reviewingEntry.profile.id) === 'submitting'}
          onView={(docs, index) => setViewer({ docs, index })}
          onApprove={() => q.openConfirm(reviewingEntry.profile.id, 'approve')}
          onReject={() => q.openConfirm(reviewingEntry.profile.id, 'reject')}
          onClose={() => setReviewing(null)}
        />
      )}

      <div aria-live="polite" role="status" className="sr-only">
        {toast}
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {viewer && (
        <DocumentViewer
          docs={viewer.docs}
          index={viewer.index}
          onIndexChange={(index) => setViewer((v) => (v ? { ...v, index } : v))}
          onClose={() => setViewer(null)}
        />
      )}

      {confirming && confirmingEntry && confirming.kind === 'approve' && (
        <ApproveDialog
          storeName={confirmingEntry.profile.store_name}
          busy={q.cardState(confirming.id) === 'submitting'}
          onConfirm={() => runApprove(confirming.id, confirmingEntry.profile.store_name)}
          onCancel={() => q.closeConfirm(confirming.id)}
        />
      )}

      {confirming && confirmingEntry && confirming.kind === 'reject' && (
        <RejectDialog
          storeName={confirmingEntry.profile.store_name}
          busy={q.cardState(confirming.id) === 'submitting'}
          onSubmit={(reason) => runReject(confirming.id, confirmingEntry.profile.store_name, reason)}
          onCancel={() => q.closeConfirm(confirming.id)}
        />
      )}
    </div>
  )
}
