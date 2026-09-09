import StatusBadge from './StatusBadge'
import { formatAmount, formatDateTime, PLACEHOLDER } from './format'
import { withdrawalMessages as M } from './messages'
import type { ActionKind, RowStatus, Withdrawal } from './types'

/** One queue row. Action buttons are a pure function of `item.status`. */
export default function WithdrawalRow({
  item,
  state,
  onAction,
}: {
  item: Withdrawal
  state: RowStatus
  onAction: (kind: ActionKind) => void
}) {
  const td = 'px-3 py-3 align-middle text-sm text-gray-700'
  const busy = state === 'submitting'
  const actBtn =
    'rounded-lg border px-2.5 py-1.5 text-xs font-bold disabled:opacity-50'

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className={`${td} font-bold text-gray-900`} dir="ltr">
        {item.id}
      </td>
      <td className={td} dir="ltr">
        {formatAmount(item.amount)}
      </td>
      <td className={td} dir="ltr">
        {item.payment_details && item.payment_details.trim() !== ''
          ? item.payment_details
          : PLACEHOLDER}
      </td>
      <td className={td}>
        <StatusBadge status={item.status} />
      </td>
      <td className={td} dir="ltr">
        {formatDateTime(item.requested_at)}
      </td>
      <td className={td} dir="ltr">
        {formatDateTime(item.processed_at)}
      </td>
      <td className={td}>
        <div className="flex flex-wrap gap-2">
          {item.status === 'pending' && (
            <>
              <button
                type="button"
                disabled={busy}
                aria-busy={busy}
                onClick={() => onAction('approve')}
                className={`${actBtn} border-emerald-300 bg-emerald-50 text-emerald-800`}
              >
                {M.actionApprove}
              </button>
              <button
                type="button"
                disabled={busy}
                aria-busy={busy}
                onClick={() => onAction('reject')}
                className={`${actBtn} border-red-300 bg-red-50 text-red-700`}
              >
                {M.actionReject}
              </button>
            </>
          )}
          {item.status === 'approved' && (
            <button
              type="button"
              disabled={busy}
              aria-busy={busy}
              onClick={() => onAction('mark_paid')}
              className={`${actBtn} border-blue-300 bg-blue-50 text-blue-800`}
            >
              {M.actionMarkPaid}
            </button>
          )}
          {(item.status === 'rejected' || item.status === 'paid') && (
            <span className="text-xs text-gray-300">{PLACEHOLDER}</span>
          )}
        </div>
      </td>
    </tr>
  )
}
