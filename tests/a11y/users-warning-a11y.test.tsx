import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { renderAtUsers } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { adminUserRow, usersPage } from '../helpers/fixtures'
import { warningMessages as WM } from '../../src/warnings/messages'

const AXE_WCAG = {
  runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
} as const

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Issue-warning dialog — accessibility', () => {
  it('the open dialog, including its validation errors, has no AA violations', async () => {
    const user = userEvent.setup()
    fm.reply('GET /admin/users?page=1', {
      json: usersPage([adminUserRow({ id: 11, first_name: 'سارة', last_name: 'أحمد', role: 'cook' })], { total: 1 }),
    })
    renderAtUsers(fm)
    await screen.findByText('سارة أحمد')

    await user.click(screen.getByRole('button', { name: `${WM.issue}: سارة أحمد` }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(WM.violationLabel)).toHaveFocus()
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()

    await user.click(within(dialog).getByRole('button', { name: WM.generate }))
    const select = within(dialog).getByLabelText(WM.violationLabel)
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAccessibleDescription(WM.violationRequired)
    expect(await axe(document.body, AXE_WCAG)).toHaveNoViolations()
  })
})
