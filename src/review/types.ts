/**
 * Shared shape for a document shown in the review DocumentViewer. `kind` is left
 * as a free string so each feature can pass its own document-kind union
 * (`'id_front' | 'id_back' | 'license'` for drivers; the cook set adds
 * `'avatar' | 'banner' | 'contract'`). The viewer only special-cases
 * `kind === 'contract'` (rendered in an `<iframe>`); every other kind is an image.
 */
export interface DocumentRef {
  kind: string
  url: string | null
  label: string
}
