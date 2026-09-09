import { describe, it, expect } from 'vitest'
import { parseEnvelope, ApiError } from '../../src/api/envelope'

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('parseEnvelope', () => {
  it('returns data on a success envelope', async () => {
    const data = await parseEnvelope<{ x: number }>(
      jsonRes({ success: true, data: { x: 1 }, message: 'OK', errors: null }),
    )
    expect(data).toEqual({ x: 1 })
  })

  it('throws ApiError with status + message on success:false', async () => {
    await expect(
      parseEnvelope(jsonRes({ success: false, data: null, message: 'Unauthenticated.', errors: null }, 401)),
    ).rejects.toMatchObject({ name: 'ApiError', status: 401, message: 'Unauthenticated.' })
  })

  it('maps 422 validation errors into fieldErrors', async () => {
    try {
      await parseEnvelope(
        jsonRes(
          { success: false, data: null, message: 'The given data was invalid.', errors: { identifier: ['required'] } },
          422,
        ),
      )
      expect.unreachable('should have thrown')
    } catch (e) {
      const err = e as ApiError
      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(422)
      expect(err.fieldErrors).toEqual({ identifier: ['required'] })
    }
  })

  it('throws ApiError(status) for a non-JSON error body', async () => {
    await expect(
      parseEnvelope(new Response('<html>500</html>', { status: 500 })),
    ).rejects.toMatchObject({ name: 'ApiError', status: 500 })
  })

  it('throws ApiError(0) for a non-JSON body on an ok response', async () => {
    await expect(
      parseEnvelope(new Response('not json', { status: 200 })),
    ).rejects.toMatchObject({ name: 'ApiError', status: 0 })
  })

  it('treats HTTP-ok with success !== true as an error', async () => {
    await expect(parseEnvelope(jsonRes({ data: {}, message: '' }, 200))).rejects.toBeInstanceOf(ApiError)
  })
})
