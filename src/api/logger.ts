/**
 * Tiny logging seam for the auth layer. Console in dev only; silent in
 * production and under the test runner.
 *
 * IMPORTANT (FR-025): never pass request bodies, passwords, or bearer tokens
 * to these functions. Callers log status codes and paths only.
 */
const enabled = import.meta.env.DEV && import.meta.env.MODE !== 'test'

type Meta = Record<string, unknown>

export const logger = {
  info(msg: string, meta?: Meta): void {
    if (enabled) console.info(`[auth] ${msg}`, meta ?? '')
  },
  warn(msg: string, meta?: Meta): void {
    if (enabled) console.warn(`[auth] ${msg}`, meta ?? '')
  },
  error(msg: string, meta?: Meta): void {
    if (enabled) console.error(`[auth] ${msg}`, meta ?? '')
  },
}
