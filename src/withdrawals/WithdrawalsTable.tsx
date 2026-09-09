import WithdrawalRow from './WithdrawalRow'
import { withdrawalMessages as M } from './messages'
import type { ActionKind, RowStatus, Withdrawal } from './types'

/** The queue table. Scrolls inside its own container, not the page (FR-040). */
export default function WithdrawalsTable({
  items,
  rowState,
  onAction,
}: {
  items: Withdrawal[]
  rowState: (id: number) => RowStatus
  onAction: (id: number, kind: ActionKind) => void
}) {
  const th = 'px-3 py-2 text-right text-xs font-black text-gray-500'
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full min-w-[820px] border-collapse">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <th scope="col" className={th}>{M.colId}</th>
            <th scope="col" className={th}>{M.colAmount}</th>
            <th scope="col" className={th}>{M.colPaymentDetails}</th>
            <th scope="col" className={th}>{M.colStatus}</th>
            <th scope="col" className={th}>{M.colRequestedAt}</th>
            <th scope="col" className={th}>{M.colProcessedAt}</th>
            <th scope="col" className={th}>{M.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((w) => (
            <WithdrawalRow
              key={w.id}
              item={w}
              state={rowState(w.id)}
              onAction={(k) => onAction(w.id, k)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
