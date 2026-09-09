import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtDrivers } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, pendingDriver, rejectedDriver, cityList } from '../helpers/fixtures'
import { driverMessages as M } from '../../src/drivers/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /admin/cities', { json: ok(cityList()) })
})
afterEach(() => {
  // SC-003: every reject request that was sent carried a non-empty reason ≤ 1000 chars.
  const rejects = fm.calls.filter((c) => c.path.endsWith('/reject'))
  for (const c of rejects) {
    const body = c.body as { reason?: string } | undefined
    const reason = body?.reason ?? ''
    expect(reason.trim().length).toBeGreaterThanOrEqual(1)
    expect(reason.length).toBeLessThanOrEqual(1000)
  }
  vi.unstubAllGlobals()
  localStorage.clear()
})

function one() {
  fm.reply('GET /admin/drivers/pending', { json: ok([pendingDriver({ id: 1 })]) })
}

/** Open the review screen for the first row, then its Reject dialog. */
async function openReject(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText(M.driverLabel(1))
  await user.click(screen.getAllByRole('button', { name: M.review })[0])
  await screen.findByRole('dialog', { name: M.reviewHeading })
  await user.click(screen.getByRole('button', { name: M.reject }))
  return screen.findByRole('dialog', { name: M.rejectTitle(M.driverLabel(1)) })
}

describe('US3 — reject a driver application with a reason', () => {
  it('AC1: the Reject action opens a modal', async () => {
    const user = userEvent.setup()
    one()
    renderAtDrivers(fm)
    const dialog = await openReject(user)
    expect(dialog).toHaveAttribute('aria-label', M.rejectTitle(M.driverLabel(1)))
  })

  it('AC1/AC2: an empty or whitespace reason blocks submission and is flagged', async () => {
    const user = userEvent.setup()
    one()
    renderAtDrivers(fm)
    await openReject(user)

    const submit = screen.getByRole('button', { name: M.confirmReject })
    expect(submit).toBeDisabled()
    expect(screen.getByText(M.rejectReasonRequired)).toBeInTheDocument()

    await user.type(screen.getByLabelText(M.rejectReasonLabel), '    ')
    expect(submit).toBeDisabled()
    expect(fm.count('POST /admin/drivers/1/reject')).toBe(0)
  })

  it('AC3: a reason longer than 1000 chars is capped at the limit', async () => {
    const user = userEvent.setup()
    one()
    renderAtDrivers(fm)
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
    fm.reply('POST /admin/drivers/1/reject', { json: rejectedDriver({ id: 1 }) })
    renderAtDrivers(fm)
    await openReject(user)

    await user.type(screen.getByLabelText(M.rejectReasonLabel), 'الرخصة منتهية')
    await user.click(screen.getByRole('button', { name: M.confirmReject }))

    await waitFor(() => expect(screen.queryByText(M.driverLabel(1))).toBeNull())
    expect(fm.lastCall('POST /admin/drivers/1/reject')?.body).toEqual({ reason: 'الرخصة منتهية' })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.rejectedToast))
  })

  it('AC6: a 500 keeps the dialog open with the typed reason and shows a retryable toast', async () => {
    const user = userEvent.setup()
    one()
    fm.reply('POST /admin/drivers/1/reject', { status: 500, json: fail('boom') })
    renderAtDrivers(fm)
    await openReject(user)

    await user.type(screen.getByLabelText(M.rejectReasonLabel), 'سبب مؤقت')
    await user.click(screen.getByRole('button', { name: M.confirmReject }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.decisionRetryToast))
    expect(screen.getByRole('dialog', { name: M.rejectTitle(M.driverLabel(1)) })).toBeInTheDocument()
    expect((screen.getByLabelText(M.rejectReasonLabel) as HTMLTextAreaElement).value).toBe('سبب مؤقت')
    expect(screen.getAllByText(M.driverLabel(1)).length).toBeGreaterThan(0)
  })

  it('AC7: cancelling the modal sends no request and keeps the application', async () => {
    const user = userEvent.setup()
    one()
    renderAtDrivers(fm)
    await openReject(user)

    await user.type(screen.getByLabelText(M.rejectReasonLabel), 'كلام')
    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: M.rejectTitle(M.driverLabel(1)) })).toBeNull(),
    )
    expect(fm.count('POST /admin/drivers/1/reject')).toBe(0)
    expect(screen.getAllByText(M.driverLabel(1)).length).toBeGreaterThan(0)
  })

  it('AC5: a 422 (not pending) removes the row, shows the server message, and refetches', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/drivers/pending',
      { json: ok([pendingDriver({ id: 1 })]) },
      { json: ok([]) },
    )
    fm.reply('POST /admin/drivers/1/reject', {
      status: 422,
      json: fail('لم يعد الطلب في حالة الانتظار.'),
    })
    renderAtDrivers(fm)
    await openReject(user)

    await user.type(screen.getByLabelText(M.rejectReasonLabel), 'الرخصة منتهية')
    await user.click(screen.getByRole('button', { name: M.confirmReject }))

    await waitFor(() => expect(screen.queryByText(M.driverLabel(1))).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('لم يعد الطلب في حالة الانتظار.'),
    )
    await waitFor(() => expect(fm.count('GET /admin/drivers/pending')).toBe(2))
  })

  it('FR-027: a 422 with errors.reason keeps the dialog open and surfaces the field error', async () => {
    const user = userEvent.setup()
    one()
    fm.reply('POST /admin/drivers/1/reject', {
      status: 422,
      json: fail('The given data was invalid.', { reason: ['حقل السبب مطلوب.'] }),
    })
    renderAtDrivers(fm)
    await openReject(user)

    await user.type(screen.getByLabelText(M.rejectReasonLabel), 'x')
    await user.click(screen.getByRole('button', { name: M.confirmReject }))

    expect(await screen.findByText('حقل السبب مطلوب.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: M.rejectTitle(M.driverLabel(1)) })).toBeInTheDocument()
    expect(screen.getAllByText(M.driverLabel(1)).length).toBeGreaterThan(0)
  })
})
