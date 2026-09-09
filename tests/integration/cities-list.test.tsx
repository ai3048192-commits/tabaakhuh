import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtCities } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, city } from '../helpers/fixtures'
import { cityMessages as M } from '../../src/cities/messages'
import type { City } from '../../src/cities/types'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const seed: City[] = [
  city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true }),
  city({ id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: false }),
  city({ id: 3, name_ar: 'الإسكندرية', name_en: 'Alexandria', is_active: true }),
]

describe('US1 — view the cities list and search', () => {
  it('AC1: lists every city (active and inactive) with all three columns and no pagination', async () => {
    fm.reply('GET /admin/cities', { json: ok(seed) })
    renderAtCities(fm)

    await screen.findByText('القاهرة')
    expect(screen.getByText('الجيزة')).toBeInTheDocument() // inactive city is listed
    expect(screen.getByText('Alexandria')).toBeInTheDocument()

    const rows = screen.getAllByRole('row').slice(1) // drop the header row
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByText(M.statusActive)).toBeInTheDocument()
    expect(within(rows[1]).getByText(M.statusInactive)).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /التالي|السابق|صفحة/ })).toBeNull()
    expect(screen.getByText(M.subtitle(3))).toBeInTheDocument()
  })

  it('AC2/AC3: a slow load shows loading; an empty list shows the "no cities" state with Add', async () => {
    fm.reply('GET /admin/cities', { delayMs: 25, json: ok([]) })
    renderAtCities(fm)

    expect(await screen.findByText(M.loading)).toBeInTheDocument()
    expect(await screen.findByText(M.emptyNoCities)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: new RegExp(M.addCity) })).toBeInTheDocument()
  })

  it('AC4: refresh re-fetches and reflects added / toggled cities, keeping the search term', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cities',
      { json: ok([city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo' })]) },
      {
        json: ok([
          city({ id: 1, name_ar: 'القاهرة', name_en: 'Cairo' }),
          city({ id: 2, name_ar: 'الجيزة', name_en: 'Giza' }),
        ]),
      },
    )
    renderAtCities(fm)

    await screen.findByText('القاهرة')
    await user.type(screen.getByLabelText(M.searchLabel), 'ة')
    await user.click(screen.getByRole('button', { name: M.refresh }))

    await screen.findByText('الجيزة')
    expect(fm.count('GET /admin/cities')).toBe(2)
    expect(screen.getByLabelText(M.searchLabel)).toHaveValue('ة')
  })

  it('AC5: a failed first load shows a screen error with a working retry', async () => {
    const user = userEvent.setup()
    fm.reply(
      'GET /admin/cities',
      { status: 500, json: fail('Something went wrong. Please try again.') },
      { json: ok(seed) },
    )
    renderAtCities(fm)

    expect(await screen.findByText(M.listError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.retry }))
    expect(await screen.findByText('القاهرة')).toBeInTheDocument()
  })

  it('AC6: typing in the search narrows by Arabic or English name with no network call', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(seed) })
    renderAtCities(fm)

    await screen.findByText('القاهرة')
    const box = screen.getByLabelText(M.searchLabel)

    await user.type(box, 'Alex') // English match
    await waitFor(() => expect(screen.queryByText('القاهرة')).toBeNull())
    expect(screen.getByText('الإسكندرية')).toBeInTheDocument()

    await user.clear(box)
    await user.type(box, 'جيز') // Arabic match
    await waitFor(() => expect(screen.queryByText('الإسكندرية')).toBeNull())
    expect(screen.getByText('الجيزة')).toBeInTheDocument()

    await user.clear(box)
    expect(await screen.findByText('القاهرة')).toBeInTheDocument()
    expect(fm.count('GET /admin/cities')).toBe(1) // never re-fetched
  })

  it('AC7: a term matching nothing shows the "no match" state, distinct from "no cities"', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/cities', { json: ok(seed) })
    renderAtCities(fm)

    await screen.findByText('القاهرة')
    await user.type(screen.getByLabelText(M.searchLabel), 'zzzzz')

    expect(await screen.findByText(M.emptyNoMatch)).toBeInTheDocument()
    expect(screen.queryByText(M.emptyNoCities)).toBeNull()
    expect(screen.queryByText(M.colNameAr)).toBeNull() // table not rendered
    expect(screen.getByLabelText(M.searchLabel)).toHaveValue('zzzzz')
  })
})
