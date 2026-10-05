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
  const th = 'px-4 py-3 text-right text-xs font-bold text-gray-400'
  return (
    <div className="overflow-x-auto rounded-3xl bg-white shadow-[0_18px_40px_-30px_rgba(122,13,13,0.45)] ring-1 ring-[#efe3cc]">
      <table className="w-full min-w-[820px] border-collapse">
        <thead className="bg-[#fffaf1]">
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
