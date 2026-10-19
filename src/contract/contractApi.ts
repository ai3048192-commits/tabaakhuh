import { authedDownload, authedRequest } from '../api/httpClient'

/** specs/070 — one contract version, as `GET /admin/contracts` returns it. */
export interface ContractSection {
  title: string
  clauses: string[]
}

export interface ContractAck {
  key: string | null
  text: string
}

export interface ContractVersion {
  id: number
  version: number
  label: string
  status: 'draft' | 'published'
  is_current: boolean
  title: string
  intro: string
  sections: ContractSection[]
  acknowledgements: ContractAck[]
  declaration: string
  footer: string
  change_note: string | null
  requires_resign: boolean
  published_at: string | null
  updated_at: string | null
  signature_count: number
}

export interface ContractContent {
  title: string
  intro: string
  sections: ContractSection[]
  acknowledgements: ContractAck[]
  declaration: string
  footer: string
}

export async function listContracts(signal?: AbortSignal) {
  return authedRequest<{ versions: ContractVersion[]; placeholders: string[] }>('/admin/contracts', { signal })
}

export async function startDraft() {
  return (await authedRequest<{ version: ContractVersion }>('/admin/contracts/drafts', { method: 'POST' })).version
}

export async function saveDraft(id: number, content: ContractContent) {
  return (await authedRequest<{ version: ContractVersion }>(`/admin/contracts/${id}`, { method: 'PUT', body: content })).version
}

export async function deleteDraft(id: number) {
  return authedRequest<null>(`/admin/contracts/${id}`, { method: 'DELETE' })
}

export async function publishVersion(id: number, changeNote: string, requiresResign: boolean) {
  return (
    await authedRequest<{ version: ContractVersion }>(`/admin/contracts/${id}/publish`, {
      method: 'POST',
      body: { change_note: changeNote, requires_resign: requiresResign },
    })
  ).version
}

/** Opens the version's sample PDF (same renderer as a real signature) in a new tab. */
export async function openPreviewPdf(id: number) {
  const { blob } = await authedDownload(`/admin/contracts/${id}/preview-pdf`)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** The editable part of a version. */
export function contentOf(v: ContractVersion): ContractContent {
  return {
    title: v.title,
    intro: v.intro,
    sections: v.sections.map((s) => ({ title: s.title, clauses: [...s.clauses] })),
    acknowledgements: v.acknowledgements.map((a) => ({ ...a })),
    declaration: v.declaration,
    footer: v.footer,
  }
}

/** What each auto-filled `{placeholder}` means, and the sample the preview shows. */
export const PLACEHOLDER_INFO: Record<string, { label: string; sample: string }> = {
  signer_name: { label: 'اسم الطباخة', sample: 'سعاد محمد أحمد' },
  national_id: { label: 'الرقم القومي', sample: '28001010101234' },
  store_name: { label: 'اسم المطبخ', sample: 'مطبخ سعاد' },
  phone: { label: 'الموبايل', sample: '01012345678' },
  email: { label: 'الإيميل', sample: 'cook@example.com' },
  address: { label: 'العنوان', sample: 'مدينة نصر، القاهرة' },
  signed_date: { label: 'تاريخ التوقيع', sample: '18 أكتوبر 2026' },
  platform_email: { label: 'إيميل المنصة', sample: 'tabbakha.info@gmail.com' },
  commission_percent: { label: 'نسبة العمولة', sample: '0' },
  version: { label: 'رقم النسخة', sample: 'v4' },
}

export function fillSample(text: string, version: string): string {
  return text.replace(/\{([a-z_]+)\}/g, (m, name: string) =>
    name === 'version' ? version : PLACEHOLDER_INFO[name]?.sample ?? m,
  )
}
