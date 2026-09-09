import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderAtSettings } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, settingsResponse } from '../helpers/fixtures'
import { settingsMessages as M } from '../../src/settings/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Settings — rich multi-card layout', () => {
  it('shows the four section cards plus the live-scope note', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    fm.reply('GET /admin/cities', {
      json: ok([
        { id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true },
        { id: 2, name_ar: 'الجيزة', name_en: 'Giza', is_active: true },
      ]),
    })
    renderAtSettings(fm)

    await screen.findByLabelText(M.feeFieldLabel)
    expect(screen.getByText(M.liveNote)).toBeInTheDocument()
    for (const t of [M.cardFinanceTitle, M.cardCitiesTitle, M.cardStoreTitle, M.cardNotifTitle]) {
      expect(screen.getByRole('heading', { name: t })).toBeInTheDocument()
    }
    // GET /admin/settings is fetched exactly once and shared by both hooks
    expect(fm.count('GET /admin/settings')).toBe(1)
  })

  it('the cities card lists the real cities and links to /cities', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    fm.reply('GET /admin/cities', {
      json: ok([{ id: 1, name_ar: 'القاهرة', name_en: 'Cairo', is_active: true }]),
    })
    renderAtSettings(fm)

    const citiesCard = (await screen.findByRole('heading', { name: M.cardCitiesTitle })).closest('section')!
    expect(await within(citiesCard).findByText('القاهرة')).toBeInTheDocument()
    expect(within(citiesCard).getByRole('link', { name: M.manageCities })).toHaveAttribute('href', '/cities')
  })

  it('the store-info and notification fields are rendered and editable', async () => {
    fm.reply('GET /admin/settings', { json: settingsResponse(25) })
    fm.reply('GET /admin/cities', { json: ok([]) })
    renderAtSettings(fm)

    expect(await screen.findByLabelText(M.storeNameLabel)).toBeEnabled()
    expect(screen.getByLabelText(M.supportEmailLabel)).toBeEnabled()
    expect(screen.getByLabelText(M.notifPushLabel)).toBeEnabled()
    expect(screen.getByLabelText(M.commissionLabel)).toBeEnabled()
    expect(screen.getByLabelText(M.feeFieldLabel)).toBeEnabled()
    // the shared system-settings save starts disabled (nothing dirty)
    expect(screen.getByRole('button', { name: M.saveSettings })).toBeDisabled()
  })
})
