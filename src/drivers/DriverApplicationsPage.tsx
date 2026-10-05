import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useCityNames } from '../cities/useCityNames'
import DocumentViewer from '../review/DocumentViewer'
import { useDriverApplications } from './useDriverApplications'
import DriverApplicationRow from './DriverApplicationRow'
import DriverReviewOverlay from './DriverReviewOverlay'
import ApproveDialog from './ApproveDialog'
import RejectDialog from './RejectDialog'
import { driverMessages as M } from './messages'
import type { DecisionOutcome, DocumentRef } from './types'
import PageHeader from '../shared/PageHeader'
import { bannerBtnLight } from '../shared/ui'

/** `/drivers` — the pending driver applications review screen (US1–US3). */
export default function DriverApplicationsPage() {
  const q = useDriverApplications()
  const cities = useCityNames()
  const [toast, setToast] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ docs: DocumentRef[]; index: number } | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>(undefined)
  const [reviewing, setReviewing] = useState<number | null>(null)

  const reviewingEntry =
    reviewing != null ? (q.entries.find((e) => e.id === reviewing) ?? null) : null

  // Close the review screen once its application leaves the queue (decided elsewhere,
  // or removed by a refresh).
  useEffect(() => {
    if (reviewing != null && !q.entries.some((e) => e.id === reviewing)) setReviewing(null)
  }, [q.entries, reviewing])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 6000)
  }

  const confirming = q.confirming
  const confirmingEntry = confirming
    ? q.entries.find((e) => e.id === confirming.id) ?? null
    : null

  const toastFor = (o: DecisionOutcome, kind: 'approve' | 'reject') => {
    if (o.ok) {
      showToast(kind === 'approve' ? M.approvedToast : M.rejectedToast)
    } else if (o.reason === 'not_pending') {
      showToast(o.message || M.noLongerPendingToast)
    } else if (o.reason === 'not_found') {
      showToast(M.notFoundToast)
    } else if (o.reason === 'validation') {
      setFieldError(o.message || M.rejectReasonRequired)
    } else {
      showToast(M.decisionRetryToast)
    }
  }

  const runApprove = async (id: number) => {
    const o = await q.approve(id)
    q.closeConfirm(id) // approve dialog always closes; card re-enables on a transient error
    toastFor(o, 'approve')
  }

  const runReject = async (id: number, reason: string) => {
    setFieldError(undefined)
    const o = await q.reject(id, reason)
    // FR-020 / FR-027: on a transient or validation failure keep the dialog open.
    const keepOpen = o.ok === false && (o.reason === 'transient' || o.reason === 'validation')
    if (!keepOpen) q.closeConfirm(id)
    toastFor(o, 'reject')
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
            <DriverApplicationRow
              key={entry.id}
              entry={entry}
              cityName={cities.resolve(entry.city_id)}
              onOpen={() => setReviewing(entry.id)}
            />
          ))}
        </div>
      )}

      {reviewingEntry && (
        <DriverReviewOverlay
          entry={reviewingEntry}
          cityName={cities.resolve(reviewingEntry.city_id)}
          busy={q.cardState(reviewingEntry.id) === 'submitting'}
          onView={(docs, index) => setViewer({ docs, index })}
          onApprove={() => q.openConfirm(reviewingEntry.id, 'approve')}
          onReject={() => {
            setFieldError(undefined)
            q.openConfirm(reviewingEntry.id, 'reject')
          }}
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
          driverLabel={M.driverLabel(confirmingEntry.id)}
          busy={q.cardState(confirming.id) === 'submitting'}
          onConfirm={() => runApprove(confirming.id)}
          onCancel={() => q.closeConfirm(confirming.id)}
        />
      )}

      {confirming && confirmingEntry && confirming.kind === 'reject' && (
        <RejectDialog
          driverLabel={M.driverLabel(confirmingEntry.id)}
          busy={q.cardState(confirming.id) === 'submitting'}
          fieldError={fieldError}
          onSubmit={(reason) => runReject(confirming.id, reason)}
          onCancel={() => q.closeConfirm(confirming.id)}
        />
      )}
    </div>
  )
}
