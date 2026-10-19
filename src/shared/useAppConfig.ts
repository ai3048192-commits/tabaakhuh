import { useEffect, useState } from 'react'
import { apiRequest } from '../api/httpClient'

/** The public `GET /app-config` values the dashboard cares about. */
export interface AppConfig {
  /**
   * specs/070 — the platform's own drivers. Off: cooks send delivery orders
   * with their own courier, so the driver pages (kept, not deleted) are
   * hidden from the menu until the next phase turns them back on.
   */
  driver_delivery_enabled: boolean
}

let cached: AppConfig | null = null
let inflight: Promise<AppConfig> | null = null

/** Defaults to "drivers on" until the config arrives, so nothing vanishes on a slow load by mistake. */
const FALLBACK: AppConfig = { driver_delivery_enabled: true }

function load(): Promise<AppConfig> {
  if (cached) return Promise.resolve(cached)
  inflight ??= apiRequest<Partial<AppConfig>>('/app-config')
    .then((data) => {
      cached = { driver_delivery_enabled: data?.driver_delivery_enabled ?? true }
      return cached
    })
    .catch(() => FALLBACK)
    .finally(() => { inflight = null })
  return inflight
}

export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(cached ?? FALLBACK)
  useEffect(() => {
    let alive = true
    void load().then((c) => { if (alive) setConfig(c) })
    return () => { alive = false }
  }, [])
  return config
}
