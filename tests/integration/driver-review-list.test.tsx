import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const early = '2026-09-01T09:00:00+00:00'
const mid = '2026-09-03T09:00:00+00:00'
const late = '2026-09-05T09:00:00+00:00'

describe('US1 — review the pending driver queue', () => {
  it('AC1: lists pending applications oldest-first by submitted_at with a count', async () => {
    fm.reply('GET /admin/drivers/pending', {
      json: ok([
        pendingDriver({ id: 1, submitted_at: late }),
        pendingDriver({ id: 2, submitted_at: early }),
        pendingDriver({ id: 3, submitted_at: mid }),
      ]),
    })
    renderAtDrivers(fm)

    await screen.findByText(M.driverLabel(2))
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual([M.driverLabel(2), M.driverLabel(3), M.driverLabel(1)])
    expect(screen.getByText(M.awaitingCount(3))).toBeInTheDocument()
  })

  it('SC-010: entries with equal submitted_at order by id and are stable across loads', async () => {
    const user = userEvent.setup()
    const ts = '2026-09-02T09:00:00+00:00'
    fm.reply('GET /admin/drivers/pending', {
      json: ok([
        pendingDriver({ id: 30, submitted_at: ts }),
        pendingDriver({ id: 3, submitted_at: ts }),
        pendingDriver({ id: 12, submitted_at: ts }),
      ]),
    })
    renderAtDrivers(fm)

    await screen.findByText(M.driverLabel(3))
    const order = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(order()).toEqual([M.driverLabel(3), M.driverLabel(12), M.driverLabel(30)])

    await user.click(screen.getByRole('button', { name: M.refresh }))
    await waitFor(() => expect(fm.count('GET /admin/drivers/pending')).toBe(2))
    expect(order()).toEqual([M.driverLabel(3), M.driverLabel(12), M.driverLabel(30)])
  })

  it('AC2: shows identity/vehicle details, a resolved city name, and a raw-id fallback', async () => {
    fm.reply('GET /admin/drivers/pending', {
      json: ok([
        pendingDriver({ id: 1, city_id: 1, vehicle_model: 'Halawa', vehicle_color: 'أحمر' }),
        pendingDriver({ id: 2, city_id: 999 }),
      ]),
    })
    renderAtDrivers(fm)

    await screen.findByText(M.driverLabel(1))
    const cards = screen.getAllByRole('article')
    expect(within(cards[0]).getByText('القاهرة')).toBeInTheDocument() // city_id 1 resolved
    expect(within(cards[0]).getByText(/Halawa/)).toBeInTheDocument()
    expect(within(cards[0]).getByText(/أحمر/)).toBeInTheDocument()
    expect(within(cards[1]).getByText('999')).toBeInTheDocument() // unknown city → raw id
  })

  it('FR-003b: a missing vehicle field renders a placeholder; the application stays actionable', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/drivers/pending', {
      json: ok([pendingDriver({ id: 1, vehicle_plate_letters: '' })]),
    })
    renderAtDrivers(fm)

    await screen.findByText(M.driverLabel(1))
    const card = screen.getByRole('article')
    expect(within(card).getByText(M.plateLine(String(1001), M.placeholder))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: M.review }))
    await screen.findByRole('dialog', { name: M.reviewHeading })
    expect(screen.getByRole('button', { name: M.approve })).toBeEnabled()
  })

  it('FR-003c: birth_date is shown as a date only, with no age text', async () => {
    fm.reply('GET /admin/drivers/pending', {
      json: ok([pendingDriver({ id: 1, birth_date: '1995-04-10' })]),
    })
    renderAtDrivers(fm)

    await screen.findByText(M.driverLabel(1))
    const card = screen.getByRole('article')
    expect(within(card).getByText(M.fieldBirthDate)).toBeInTheDocument()
    expect(within(card).queryByText(/عام|سنة|age/i)).toBeNull()
  })

  it('AC3: opens a verification image in an in-dashboard viewer with keyboard nav across 3 docs', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/drivers/pending', { json: ok([pendingDriver({ id: 1 })]) })
    renderAtDrivers(fm)

    await screen.findByText(M.driverLabel(1))
    await user.click(screen.getByRole('button', { name: M.review }))
    await screen.findByRole('dialog', { name: M.reviewHeading })
    const tile = screen.getByRole('button', { name: M.docIdFront })
    await user.click(tile)

    const dialog = await screen.findByRole('dialog', { name: M.docIdFront })
    expect(dialog).toHaveAttribute('aria-label', M.docIdFront)

    await user.keyboard('{ArrowLeft}') // RTL: visual next
    expect(await screen.findByRole('dialog', { name: M.docIdBack })).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(await screen.findByRole('dialog', { name: M.docLicense })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: M.docLicense })).toBeNull())
    expect(tile).toHaveFocus()
  })

  it('FR-005: a null license_url renders an "unavailable" tile; the application is still actionable', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/drivers/pending', {
      json: ok([pendingDriver({ id: 1, license_url: null })]),
    })
    renderAtDrivers(fm)

    await screen.findByText(M.driverLabel(1))
    await user.click(screen.getByRole('button', { name: M.review }))
    await screen.findByRole('dialog', { name: M.reviewHeading })
    const tile = screen.getByRole('button', { name: M.docLicense })
    expect(within(tile).getByText(M.docUnavailable)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: M.approve })).toBeEnabled()
  })

  it('AC4: an empty queue shows the empty state, not a blank area', async () => {
    fm.reply('GET /admin/drivers/pending', { json: ok([]) })
    renderAtDrivers(fm)

    expect(await screen.findByText(M.empty)).toBeInTheDocument()
    expect(screen.getByText(M.awaitingCount(0))).toBeInTheDocument()
  })

  it('FR-008: a slow load shows the loading state, distinct from empty', async () => {
    fm.reply('GET /admin/drivers/pending', { delayMs: 30, json: ok([]) })
    renderAtDrivers(fm)

    expect(await screen.findByText(M.loading)).toBeInTheDocument()
    expect(await screen.findByText(M.empty)).toBeInTheDocument()
  })

  it('AC5: refresh re-fetches and reflects decided/added entries', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/drivers/pending',
      { json: ok([pendingDriver({ id: 1 }), pendingDriver({ id: 2 })]) },
      { json: ok([pendingDriver({ id: 2 })]) },
    )
    renderAtDrivers(fm)

    await screen.findByText(M.driverLabel(1))
    await user.click(screen.getByRole('button', { name: M.refresh }))

    await waitFor(() => expect(screen.queryByText(M.driverLabel(1))).toBeNull())
    expect(screen.getByText(M.driverLabel(2))).toBeInTheDocument()
    expect(fm.count('GET /admin/drivers/pending')).toBe(2)
  })

  it('FR-011: renders a ~200-entry queue as one plain list, no pagination', async () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      pendingDriver({ id: i + 1, submitted_at: `2026-09-01T00:${String(i % 60).padStart(2, '0')}:00+00:00` }),
    )
    fm.reply('GET /admin/drivers/pending', { json: ok(many) })
    const started = performance.now()
    renderAtDrivers(fm)

    await screen.findByText(M.driverLabel(1))
    expect(screen.getAllByRole('article')).toHaveLength(200)
    expect(screen.getByText(M.awaitingCount(200))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /التالي|الصفحة/ })).toBeNull()
    expect(performance.now() - started).toBeLessThan(5000)
  })

  it('FR-032: a failed initial load shows a screen error with a working retry', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/drivers/pending',
      { status: 500, json: fail('Something went wrong. Please try again.') },
      { json: ok([pendingDriver({ id: 1 })]) },
    )
    renderAtDrivers(fm)

    expect(await screen.findByText(M.queueError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.retry }))
    expect(await screen.findByText(M.driverLabel(1))).toBeInTheDocument()
  })
})
