import { vi, type Mock } from 'vitest'

export interface MockReply {
  status?: number
  json?: unknown
  /** Simulate a transport failure (offline / DNS / CORS). */
  networkError?: boolean
  /** Hold the response open for this many ms (to observe in-flight UI). */
  delayMs?: number
}

export interface RecordedCall {
  method: string
  path: string
  body: unknown
  authorization: string | null
}

export interface FetchMock {
  fn: Mock
  calls: RecordedCall[]
  /**
   * Configure replies for `"<METHOD> <path>"`. Pass one reply to always return
   * it, or several to return them in order (the last repeats once exhausted).
   */
  reply(key: string, ...replies: MockReply[]): FetchMock
  count(key: string): number
  lastCall(key: string): RecordedCall | undefined
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

export function installFetchMock(): FetchMock {
  const calls: RecordedCall[] = []
  const queues = new Map<string, MockReply[]>()

  const fn = vi.fn(async (input: unknown, init: RequestInit = {}) => {
    const path = String(input).replace(/^https?:\/\/[^/]+/, '')
    const method = (init.method ?? 'GET').toUpperCase()
    const key = `${method} ${path}`
    const headers = new Headers(init.headers as HeadersInit | undefined)

    calls.push({
      method,
      path,
      body: typeof init.body === 'string' ? safeParse(init.body) : undefined,
      authorization: headers.get('authorization'),
    })

    const queue = queues.get(key)
    if (!queue || queue.length === 0) {
      throw new Error(`fetchMock: no reply configured for "${key}"`)
    }
    const reply = queue.length > 1 ? (queue.shift() as MockReply) : queue[0]

    if (reply.delayMs) await new Promise((r) => setTimeout(r, reply.delayMs))
    if (reply.networkError) throw new TypeError('Failed to fetch')

    return new Response(JSON.stringify(reply.json ?? null), {
      status: reply.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  })

  vi.stubGlobal('fetch', fn)

  const api: FetchMock = {
    fn,
    calls,
    reply(key, ...replies) {
      queues.set(key, replies)
      return api
    },
    count(key) {
      return calls.filter((c) => `${c.method} ${c.path}` === key).length
    },
    lastCall(key) {
      return [...calls].reverse().find((c) => `${c.method} ${c.path}` === key)
    },
  }
  return api
}
