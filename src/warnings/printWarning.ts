import type { WarningDocument } from './warningDocument'

/**
 * Opens the letter in its own window and brings up the print dialog, where the
 * admin can print it or pick "Save as PDF".
 *
 * Why print instead of generating a PDF in JavaScript: PDF libraries need an
 * embedded Arabic font and their own letter-joining and RTL handling, and they
 * get it visibly wrong. The browser already shapes Arabic correctly, and its
 * PDF output keeps the text real and selectable. The window's `<title>` is the
 * file name the browser suggests, so each PDF is saved under the person's name.
 *
 * All scripting runs from this side. The new window inherits the production
 * CSP (`script-src 'self'`), which would block any inline script in the letter.
 *
 * Returns `false` when a popup blocker refused the window.
 */
export function printWarning(doc: WarningDocument): boolean {
  const w = window.open('', '_blank')
  if (!w) return false

  w.document.open()
  w.document.write(doc.html)
  w.document.close()
  w.document.title = doc.title

  const print = () => {
    w.focus()
    w.print()
  }
  w.document.getElementById('print-warning')?.addEventListener('click', print)

  // Wait for the logo and the Tajawal webfont, or the first print preview
  // renders in a fallback font. Capped so a slow or offline font CDN never
  // blocks the dialog.
  let done = false
  const once = () => {
    if (done) return
    done = true
    const fonts = w.document.fonts?.ready ?? Promise.resolve()
    void Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(print)
  }
  w.addEventListener('load', once)
  setTimeout(once, 2500)
  return true
}
