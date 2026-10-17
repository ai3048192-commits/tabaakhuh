import { useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { bannerBtnLight } from '../shared/ui'
import { downloadAccountsPdf, exportAccounts } from './usersApi'
import { exportFileName, saveAccountsXlsx, saveBlob } from './accountsExport'
import { userMessages as M } from './messages'

/**
 * "تصدير Excel" / "تصدير PDF" on the all-accounts screen — every account on
 * the platform, whatever the filters on screen. `onError` shows the page toast.
 */
export default function AccountsExportButtons({ onError }: { onError: (msg: string) => void }) {
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null)

  const run = async (kind: 'xlsx' | 'pdf') => {
    setBusy(kind)
    try {
      if (kind === 'xlsx') await saveAccountsXlsx(await exportAccounts())
      else saveBlob(await downloadAccountsPdf(), exportFileName('pdf'))
    } catch {
      onError(M.exportFailed)
    } finally {
      setBusy(null)
    }
  }

  const button = (kind: 'xlsx' | 'pdf', label: string, Icon: typeof FileText) => (
    <button type="button" onClick={() => void run(kind)} disabled={busy !== null} className={bannerBtnLight}>
      {busy === kind ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
      {busy === kind ? M.exporting : label}
    </button>
  )

  return (
    <>
      {button('xlsx', M.exportExcel, FileSpreadsheet)}
      {button('pdf', M.exportPdf, FileText)}
    </>
  )
}
