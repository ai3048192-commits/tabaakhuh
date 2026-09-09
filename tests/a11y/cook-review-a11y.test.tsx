import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { renderAtCooks } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, pendingCook, signedContract, cityList } from '../helpers/fixtures'
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

const AXE_WCAG = {
  runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
} as const

function populated() {
  fm.reply('GET /admin/cooks/pending', {
    json: ok([
      { cook_profile: pendingCook({ id: 1, store_name: 'مطبخ موقّع' }).cook_profile, contract: signedContract() },
      pendingCook({ id: 2, store_name: 'مطبخ بلا عقد', avatar_url: null }, null),
    ]),
  })
}

/** Open the review screen for the row whose heading is `storeName`. */
async function openReview(user: ReturnType<typeof userEvent.setup>, storeName = 'مطبخ موقّع') {
  const article = (await screen.findByText(storeName)).closest('article') as HTMLElement
  await user.click(within(article).getByRole('button', { name: M.review }))
  return screen.findByRole('dialog', { name: M.reviewHeading })
}

describe('Cook review — accessibility (WCAG 2.1 AA, SC-008 / FR-030)', () => {
  it('the populated queue and rows have no AA violations', async () => {
    populated()
    const { container } = renderAtCooks(fm)
    await screen.findByText('مطبخ موقّع')
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the review screen has no AA violations', async () => {
    populated()
    const user = userEvent.setup()
    renderAtCooks(fm)
    await openReview(user)
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()
  })

  it('the empty state has no AA violations', async () => {
    fm.reply('GET /admin/cooks/pending', { json: ok([]) })
    const { container } = renderAtCooks(fm)
    await screen.findByText(M.empty)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the error state has no AA violations', async () => {
    fm.reply('GET /admin/cooks/pending', { status: 500, json: fail('boom') })
    const { container } = renderAtCooks(fm)
    await screen.findByText(M.queueError)
    expect(await axe(container, AXE_WCAG)).toHaveNoViolations()
  })

  it('the image document viewer has no AA violations and is keyboard-operable', async () => {
    const user = userEvent.setup()
    populated()
    renderAtCooks(fm)

    const overlay = await openReview(user)
    const tile = within(overlay).getByRole('button', { name: M.docIdFront })
    await user.click(tile)
    await screen.findByRole('dialog', { name: M.docIdFront })
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()

    // keyboard: next document, zoom, close
    await user.keyboard('{ArrowLeft}')
    expect(await screen.findByRole('dialog', { name: M.docIdBack })).toBeInTheDocument()
    await user.keyboard('+')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: M.docIdBack })).toBeNull())
    expect(tile).toHaveFocus()
  })

  it('the contract viewer has no AA violations', async () => {
    const user = userEvent.setup()
    populated()
    renderAtCooks(fm)

    const overlay = await openReview(user)
    await user.click(within(overlay).getByRole('button', { name: M.openContract }))
    const dialog = await screen.findByRole('dialog', { name: M.docContract })
    // Drop the <iframe> before auditing: jsdom cannot host a real cross-frame
    // context for axe, and the contract PDF's own contents are outside this
    // app's accessibility scope. The viewer chrome (heading, controls, the
    // new-tab fallback link) is what we assert here.
    dialog.querySelectorAll('iframe').forEach((f) => f.remove())
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()
    expect(screen.getByRole('link', { name: M.openInNewTab })).toBeInTheDocument()
  })

  it('the approve dialog has no AA violations and restores focus on close', async () => {
    const user = userEvent.setup()
    populated()
    renderAtCooks(fm)

    const overlay = await openReview(user)
    const approve = within(overlay).getByRole('button', { name: M.approve })
    await user.click(approve)
    await screen.findByRole('dialog', { name: M.approveTitle('مطبخ موقّع') })
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()

    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: M.approveTitle('مطبخ موقّع') })).toBeNull(),
    )
    expect(approve).toHaveFocus()
  })

  it('the reject dialog has no AA violations; the textarea is labelled and the counter is described', async () => {
    const user = userEvent.setup()
    populated()
    renderAtCooks(fm)

    const overlay = await openReview(user)
    await user.click(within(overlay).getByRole('button', { name: M.reject }))
    await screen.findByRole('dialog', { name: M.rejectTitle('مطبخ موقّع') })

    const textarea = screen.getByLabelText(M.rejectReasonLabel)
    expect(textarea).toHaveAttribute('aria-describedby', expect.stringContaining('reject-counter'))
    expect(screen.getByText(M.rejectReasonRequired)).toBeInTheDocument()
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()
  })
})
