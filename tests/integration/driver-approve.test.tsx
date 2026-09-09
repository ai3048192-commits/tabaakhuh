import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtDrivers } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, pendingDriver, approvedDriver, cityList } from '../helpers/fixtures'
import { driverMessages as M } from '../../src/drivers/messages'

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
  fm.reply('GET /admin/drivers/pending', {
    json: ok([pendingDriver({ id: 1 }), pendingDriver({ id: 2 })]),
  })
}

/** Open the review screen for the first queued row (US1 → US2/US3 entry point). */
async function openReview(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText(M.driverLabel(1))
  await user.click(screen.getAllByRole('button', { name: M.review })[0])
  return screen.findByRole('dialog', { name: M.reviewHeading })
}

describe('US2 — approve a driver application', () => {
  it('AC6: cancelling the confirmation sends no request and keeps the application', async () => {
    const user = userEvent.setup()
    queue()
    renderAtDrivers(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.cancel }))

    expect(fm.count('POST /admin/drivers/1/approve')).toBe(0)
    expect(screen.getAllByText(M.driverLabel(1)).length).toBeGreaterThan(0)
  })

  it('AC1: confirming approves with no body, removes the row, and shows a success toast', async () => {
    const user = userEvent.setup()
    queue()
    fm.reply('POST /admin/drivers/1/approve', { json: approvedDriver({ id: 1 }) })
    renderAtDrivers(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.confirmApprove }))

    await waitFor(() => expect(screen.queryByText(M.driverLabel(1))).toBeNull())
    expect(fm.count('POST /admin/drivers/1/approve')).toBe(1)
    expect(fm.lastCall('POST /admin/drivers/1/approve')?.body).toBeUndefined()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.approvedToast))
  })

  it('AC2: controls disable while in flight and a triple click sends one request (SC-005)', async () => {
    const user = userEvent.setup()
    queue()
    fm.reply('POST /admin/drivers/1/approve', { delayMs: 40, json: approvedDriver({ id: 1 }) })
    renderAtDrivers(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    const confirm = await screen.findByRole('button', { name: M.confirmApprove })
    await user.click(confirm)
    await user.click(confirm)
    await user.click(confirm)

    expect(screen.getByRole('button', { name: M.approve })).toBeDisabled()
    expect(screen.getByRole('button', { name: M.reject })).toBeDisabled()

    await waitFor(() => expect(screen.queryByText(M.driverLabel(1))).toBeNull())
    expect(fm.count('POST /admin/drivers/1/approve')).toBe(1)
  })

  it('AC3: a 422 (not pending) removes the row, shows the server message, and refetches (SC-004)', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/drivers/pending',
      { json: ok([pendingDriver({ id: 1 }), pendingDriver({ id: 2 })]) },
      { json: ok([pendingDriver({ id: 2 })]) },
    )
    fm.reply('POST /admin/drivers/1/approve', {
      status: 422,
      json: fail('لم يعد الطلب في حالة الانتظار.'),
    })
    renderAtDrivers(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.confirmApprove }))

    await waitFor(() => expect(screen.queryByText(M.driverLabel(1))).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('لم يعد الطلب في حالة الانتظار.'),
    )
    await waitFor(() => expect(fm.count('GET /admin/drivers/pending')).toBe(2))
  })

  it('AC4: a 404 removes the row, shows "not found", and refetches', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/drivers/pending',
      { json: ok([pendingDriver({ id: 1 })]) },
      { json: ok([]) },
    )
    fm.reply('POST /admin/drivers/1/approve', { status: 404, json: fail('غير موجود') })
    renderAtDrivers(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.confirmApprove }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.notFoundToast))
    await waitFor(() => expect(fm.count('GET /admin/drivers/pending')).toBe(2))
  })

  it('AC5: a 500 keeps the application, re-enables controls, and shows a retryable toast', async () => {
    const user = userEvent.setup()
    queue()
    fm.reply('POST /admin/drivers/1/approve', { status: 500, json: fail('Something went wrong.') })
    renderAtDrivers(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.confirmApprove }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.decisionRetryToast))
    expect(screen.getAllByText(M.driverLabel(1)).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: M.approve })).toBeEnabled()
  })

  it('FR-026: a 200 with an unreadable body still removes the row and confirms success', async () => {
    const user = userEvent.setup()
    queue()
    fm.reply('POST /admin/drivers/1/approve', {
      json: { success: true, data: null, message: '', errors: null },
    })
    renderAtDrivers(fm)

    await openReview(user)
    await user.click(screen.getByRole('button', { name: M.approve }))
    await user.click(await screen.findByRole('button', { name: M.confirmApprove }))

    await waitFor(() => expect(screen.queryByText(M.driverLabel(1))).toBeNull())
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.approvedToast))
  })
})
