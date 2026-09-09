import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtCooks } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, pendingCook, cityList } from '../helpers/fixtures'
import { cookMessages as M } from '../../src/cooks/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /admin/cities', { json: ok(cityList()) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  // SC-003: every reject request that was sent carried a non-empty reason.
  const rejects = fm.calls.filter((c) => c.path.endsWith('/reject'))
  for (const c of rejects) {
    const body = c.body as { reason?: string } | undefined
    expect((body?.reason ?? '').trim().length).toBeGreaterThanOrEqual(1)
  }
  vi.unstubAllGlobals()
  localStorage.clear()
})

function one() {
  fm.reply('GET /admin/cooks/pending', {
    json: ok([pendingCook({ id: 1, store_name: 'مطبخ أول' }, null)]),
  })
}

/** Open the review screen for "مطبخ أول", then its Reject dialog. */
async function openReject(user: ReturnType<typeof userEvent.setup>) {
  const article = (await screen.findByText('مطبخ أول')).closest('article') as HTMLElement
  await user.click(within(article).getByRole('button', { name: M.review }))
  await screen.findByRole('dialog', { name: M.reviewHeading })
  await user.click(screen.getByRole('button', { name: M.reject }))
  return screen.findByRole('dialog', { name: M.rejectTitle('مطبخ أول') })
}

describe('US3 — reject a cook application with a reason', () => {
  it('AC1/AC2: an empty or whitespace reason blocks submission and is flagged', async () => {
    const user = userEvent.setup()
    one()
    renderAtCooks(fm)
    await openReject(user)

    const submit = screen.getByRole('button', { name: M.confirmReject })
    expect(submit).toBeDisabled()
    expect(screen.getByText(M.rejectReasonRequired)).toBeInTheDocument()

    await user.type(screen.getByLabelText(M.rejectReasonLabel), '    ')
    expect(submit).toBeDisabled()
    expect(fm.count('POST /admin/cooks/1/reject')).toBe(0)
  })

  it('AC3: a reason longer than 1000 chars is capped at the limit', async () => {
    const user = userEvent.setup()
    one()
    renderAtCooks(fm)
    await openReject(user)

    const textarea = screen.getByLabelText(M.rejectReasonLabel) as HTMLTextAreaElement
    await user.click(textarea)
    await user.paste('x'.repeat(1500))

    expect(textarea.value).toHaveLength(1000)
    expect(screen.getByText(M.rejectCounter(1000))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: M.confirmReject })).toBeEnabled()
  })

  it('AC4: a valid reason submits {reason}, removes the row, and shows a success toast', async () => {
    const user = userEvent.setup()
    one()
    fm.reply('POST /admin/cooks/1/reject', { json: ok(null) })
    renderAtCooks(fm)
    await openReject(user)

    await user.type(screen.getByLabelText(M.rejectReasonLabel), 'صور البطاقة غير واضحة')
    await user.click(screen.getByRole('button', { name: M.confirmReject }))

    await waitFor(() => expect(screen.queryByText('مطبخ أول')).toBeNull())
    expect(fm.count('POST /admin/cooks/1/reject')).toBe(1)
    expect(fm.lastCall('POST /admin/cooks/1/reject')?.body).toEqual({
      reason: 'صور البطاقة غير واضحة',
    })
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(M.rejectedToast('مطبخ أول')),
    )
  })

  it('AC6: a 500 keeps the dialog open with the reason intact and a retryable toast', async () => {
    const user = userEvent.setup()
    one()
    fm.reply('POST /admin/cooks/1/reject', { status: 500, json: fail('Something went wrong.') })
    renderAtCooks(fm)
    await openReject(user)

    await user.type(screen.getByLabelText(M.rejectReasonLabel), 'الرخصة منتهية')
    await user.click(screen.getByRole('button', { name: M.confirmReject }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(M.decisionRetryToast),
    )
    expect(screen.getByRole('dialog', { name: M.rejectTitle('مطبخ أول') })).toBeInTheDocument()
    expect((screen.getByLabelText(M.rejectReasonLabel) as HTMLTextAreaElement).value).toBe(
      'الرخصة منتهية',
    )
    expect(screen.getByRole('button', { name: M.confirmReject })).toBeEnabled()
  })

  it('AC5: a 422 (not pending) removes the row and shows the server message', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cooks/pending',
      { json: ok([pendingCook({ id: 1, store_name: 'مطبخ أول' }, null)]) },
      { json: ok([]) },
    )
    fm.reply('POST /admin/cooks/1/reject', {
      status: 422,
      json: fail('لم يعد الطلب في حالة الانتظار.'),
    })
    renderAtCooks(fm)
    await openReject(user)

    await user.type(screen.getByLabelText(M.rejectReasonLabel), 'سبب كافٍ')
    await user.click(screen.getByRole('button', { name: M.confirmReject }))

    await waitFor(() => expect(screen.queryByText('مطبخ أول')).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('لم يعد الطلب في حالة الانتظار.'),
    )
    await waitFor(() => expect(fm.count('GET /admin/cooks/pending')).toBe(2))
  })
})
