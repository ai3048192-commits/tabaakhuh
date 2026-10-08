import { X } from 'lucide-react'
import DialogShell from '../shared/DialogShell'
import { depositMessages as M } from './messages'

/** The customer's transfer screenshot, full size. */
export default function ProofViewer({
  url,
  orderNumber,
  onClose,
}: {
  url: string
  orderNumber: string | null
  onClose: () => void
}) {
  return (
    <DialogShell label={M.openProof} onDismiss={onClose} size="md" padded={false}>
      <div className="flex items-center justify-between border-b border-[#f3ead9] px-5 py-3">
        <h2 className="text-sm font-black text-[#7a0d0d]">{M.proofAlt(orderNumber)}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={M.close}
          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-[#faf3e7]"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-auto bg-[#faf3e7] p-3">
        <img src={url} alt={M.proofAlt(orderNumber)} className="mx-auto w-full rounded-xl object-contain" />
      </div>
    </DialogShell>
  )
}
