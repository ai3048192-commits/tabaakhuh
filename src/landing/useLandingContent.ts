import { useEffect, useState } from 'react'
import { DEFAULT_LANDING_CONTENT, type LandingContent } from './content'
import { readCachedLanding, readPreviewDraft, takeLandingContent, writeCachedLanding } from './landingApi'

/** How long the page waits for the saved content before showing the defaults. */
const MAX_WAIT_MS = 2500

/**
 * The content the landing page renders. A repeat visit paints at once from
 * the copy this browser cached last time and refreshes it in the background.
 * A first visit waits for the saved document — or, if the API is slow or
 * down, `MAX_WAIT_MS` and then shows the built-in defaults, so the public
 * page never hangs or shows an error. `?preview=1` renders the editor's
 * unsaved draft instead.
 */
export function useLandingContent(): { content: LandingContent; ready: boolean } {
  const [preview] = useState(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('preview') === '1' ? readPreviewDraft() : null
  })
  const [cached] = useState(() => (preview ? null : readCachedLanding()))
  const [content, setContent] = useState<LandingContent>(preview ?? cached ?? DEFAULT_LANDING_CONTENT)
  const [ready, setReady] = useState(preview != null || cached != null)

  useEffect(() => {
    if (preview) return
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => setReady(true), MAX_WAIT_MS)
    takeLandingContent(ctrl.signal)
      .then((loaded) => {
        if (ctrl.signal.aborted) return
        setContent(loaded.content)
        if (loaded.saved) writeCachedLanding(loaded.content)
      })
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
