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
  localStorage.clear()
})

function queue() {
  fm.reply('GET /admin/cooks/pending', {
    json: ok([
      pendingCook({ id: 1, store_name: 'مطبخ أول' }, null),
      pendingCook({ id: 2, store_name: 'مطبخ ثانٍ' }, null),
    ]),
  })
}

/** Open the review screen for the row whose heading is `storeName`. */
async function openReview(user: ReturnType<typeof userEvent.setup>, storeName = 'مطبخ أول') {
  const article = (await screen.findByText(storeName)).closest('article') as HTMLElement
  await user.click(within(article).getByRole('button', { name: M.review }))
  return screen.findByRole('dialog', { name: M.reviewHeading })
}

describe('US2 — approve a cook application', () => {
  it('AC6: cancelling the confirmation sends no request and keeps the application', async () => {
    const user = userEvent.setup()
    queue()
    renderAtCooks(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.cancel }))

    expect(fm.count('POST /admin/cooks/1/approve')).toBe(0)
    expect(screen.getAllByText('مطبخ أول').length).toBeGreaterThan(0)
  })

  it('AC1: confirming approves with no body, removes the row, and shows a success toast', async () => {
    const user = userEvent.setup()
    queue()
    fm.reply('POST /admin/cooks/1/approve', { json: ok(null) })
    renderAtCooks(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.confirmApprove }))

    await waitFor(() => expect(screen.queryByText('مطبخ أول')).toBeNull())
    expect(fm.count('POST /admin/cooks/1/approve')).toBe(1)
    expect(fm.lastCall('POST /admin/cooks/1/approve')?.body).toBeUndefined()
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(M.approvedToast('مطبخ أول')),
    )
  })

  it('AC2: controls disable while in flight and a double click sends one request (SC-005)', async () => {
    const user = userEvent.setup()
    queue()
    fm.reply('POST /admin/cooks/1/approve', { delayMs: 40, json: ok(null) })
    renderAtCooks(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    const confirm = await screen.findByRole('button', { name: M.confirmApprove })
    await user.click(confirm)
    await user.click(confirm)
    await user.click(confirm)

    expect(screen.getByRole('button', { name: M.approve })).toBeDisabled()
    expect(screen.getByRole('button', { name: M.reject })).toBeDisabled()

    await waitFor(() => expect(screen.queryByText('مطبخ أول')).toBeNull())
    expect(fm.count('POST /admin/cooks/1/approve')).toBe(1)
  })

  it('AC3: a 422 (not pending) removes the row, shows the server message, and refetches (SC-004)', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cooks/pending',
      { json: ok([pendingCook({ id: 1, store_name: 'مطبخ أول' }, null), pendingCook({ id: 2, store_name: 'مطبخ ثانٍ' }, null)]) },
      { json: ok([pendingCook({ id: 2, store_name: 'مطبخ ثانٍ' }, null)]) },
    )
    fm.reply('POST /admin/cooks/1/approve', {
      status: 422,
      json: fail('لم يعد الطلب في حالة الانتظار.'),
    })
    renderAtCooks(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.confirmApprove }))

    await waitFor(() => expect(screen.queryByText('مطبخ أول')).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('لم يعد الطلب في حالة الانتظار.'),
    )
    await waitFor(() => expect(fm.count('GET /admin/cooks/pending')).toBe(2))
  })

  it('AC4: a 404 removes the row, shows "not found", and refetches', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cooks/pending',
      { json: ok([pendingCook({ id: 1, store_name: 'مطبخ أول' }, null)]) },
      { json: ok([]) },
    )
    fm.reply('POST /admin/cooks/1/approve', { status: 404, json: fail('غير موجود') })
    renderAtCooks(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.confirmApprove }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(M.notFoundToast),
    )
    await waitFor(() => expect(fm.count('GET /admin/cooks/pending')).toBe(2))
  })

  it('AC5: a 500 keeps the application, re-enables controls, and shows a retryable toast', async () => {
    const user = userEvent.setup()
    queue()
    fm.reply('POST /admin/cooks/1/approve', { status: 500, json: fail('Something went wrong.') })
    renderAtCooks(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.confirmApprove }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(M.decisionRetryToast),
    )
    expect(screen.getAllByText('مطبخ أول').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: M.approve })).toBeEnabled()
  })

  it('FR-025: a 200 with an unreadable body still removes the row and confirms success', async () => {
    const user = userEvent.setup()
    queue()
    fm.reply('POST /admin/cooks/1/approve', { json: { success: true, data: null, message: '', errors: null } })
    renderAtCooks(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.confirmApprove }))

    await waitFor(() => expect(screen.queryByText('مطبخ أول')).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(M.approvedToast('مطبخ أول')),
    )
  })
})
