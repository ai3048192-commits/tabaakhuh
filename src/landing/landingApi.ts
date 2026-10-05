import { apiRequest, authedRequest } from '../api/httpClient'
import { DEFAULT_LANDING_CONTENT, mergeWithDefaults, type LandingContent } from './content'

interface Wire {
  content: unknown
  updated_at: string | null
}

export interface LoadedLanding {
  content: LandingContent
  /** False when nothing has been saved yet (the page is showing defaults). */
  saved: boolean
  updatedAt: string | null
}

function toLoaded(wire: Wire | null | undefined): LoadedLanding {
  const stored = wire?.content
  return {
    content: mergeWithDefaults(DEFAULT_LANDING_CONTENT, stored),
    saved: stored != null,
    updatedAt: wire?.updated_at ?? null,
  }
}

/** `GET /landing-content` — public, no session needed. */
export async function fetchLandingContent(signal?: AbortSignal): Promise<LoadedLanding> {
  return toLoaded(await apiRequest<Wire>('/landing-content', { signal }))
}

/**
 * The landing content is fetched as soon as the app boots on a public page
 * (`main.tsx`), in parallel with the page's own code, and the page takes
 * that same request instead of starting a second one after it mounts.
 */
let early: Promise<LoadedLanding> | null = null

export function prefetchLandingContent(): void {
  if (early) return
  early = fetchLandingContent()
  early.catch(() => { /* the page falls back to its own fetch */ })
}

/** Hands over the early request (once), or starts a fresh one. */
export function takeLandingContent(signal?: AbortSignal): Promise<LoadedLanding> {
  const p = early
  early = null
  return p ?? fetchLandingContent(signal)
}

/**
 * The last content this browser saw, so a repeat visit paints immediately
 * and refreshes in the background. Best-effort: any storage failure just
 * means no cache.
 */
const CACHE_KEY = 'tabbakha.landingCache'

export function readCachedLanding(): LandingContent | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? mergeWithDefaults(DEFAULT_LANDING_CONTENT, JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function writeCachedLanding(content: LandingContent): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(content))
  } catch {
    /* storage full or blocked — fine */
  }
}

/** `PUT /admin/landing-content` — replaces the whole document. */
export async function saveLandingContent(content: LandingContent): Promise<LoadedLanding> {
  return toLoaded(await authedRequest<Wire>('/admin/landing-content', { method: 'PUT', body: { content } }))
}

/**
 * The editor's "معاينة" button hands its unsaved draft to the landing page in
 * a new tab through localStorage (the only storage two tabs share).
 */
export const PREVIEW_STORAGE_KEY = 'tabbakha.landingPreview'

export function writePreviewDraft(content: LandingContent): boolean {
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(content))
    return true
  } catch {
    return false
  }
}

export function readPreviewDraft(): LandingContent | null {
  try {
    const raw = localStorage.getItem(PREVIEW_STORAGE_KEY)
    return raw ? mergeWithDefaults(DEFAULT_LANDING_CONTENT, JSON.parse(raw)) : null
  } catch {
    return null
  }
}

const SAFE_SCHEMES = new Set(['http:', 'https:', 'tel:', 'mailto:'])

/**
 * Links on the landing page are admin-written. Page anchors, site paths and
 * web / phone / mail URLs pass; anything else (e.g. `javascript:`) is dropped.
 */
export function safeHref(href: string | null | undefined): string | undefined {
  const v = href?.trim()
  if (!v) return undefined
  if (v.startsWith('#') || (v.startsWith('/') && !v.startsWith('//'))) return v
  try {
    return SAFE_SCHEMES.has(new URL(v).protocol) ? v : undefined
  } catch {
    return undefined
  }
}

/** `01555641619` → `+201555641619`; already-international numbers are kept. */
export function toInternationalPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('0')) return `+20${digits.slice(1)}`
  return digits
}
