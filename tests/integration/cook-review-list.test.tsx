import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
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

const early = '2026-09-01T09:00:00+00:00'
const late = '2026-09-04T09:00:00+00:00'

/** Open the review screen for the row whose heading is `storeName`. */
async function openReviewFor(user: ReturnType<typeof userEvent.setup>, storeName: string) {
  const article = (await screen.findByText(storeName)).closest('article') as HTMLElement
  await user.click(within(article).getByRole('button', { name: M.review }))
  return screen.findByRole('dialog', { name: M.reviewHeading })
}

describe('US1 — review the pending cook queue', () => {
  it('AC1: lists pending applications oldest-first with a count', async () => {
    fm.reply(
      'GET /admin/cooks/pending',
      {
        json: ok([
          pendingCook({ id: 1, store_name: 'متأخر' }, { signed_at: late }),
          pendingCook({ id: 2, store_name: 'بدون عقد' }, null),
          pendingCook({ id: 3, store_name: 'مبكر' }, { signed_at: early }),
        ]),
      },
    )
    renderAtCooks(fm)

    await screen.findByText('مبكر')
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['مبكر', 'متأخر', 'بدون عقد'])
    expect(screen.getByText(M.awaitingCount(3))).toBeInTheDocument()
  })

  it('AC2: shows submitted details, a resolved city name, and a raw-id fallback', async () => {
    fm.reply('GET /admin/cooks/pending', {
      json: ok([
        pendingCook(
          { id: 1, store_name: 'معروفة', city_id: 1, area: 'حي السلام', address_text: 'شارع 12' },
          null,
        ),
        pendingCook({ id: 2, store_name: 'مجهولة', city_id: 999 }, null),
      ]),
    })
    renderAtCooks(fm)

    await screen.findByText('معروفة')
    const cards = screen.getAllByRole('article')
    // city_id 1 → resolved name from the directory
    expect(within(cards[0]).getByText('القاهرة')).toBeInTheDocument()
    expect(within(cards[0]).getByText('حي السلام')).toBeInTheDocument()
    expect(within(cards[0]).getByText('شارع 12')).toBeInTheDocument()
    expect(within(cards[0]).getByText(M.radiusKm(5))).toBeInTheDocument()
    // city_id 999 is absent from the directory → raw id shown
    expect(within(cards[1]).getByText('999')).toBeInTheDocument()
  })

  it('AC3: opens a verification document in an in-dashboard viewer with keyboard nav', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cooks/pending', {
      json: ok([pendingCook({ id: 1, store_name: 'مطبخ' }, null)]),
    })
    renderAtCooks(fm)

    await openReviewFor(user, 'مطبخ')
    const tile = screen.getByRole('button', { name: M.docIdFront })
    await user.click(tile)

    const dialog = await screen.findByRole('dialog', { name: M.docIdFront })
    expect(dialog).toHaveAttribute('aria-label', M.docIdFront)

    // Counter is one LTR text node so the RTL dialog can't swap the numbers.
    const counter = within(dialog).getByText('1 / 4')
    expect(counter).toHaveAttribute('dir', 'ltr')

    await user.keyboard('{ArrowLeft}') // RTL: visual next
    expect(await screen.findByRole('dialog', { name: M.docIdBack })).toBeInTheDocument()
    expect(within(dialog).getByText('2 / 4')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: M.docIdBack })).toBeNull())
    expect(tile).toHaveFocus()
  })

  it('FR-005: a null document URL renders an "unavailable" tile; the application is still actionable', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cooks/pending', {
      json: ok([
        pendingCook({ id: 1, store_name: 'مطبخ', avatar_url: null }, null),
      ]),
    })
    renderAtCooks(fm)

    await openReviewFor(user, 'مطبخ')
    const avatarTile = screen.getByRole('button', { name: M.docAvatar })
    expect(within(avatarTile).getByText(M.docUnavailable)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: M.approve })).toBeEnabled()
  })

  it('AC4/AC5: contract version + date and open action; "not signed" when absent', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cooks/pending', {
      json: ok([
        pendingCook({ id: 1, store_name: 'موقّعة' }, { template_version: 'v1', signed_at: early }),
        pendingCook({ id: 2, store_name: 'غير موقّعة' }, null),
      ]),
    })
    renderAtCooks(fm)

    // The signed application: contract line + open action on the review screen.
    const signed = await openReviewFor(user, 'موقّعة')
    expect(within(signed).getByText(/v1/)).toBeInTheDocument()
    await user.click(within(signed).getByRole('button', { name: M.openContract }))
    const viewer = await screen.findByRole('dialog', { name: M.docContract })
    expect(within(viewer).getByTitle(M.docContract)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: M.docContract })).toBeNull())
    await user.click(within(signed).getByRole('button', { name: M.closeReview }))

    // The unsigned application: the "not signed" note.
    const unsigned = await openReviewFor(user, 'غير موقّعة')
    expect(within(unsigned).getByText(M.noContractSigned)).toBeInTheDocument()
  })

  it('AC6: an empty queue shows the empty state, not a blank area', async () => {
    fm.reply('GET /admin/cooks/pending', { json: ok([]) })
    renderAtCooks(fm)

    expect(await screen.findByText(M.empty)).toBeInTheDocument()
    expect(screen.getByText(M.awaitingCount(0))).toBeInTheDocument()
  })

  it('AC7: refresh re-fetches and reflects decided/added entries', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cooks/pending',
      { json: ok([pendingCook({ id: 1, store_name: 'أول' }, null), pendingCook({ id: 2, store_name: 'ثانٍ' }, null)]) },
      { json: ok([pendingCook({ id: 2, store_name: 'ثانٍ' }, null)]) },
    )
    renderAtCooks(fm)

    await screen.findByText('أول')
    await user.click(screen.getByRole('button', { name: M.refresh }))

    await waitFor(() => expect(screen.queryByText('أول')).toBeNull())
    expect(screen.getByText('ثانٍ')).toBeInTheDocument()
    expect(fm.count('GET /admin/cooks/pending')).toBe(2)
  })

  it('FR-011a / SC-006a: renders a ~200-entry queue as one plain list, no pagination', async () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      pendingCook({ id: i + 1, store_name: `مطبخ ${i + 1}` }, null),
    )
    fm.reply('GET /admin/cooks/pending', { json: ok(many) })
    const started = performance.now()
    renderAtCooks(fm)

    await screen.findByText('مطبخ 1')
    expect(screen.getAllByRole('article')).toHaveLength(200)
    expect(screen.getByText(M.awaitingCount(200))).toBeInTheDocument()
    // no pagination affordance — the whole set is present
    expect(screen.queryByRole('button', { name: /التالي|الصفحة/ })).toBeNull()
    expect(performance.now() - started).toBeLessThan(5000)
  })

  it('FR-029: a failed initial load shows a screen error with a working retry', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cooks/pending',
      { status: 500, json: fail('Something went wrong. Please try again.') },
      { json: ok([pendingCook({ id: 1, store_name: 'بعد النجاح' }, null)]) },
    )
    renderAtCooks(fm)

    expect(await screen.findByText(M.queueError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.retry }))
    expect(await screen.findByText('بعد النجاح')).toBeInTheDocument()
  })
})
