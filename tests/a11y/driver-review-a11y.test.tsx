import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { renderAtDrivers } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, pendingDriver, cityList } from '../helpers/fixtures'
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

const AXE_WCAG = {
  runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
} as const

function populated() {
  fm.reply('GET /admin/drivers/pending', {
    json: ok([
      pendingDriver({ id: 1 }),
      pendingDriver({ id: 2, license_url: null, vehicle_plate_letters: '' }),
    ]),
  })
}

/** Open the review screen for the queue row at `index` (0-based). */
async function openReview(user: ReturnType<typeof userEvent.setup>, index = 0) {
  await screen.findByText(M.driverLabel(1))
  await user.click(screen.getAllByRole('button', { name: M.review })[index])
  return screen.findByRole('dialog', { name: M.reviewHeading })
}

describe('Driver review — accessibility (WCAG 2.1 AA, SC-009 / FR-034)', () => {
  it('the populated queue and rows have no AA violations', async () => {
    populated()
    const { container } = renderAtDrivers(fm)
    await screen.findByText(M.driverLabel(1))
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the review screen has no AA violations', async () => {
    populated()
    const user = userEvent.setup()
    renderAtDrivers(fm)
    await openReview(user)
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()
  })

  it('the loading state has no AA violations', async () => {
    fm.reply('GET /admin/drivers/pending', { delayMs: 30, json: ok([]) })
    const { container } = renderAtDrivers(fm)
    await screen.findByText(M.loading)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the empty state has no AA violations', async () => {
    fm.reply('GET /admin/drivers/pending', { json: ok([]) })
    const { container } = renderAtDrivers(fm)
    await screen.findByText(M.empty)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the error state has no AA violations', async () => {
    fm.reply('GET /admin/drivers/pending', { status: 500, json: fail('boom') })
    const { container } = renderAtDrivers(fm)
    await screen.findByText(M.queueError)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the image document viewer has no AA violations and is keyboard-operable across 3 docs', async () => {
    const user = userEvent.setup()
    populated()
    renderAtDrivers(fm)

    const overlay = await openReview(user)
    const tile = within(overlay).getByRole('button', { name: M.docIdFront })
    await user.click(tile)
    await screen.findByRole('dialog', { name: M.docIdFront })
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()

    await user.keyboard('{ArrowLeft}')
    expect(await screen.findByRole('dialog', { name: M.docIdBack })).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(await screen.findByRole('dialog', { name: M.docLicense })).toBeInTheDocument()
    await user.keyboard('+')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: M.docLicense })).toBeNull())
    expect(tile).toHaveFocus()
  })

  it('the "document unavailable" viewer state has no AA violations', async () => {
    const user = userEvent.setup()
    populated()
    renderAtDrivers(fm)

    // The second row (id 2) has license_url: null.
    const overlay = await openReview(user, 1)
    await user.click(within(overlay).getByRole('button', { name: M.docLicense }))
    const dialog = await screen.findByRole('dialog', { name: M.docLicense })
    expect(within(dialog).getByText(M.docUnavailable)).toBeInTheDocument()
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()
  })

  it('the approve dialog has no AA violations and restores focus on close', async () => {
    const user = userEvent.setup()
    populated()
    renderAtDrivers(fm)

    const overlay = await openReview(user)
    const approve = within(overlay).getByRole('button', { name: M.approve })
    await user.click(approve)
    await screen.findByRole('dialog', { name: M.approveTitle(M.driverLabel(1)) })
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()

    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: M.approveTitle(M.driverLabel(1)) })).toBeNull(),
    )
    expect(approve).toHaveFocus()
  })

  it('the reject dialog has no AA violations; the textarea is labelled and the counter is described', async () => {
    const user = userEvent.setup()
    populated()
    renderAtDrivers(fm)

    const overlay = await openReview(user)
    await user.click(within(overlay).getByRole('button', { name: M.reject }))
    await screen.findByRole('dialog', { name: M.rejectTitle(M.driverLabel(1)) })

    const textarea = screen.getByLabelText(M.rejectReasonLabel)
    expect(textarea).toHaveAttribute('aria-describedby', expect.stringContaining('reject-counter'))
    expect(screen.getByText(M.rejectReasonRequired)).toBeInTheDocument()
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()
  })
})
