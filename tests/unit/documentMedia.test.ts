import { describe, it, expect } from 'vitest'
import { detectMedia, resolveMedia, urlExtension } from '../../src/review/documentMedia'

describe('urlExtension', () => {
  it('reads the extension off the path', () => {
    expect(urlExtension('https://cdn.test/contract.pdf')).toBe('pdf')
    expect(urlExtension('https://cdn.test/a/b/scan.JPG')).toBe('jpg')
  })

  it('ignores the query string and fragment — signed CDN links still resolve', () => {
    expect(urlExtension('https://cdn.test/contract.pdf?sig=abc&x=1')).toBe('pdf')
    expect(urlExtension('https://cdn.test/contract.pdf#page=2')).toBe('pdf')
    // a dot in the query must not be mistaken for the extension
    expect(urlExtension('https://cdn.test/contract?file=x.png')).toBe('')
  })

  it('returns "" when the path carries no extension', () => {
    expect(urlExtension('https://cdn.test/files/abc123')).toBe('')
    expect(urlExtension('https://cdn.test/')).toBe('')
    expect(urlExtension('https://cdn.test/trailing.')).toBe('')
    // a dotfile is not an extension
    expect(urlExtension('https://cdn.test/.gitignore')).toBe('')
  })
})

describe('detectMedia', () => {
  it('recognises a PDF', () => {
    expect(detectMedia('https://cdn.test/contract-12.pdf')).toBe('pdf')
  })

  it('recognises the common image extensions, case-insensitively', () => {
    for (const ext of ['jpg', 'JPEG', 'png', 'webp', 'heic', 'avif', 'tiff']) {
      expect(detectMedia(`https://cdn.test/scan.${ext}`)).toBe('image')
    }
  })

  it('reads a Cloudinary image delivery path that has no extension', () => {
    expect(detectMedia('https://res.cloudinary.com/demo/image/upload/v1/contracts/abc')).toBe(
      'image',
    )
    expect(detectMedia('https://res.cloudinary.com/demo/image/authenticated/v1/abc')).toBe('image')
  })

  it('leaves a Cloudinary raw path unknown — it could be anything', () => {
    expect(detectMedia('https://res.cloudinary.com/demo/raw/upload/v1/contracts/abc')).toBe(
      'unknown',
    )
  })

  it('is unknown when nothing in the URL says', () => {
    expect(detectMedia('https://cdn.test/files/abc123')).toBe('unknown')
  })
})

describe('resolveMedia', () => {
  it('trusts every non-contract kind as an image, whatever the URL looks like', () => {
    // These fields are image URLs by API contract; an odd-looking one must not
    // be downgraded to a frame.
    expect(resolveMedia({ kind: 'id_front', url: 'https://cdn.test/files/abc' })).toBe('image')
    expect(resolveMedia({ kind: 'avatar', url: 'https://cdn.test/x.pdf' })).toBe('image')
  })

  it('sniffs the contract, because the backend may send a PDF or a photo', () => {
    expect(resolveMedia({ kind: 'contract', url: 'https://cdn.test/c.pdf' })).toBe('pdf')
    expect(resolveMedia({ kind: 'contract', url: 'https://cdn.test/c.jpg' })).toBe('image')
    expect(resolveMedia({ kind: 'contract', url: 'https://cdn.test/c' })).toBe('unknown')
  })

  it('is unknown for a missing URL', () => {
    expect(resolveMedia({ kind: 'contract', url: null })).toBe('unknown')
    expect(resolveMedia({ kind: 'id_front', url: null })).toBe('unknown')
  })
})
