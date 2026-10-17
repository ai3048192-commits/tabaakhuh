import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtUsers } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, adminUserRow, usersPage } from '../helpers/fixtures'
import { userMessages as M } from '../../src/users/messages'

const saved = vi.hoisted(() => ({ xlsx: vi.fn(), blob: vi.fn() }))
vi.mock('../../src/users/accountsExport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/users/accountsExport')>()),
  saveAccountsXlsx: saved.xlsx,
  saveBlob: saved.blob,
}))

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /admin/users?page=1', { json: usersPage([adminUserRow({ id: 1 })], { total: 1 }) })
  saved.xlsx.mockReset().mockResolvedValue(undefined)
  saved.blob.mockReset()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const row = { id: 9, first_name: 'سوسن', role: 'cook', store_name: 'مطبخ سوسن' }

describe('All-accounts export', () => {
  it('builds the Excel file from every account the API returns', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/users/export', { json: ok({ items: [row], generated_at: '2026-10-17T09:00:00Z' }) })
    renderAtUsers(fm)
    await screen.findByText('مستخدم 1')

    await user.click(screen.getByRole('button', { name: M.exportExcel }))

    await waitFor(() => expect(saved.xlsx).toHaveBeenCalledWith([row]))
    expect(screen.getByRole('button', { name: M.exportExcel })).toBeEnabled()
  })

  it('saves the server-rendered PDF', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/users/export/pdf', { json: '%PDF-' })
    renderAtUsers(fm)
    await screen.findByText('مستخدم 1')

    await user.click(screen.getByRole('button', { name: M.exportPdf }))

    await waitFor(() => expect(saved.blob).toHaveBeenCalledTimes(1))
    expect(fm.lastCall('GET /admin/users/export/pdf')?.authorization).toBe('Bearer tok-admin')
    expect(saved.blob.mock.calls[0][1]).toMatch(/^tabbakha-accounts-\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  it('says so when the export fails', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/users/export/pdf', { status: 500, json: fail('boom') })
    renderAtUsers(fm)
    await screen.findByText('مستخدم 1')

    await user.click(screen.getByRole('button', { name: M.exportPdf }))

    expect((await screen.findAllByText(M.exportFailed)).length).toBeGreaterThan(0)
    expect(saved.blob).not.toHaveBeenCalled()
  })

  it('is only on the all-accounts screen', async () => {
    fm.reply('GET /admin/users?role=cook&approval=approved&page=1', { json: usersPage([adminUserRow({ id: 1, role: 'cook' })], { total: 1 }) })
    renderAtUsers(fm, { scope: 'cook' })
    await screen.findByText('مستخدم 1')

    expect(screen.queryByRole('button', { name: M.exportExcel })).not.toBeInTheDocument()
  })
})
