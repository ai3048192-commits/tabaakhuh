import type { DocumentRef } from './types'

/** How a document should be rendered in the viewer. */
export type DocumentMedia = 'image' | 'pdf' | 'unknown'

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'heic', 'heif', 'svg', 'tif', 'tiff',
])

/**
 * The file extension of a URL's *path* — query string and fragment stripped, so
 * a signed CDN link (`…/contract.pdf?sig=…`) still resolves. `''` when the path
 * has no extension, which is normal for CDN links that carry the type in a
 * header instead.
 */
export function urlExtension(url: string): string {
  // Relative URLs are valid here; the base is only needed to parse them.
  let path: string
  try {
    path = new URL(url, 'https://placeholder.invalid').pathname
  } catch {
    path = url.split('?')[0].split('#')[0]
  }
  const last = path.slice(path.lastIndexOf('/') + 1)
  const dot = last.lastIndexOf('.')
  if (dot <= 0 || dot === last.length - 1) return ''
  return last.slice(dot + 1).toLowerCase()
}

/**
 * What a URL points at, judged by its extension and — for Cloudinary — by the
 * delivery-type segment it carries. `unknown` when neither says.
 */
export function detectMedia(url: string): DocumentMedia {
  const ext = urlExtension(url)
  if (ext === 'pdf') return 'pdf'
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  // Cloudinary encodes the resource type in the path: `/image/upload/…` is an
  // image even when the public id carries no extension. `/raw/upload/…` is an
  // opaque blob, so it stays unknown.
  if (/\/image\/(upload|fetch|authenticated)\//.test(url)) return 'image'
  return 'unknown'
}

/**
 * How to render one document. Every kind except `contract` is an image field by
 * API contract, so it is trusted as-is; only the contract — which the backend
 * may return as a PDF *or* a scanned photo — is sniffed from its URL.
 *
 * An unrecognised contract URL falls back to `unknown`, which the viewer frames
 * (an `<iframe>` displays PDFs, images and text alike) rather than guessing.
 */
export function resolveMedia(doc: Pick<DocumentRef, 'kind' | 'url'>): DocumentMedia {
  if (doc.url === null) return 'unknown'
  if (doc.kind !== 'contract') return 'image'
  return detectMedia(doc.url)
}
