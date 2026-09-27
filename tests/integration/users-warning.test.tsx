import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtUsers } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { adminUserRow, usersPage } from '../helpers/fixtures'
import { warningMessages as WM } from '../../src/warnings/messages'
import { ROLE_POLICIES } from '../../src/warnings/policies'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

const LIST_P1 = 'GET /admin/users?page=1'

/** A stand-in for the letter window: records what was written and whether it printed. */
function fakeLetterWindow() {
  const written: string[] = []
  const doc = {
    title: '',
    open: vi.fn(),
    write: (h: string) => written.push(h),
    close: vi.fn(),
    getElementById: () => null,
    fonts: { ready: Promise.resolve() },
  }
  const win = {
    document: doc,
    focus: vi.fn(),
    print: vi.fn(),
    addEventListener: (ev: string, cb: () => void) => {
      if (ev === 'load') cb()
    },
  }
  return { win, doc, written }
}

function seed() {
  fm.reply(LIST_P1, {
    json: usersPage(
      [
        adminUserRow({ id: 11, first_name: 'سارة', last_name: 'أحمد', role: 'cook' }),
        adminUserRow({ id: 12, first_name: 'محمود', last_name: 'علي', role: 'driver', status: 'suspended' }),
        adminUserRow({ id: 13, first_name: 'منى', last_name: 'سعيد', role: 'customer' }),
      ],
      { total: 3 },
    ),
  })
}

const row = (name: string) => screen.getByText(name).closest('tr')!
const warnBtn = (name: string) =>
  within(row(name)).queryByRole('button', { name: `${WM.issue}: ${name}` })

describe('Users — issue a warning letter', () => {
  it('offers the warning button to cooks and drivers only, whatever their status', async () => {
    seed()
    renderAtUsers(fm)
    await screen.findByText('سارة أحمد')

    expect(warnBtn('سارة أحمد')).toBeInTheDocument()
    expect(warnBtn('محمود علي')).toBeInTheDocument()
    expect(warnBtn('منى سعيد')).toBeNull()
  })

  it('will not issue without a violation, and "other" needs details', async () => {
    const user = userEvent.setup()
    const open = vi.spyOn(window, 'open')
    seed()
    renderAtUsers(fm)
    await screen.findByText('سارة أحمد')

    await user.click(warnBtn('سارة أحمد')!)
    const dialog = screen.getByRole('dialog', { name: WM.dialogTitle('سارة أحمد') })
    await user.click(within(dialog).getByRole('button', { name: WM.generate }))
    expect(within(dialog).getByText(WM.violationRequired)).toBeInTheDocument()

    await user.selectOptions(within(dialog).getByLabelText(WM.violationLabel), 'other')
    await user.click(within(dialog).getByRole('button', { name: WM.generate }))
    expect(within(dialog).getByText(WM.detailsRequired)).toBeInTheDocument()
    expect(open).not.toHaveBeenCalled()
  })

  it('writes a letter named after the person, opens the print dialog, and confirms', async () => {
    const user = userEvent.setup()
    const letter = fakeLetterWindow()
    vi.spyOn(window, 'open').mockReturnValue(letter.win as unknown as Window)
    seed()
    renderAtUsers(fm)
    await screen.findByText('محمود علي')

    await user.click(warnBtn('محمود علي')!)
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('radio', { name: 'إنذار نهائي' }))
    await user.selectOptions(within(dialog).getByLabelText(WM.violationLabel), 'late_delivery')
    await user.type(within(dialog).getByLabelText(/تفاصيل المخالفة/), 'طلب 5521')
    await user.click(within(dialog).getByRole('button', { name: WM.generate }))

    const html = letter.written.join('')
    expect(letter.doc.title).toMatch(/^إنذار نهائي - محمود علي - \d{4}-\d{2}-\d{2}$/)
    expect(html).toContain('محمود علي')
    expect(html).toContain('التأخير في توصيل الطلبات')
    expect(html).toContain('طلب 5521')
    expect(html).toContain(ROLE_POLICIES.driver[0])
    expect(html).toContain('Site Admin') // the issuing admin signs it
    await waitFor(() => expect(letter.win.print).toHaveBeenCalledOnce())

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findAllByText(WM.issuedToast('محمود علي'))).not.toHaveLength(0)
  })

  it('keeps the dialog open and explains when the popup is blocked', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'open').mockReturnValue(null)
    seed()
    renderAtUsers(fm)
    await screen.findByText('سارة أحمد')

    await user.click(warnBtn('سارة أحمد')!)
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText(WM.violationLabel), 'hygiene')
    await user.click(within(dialog).getByRole('button', { name: WM.generate }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await screen.findAllByText(WM.popupBlocked)).not.toHaveLength(0)
  })
})
