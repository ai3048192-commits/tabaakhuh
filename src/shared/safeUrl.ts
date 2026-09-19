/**
 * Document, avatar and attachment URLs arrive as plain strings the API stores
 * verbatim — applicants submit them from the mobile apps, so they are attacker
 * controlled. React does not sanitise `href`/`src`, so a `javascript:` value
 * would execute in the admin's origin on click and could read the session token
 * out of `localStorage`. Everything that is not a plain web URL is dropped.
 */
const SAFE_PROTOCOLS = new Set(['http:', 'https:'])

export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (trimmed === '') return undefined
  // Protocol-relative and site-relative URLs inherit the page's own scheme.
  if (trimmed.startsWith('/')) return trimmed
  try {
    if (!SAFE_PROTOCOLS.has(new URL(trimmed).protocol)) return undefined
  } catch {
    return undefined
  }
  return trimmed
}
