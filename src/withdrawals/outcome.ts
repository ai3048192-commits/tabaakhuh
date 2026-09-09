import { ApiError } from '../api/envelope'

/**
 * Classify an action-call rejection into the three handled outcomes
 * (data-model.md §6). `401` is handled upstream and never reaches here.
 */
export function classifyActionError(
  err: unknown,
):
  | { reason: 'invalid_transition'; message: string }
  | { reason: 'not_found' }
  | { reason: 'transient' } {
  if (err instanceof ApiError) {
    if (err.status === 422) return { reason: 'invalid_transition', message: err.message }
    if (err.status === 404) return { reason: 'not_found' }
  }
  return { reason: 'transient' }
}
