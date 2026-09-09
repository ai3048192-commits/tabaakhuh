import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CloudinaryError,
  MAX_UPLOAD_BYTES,
  cloudinaryConfigured,
  uploadImage,
} from '../../src/settings/cloudinary'

function fileOf(bytes: number, type = 'image/png'): File {
  return new File([new Uint8Array(bytes)], 'logo.png', { type })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cloudinary.uploadImage', () => {
  it('is configured from the test env vars', () => {
    expect(cloudinaryConfigured).toBe(true)
  })

  it('rejects an unsupported file type before any request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await expect(uploadImage(fileOf(10, 'application/pdf'))).rejects.toMatchObject({
      name: 'CloudinaryError',
      kind: 'bad_type',
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a file over the size cap before any request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await expect(uploadImage(fileOf(MAX_UPLOAD_BYTES + 1))).rejects.toMatchObject({
      kind: 'too_large',
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('POSTs multipart form data to the account endpoint and returns secure_url', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(
        JSON.stringify({ secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/logo.png', width: 240, height: 240, bytes: 1234 }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const res = await uploadImage(fileOf(64))
    expect(res.url).toBe('https://res.cloudinary.com/test-cloud/image/upload/v1/logo.png')
    expect(res.width).toBe(240)

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/upload')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('upload_preset')).toBe('test-preset')
    expect((init.body as FormData).get('file')).toBeInstanceOf(File)
  })

  it('maps a transport failure to kind "network"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    await expect(uploadImage(fileOf(64))).rejects.toMatchObject({ kind: 'network' })
  })

  it('maps a non-2xx response to kind "rejected" with Cloudinary\'s message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'Invalid upload preset' } }), { status: 400 }),
    ))
    const err = await uploadImage(fileOf(64)).catch((e) => e)
    expect(err).toBeInstanceOf(CloudinaryError)
    expect(err.kind).toBe('rejected')
    expect(err.detail).toBe('Invalid upload preset')
  })

  it('re-throws an AbortError untouched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError')
    }))
    await expect(uploadImage(fileOf(64))).rejects.toMatchObject({ name: 'AbortError' })
  })
})
