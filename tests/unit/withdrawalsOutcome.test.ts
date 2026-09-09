import { describe, it, expect } from 'vitest'
import { ApiError } from '../../src/api/envelope'
import { classifyActionError } from '../../src/withdrawals/outcome'

describe('classifyActionError (data-model §6)', () => {
  it('422 → invalid_transition carrying the message', () => {
    expect(classifyActionError(new ApiError(422, 'not in approved status'))).toEqual({
      reason: 'invalid_transition',
      message: 'not in approved status',
    })
  })
  it('404 → not_found', () => {
    expect(classifyActionError(new ApiError(404, 'gone'))).toEqual({ reason: 'not_found' })
  })
  it('0 / 5xx / plain Error → transient', () => {
    expect(classifyActionError(new ApiError(0, 'net'))).toEqual({ reason: 'transient' })
    expect(classifyActionError(new ApiError(503, 'down'))).toEqual({ reason: 'transient' })
    expect(classifyActionError(new Error('boom'))).toEqual({ reason: 'transient' })
  })
})
