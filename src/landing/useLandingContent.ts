import { useEffect, useState } from 'react'
import { DEFAULT_LANDING_CONTENT, type LandingContent } from './content'
import { fetchLandingContent, readPreviewDraft } from './landingApi'

/** How long the page waits for the saved content before showing the defaults. */
const MAX_WAIT_MS = 2500

/**
 * The content the landing page renders. `ready` turns true once the saved
 * document arrives — or, if the API is slow or down, after `MAX_WAIT_MS` with
 * the built-in defaults, so the public page never hangs or shows an error.
 * `?preview=1` renders the editor's unsaved draft instead.
 */
export function useLandingContent(): { content: LandingContent; ready: boolean } {
  const [preview] = useState(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('preview') === '1' ? readPreviewDraft() : null
  })
  const [content, setContent] = useState<LandingContent>(preview ?? DEFAULT_LANDING_CONTENT)
  const [ready, setReady] = useState(preview != null)

  useEffect(() => {
    if (preview) return
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => setReady(true), MAX_WAIT_MS)
    fetchLandingContent(ctrl.signal)
      .then((loaded) => setContent(loaded.content))
      .catch(() => { /* keep defaults */ })
      .finally(() => {
        if (ctrl.signal.aborted) return
        window.clearTimeout(timer)
        setReady(true)
      })
    return () => {
      ctrl.abort()
      window.clearTimeout(timer)
    }
  }, [preview])

  return { content, ready }
}
