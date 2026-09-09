import { describe, it, expect } from 'vitest'
import { classifyMutation } from '../../src/cities/mutationOutcome'
import { ApiError } from '../../src/api/envelope'

describe('classifyMutation (data-model §5)', () => {
  it('null (resolved) → ok', () => {
    expect(classifyMutation(null)).toEqual({ ok: true, message: '' })
  })

  it('422 with a name_ar errors entry → field-level validation', () => {
    const out = classifyMutation(
      new ApiError(422, 'The given data was invalid.', { name_ar: ['مستخدم بالفعل'] }),
    )
    expect(out).toEqual({
      ok: false,
      reason: 'validation',
      fieldErrors: { name_ar: 'مستخدم بالفعل' },
      message: 'The given data was invalid.',
    })
  })

  it('422 with a name_en errors entry → field-level validation', () => {
    const out = classifyMutation(new ApiError(422, 'x', { name_en: ['taken'] }))
    expect(out).toMatchObject({ reason: 'validation', fieldErrors: { name_en: 'taken' } })
  })

  it('422 with a null errors map → form-level validation', () => {
    expect(classifyMutation(new ApiError(422, 'bad', null))).toEqual({
      ok: false,
      reason: 'validation',
      message: 'bad',
    })
  })

  it('422 whose errors map has only unrelated keys → form-level validation', () => {
    const out = classifyMutation(new ApiError(422, 'bad', { other: ['x'] }))
    expect(out).toEqual({ ok: false, reason: 'validation', message: 'bad' })
  })

  it('404 → not_found', () => {
    expect(classifyMutation(new ApiError(404, 'nope'))).toEqual({
      ok: false,
      reason: 'not_found',
    })
  })

  it('0 (network) / 500 / a plain Error → transient', () => {
    expect(classifyMutation(new ApiError(0, 'offline'))).toEqual({
      ok: false,
      reason: 'transient',
    })
    expect(classifyMutation(new ApiError(500, 'boom'))).toEqual({
      ok: false,
      reason: 'transient',
    })
    expect(classifyMutation(new Error('weird'))).toEqual({ ok: false, reason: 'transient' })
  })
})
