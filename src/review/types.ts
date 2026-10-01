/**
 * Shared shape for a document shown in the review DocumentViewer. `kind` is left
 * as a free string so each feature can pass its own document-kind union
 * (`'id_front' | 'id_back' | 'license'` for drivers; the cook set adds
 * `'avatar' | 'banner' | 'contract'`). The viewer only special-cases
 * `kind === 'contract'` (rendered in an `<iframe>`); every other kind is an image.
 */
/** Who sent a cook/driver application (`applicant` on the pending queues). */
export interface Applicant {
  id: number
  name: string
  email: string
  phone: string | null
  email_verified: boolean
}

export interface DocumentRef {
  kind: string
  url: string | null
  label: string
}
