import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Injects the production Content-Security-Policy. Build-only: the dev server
 * serves inline module preambles for HMR that `script-src 'self'` would block.
 *
 * `frame-ancestors` is deliberately absent — a `<meta>` CSP cannot express it,
 * so clickjacking protection has to come from a server header instead.
 */
function cspPlugin(apiOrigin: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    // React writes element `style` attributes (e.g. the viewer's zoom transform).
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // Applicant documents and avatars are served from arbitrary upload hosts.
    "img-src 'self' data: blob: https:",
    `connect-src 'self' https://api.cloudinary.com${apiOrigin ? ` ${apiOrigin}` : ''}`,
    // The document viewer frames contracts hosted off-origin.
    'frame-src https:',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'tabaakhuh-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      ),
  }
}

/** The API's own origin, when `VITE_API_BASE_URL` is absolute (it is relative behind the dev proxy). */
function originOf(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

/**
 * `connect-src` is built from `VITE_API_BASE_URL` at *build* time, so a missing
 * or relative value bakes a policy that blocks every cross-origin API call —
 * and it fails silently in the browser console, long after deploying. A
 * relative base is correct only when the API is served from this same origin
 * (the dev proxy, or `dist/` dropped behind the Laravel app). Anything else has
 * to be caught here, because nothing downstream can catch it.
 */
function assertApiBaseUrl(raw: string, isBuild: boolean): void {
  if (!isBuild) return
  if (originOf(raw)) return

  const reason = raw.trim() === ''
    ? 'VITE_API_BASE_URL is not set'
    : `VITE_API_BASE_URL is relative ("${raw}")`

  if (process.env.ALLOW_SAME_ORIGIN_API === '1') {
    console.warn(
      `\n[tabaakhuh] ${reason}. Building for a SAME-ORIGIN deployment: the API must ` +
        `be reachable under this site's own domain, or every request will be blocked by CSP.\n`,
    )
    return
  }

  throw new Error(
    `\n[tabaakhuh] Refusing to build: ${reason}.\n\n` +
      `  The Content-Security-Policy baked into dist/index.html allows API calls only to\n` +
      `  origins known at build time. With no absolute origin, connect-src stays 'self'\n` +
      `  and the deployed dashboard cannot reach the backend at all.\n\n` +
      `  Fix one of these:\n` +
      `    - Cross-origin API: set an absolute URL, e.g.\n` +
      `        VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build\n` +
      `    - Same-origin API (dist/ served by the backend, or proxied under /api):\n` +
      `        ALLOW_SAME_ORIGIN_API=1 npm run build\n`,
  )
}

// Single source of truth for the dev server. The frontend calls the API
// with the relative base `/api` (see .env → VITE_API_BASE_URL=/api/v1);
// this proxy forwards that to the Laravel backend, so the backend port
// lives in exactly one place.
export default defineConfig(({ mode, command }) => {
  const apiBaseUrl = loadEnv(mode, process.cwd(), '').VITE_API_BASE_URL ?? ''
  assertApiBaseUrl(apiBaseUrl, command === 'build')

  return {
    plugins: [react(), cspPlugin(originOf(apiBaseUrl))],
    build: {
      sourcemap: false,
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: false,
          configure: (proxy) =>
            proxy.on('proxyReq', (req) => {
              req.removeHeader('origin')
              req.removeHeader('referer')
              req.removeHeader('cookie')
            }),
        },
      },
    },
  }
})
