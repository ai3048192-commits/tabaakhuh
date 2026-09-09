import { describe, it, expect } from 'vitest'
import { ApiError } from '../../src/api/envelope'
import { classifySettingsMutation } from '../../src/settings/mutationOutcome'

describe('classifySettingsMutation (data-model §4)', () => {
  it('null (a resolved call) → ok', () => {
    expect(classifySettingsMutation(null)).toEqual({ ok: true, message: '' })
  })

  it('422 with a delivery_fee field error → validation with that message', () => {
    const err = new ApiError(422, 'The given data was invalid.', {
      delivery_fee: ['يجب أن تكون القيمة صفراً أو أكثر.'],
    })
    expect(classifySettingsMutation(err)).toEqual({
      ok: false,
      reason: 'validation',
      message: 'يجب أن تكون القيمة صفراً أو أكثر.',
    })
  })

  it('422 with no usable errors map → validation with the envelope message', () => {
    const err = new ApiError(422, 'The given data was invalid.', null)
    expect(classifySettingsMutation(err)).toEqual({
      ok: false,
      reason: 'validation',
      message: 'The given data was invalid.',
    })
  })

  it('422 whose errors map has only an unrelated key → validation with the envelope message', () => {
    const err = new ApiError(422, 'The given data was invalid.', { other: ['x'] })
    expect(classifySettingsMutation(err)).toEqual({
      ok: false,
      reason: 'validation',
      message: 'The given data was invalid.',
    })
  })

  it('network (0) / 5xx / unexpected status / non-ApiError → transient', () => {
    expect(classifySettingsMutation(new ApiError(0, 'Network request failed'))).toEqual({
      ok: false,
      reason: 'transient',
    })
    expect(classifySettingsMutation(new ApiError(500, 'boom'))).toEqual({
      ok: false,
      reason: 'transient',
    })
    expect(classifySettingsMutation(new ApiError(418, 'teapot'))).toEqual({
      ok: false,
      reason: 'transient',
    })
    expect(classifySettingsMutation(new Error('nope'))).toEqual({
      ok: false,
      reason: 'transient',
    })
  })
})
