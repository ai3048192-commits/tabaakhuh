/**
 * Unsigned, client-side image upload to Cloudinary — used by the Settings
 * "store info" logo / icon fields. The admin picks a file; we upload the binary
 * straight to Cloudinary and hand back the resulting `secure_url`. That URL is
 * what the dashboard persists (via `PUT /admin/settings`) — the raw file never
 * touches our own backend.
 *
 * Configuration (build-time, see `.env.example`):
 *   VITE_CLOUDINARY_CLOUD_NAME     – the account cloud name
 *   VITE_CLOUDINARY_UPLOAD_PRESET  – an *unsigned* upload preset
 *   VITE_CLOUDINARY_FOLDER         – optional destination folder
 */

const CLOUD_NAME = ((import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ?? '').trim()
const UPLOAD_PRESET = ((import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined) ?? '').trim()
const FOLDER = ((import.meta.env.VITE_CLOUDINARY_FOLDER as string | undefined) ?? '').trim()

/** True when both required vars are present, i.e. uploads can be attempted. */
export const cloudinaryConfigured = CLOUD_NAME !== '' && UPLOAD_PRESET !== ''

/** 5 MB — comfortably above a logo/icon, well below Cloudinary's free-tier cap. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const

/** The `accept` attribute value for the file input. */
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')

export type UploadErrorKind = 'unconfigured' | 'bad_type' | 'too_large' | 'network' | 'rejected'

export class CloudinaryError extends Error {
  constructor(
    readonly kind: UploadErrorKind,
    /** Cloudinary's own message when it rejected the upload, if any. */
    readonly detail?: string,
  ) {
    super(detail ?? kind)
    this.name = 'CloudinaryError'
  }
}

export interface UploadResult {
  /** `secure_url` from Cloudinary — this is what gets persisted. */
  url: string
  width: number | null
  height: number | null
  bytes: number | null
}

interface CloudinaryUploadResponse {
  secure_url?: string
  url?: string
  width?: number
  height?: number
  bytes?: number
  error?: { message?: string }
}

/**
 * Upload one image file to Cloudinary. Rejects with a {@link CloudinaryError}
 * whose `kind` maps to a user-facing message; every other error path is
 * normalised to `network` / `rejected`.
 */
export async function uploadImage(file: File, signal?: AbortSignal): Promise<UploadResult> {
  if (!cloudinaryConfigured) throw new CloudinaryError('unconfigured')
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    throw new CloudinaryError('bad_type')
  }
  if (file.size > MAX_UPLOAD_BYTES) throw new CloudinaryError('too_large')

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  if (FOLDER) form.append('folder', FOLDER)

  let res: Response
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new CloudinaryError('network')
  }

  let body: CloudinaryUploadResponse | null
  try {
    body = (await res.json()) as CloudinaryUploadResponse
  } catch {
    body = null
  }

  if (!res.ok) throw new CloudinaryError('rejected', body?.error?.message)

  const url = body?.secure_url ?? body?.url
  if (!url) throw new CloudinaryError('rejected')

  return {
    url,
    width: body?.width ?? null,
    height: body?.height ?? null,
    bytes: body?.bytes ?? null,
  }
}
