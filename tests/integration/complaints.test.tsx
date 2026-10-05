import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtComplaints } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, complaint, complaintDetail, complaintSender, complaintsPage } from '../helpers/fixtures'
import { complaintMessages as M } from '../../src/complaints/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const SENDERS = 'GET /admin/complaints/senders?page=1'
const OF_55 = 'GET /admin/complaints?user_id=55&page=1'

/** Render the senders list and open أم أحمد's panel. */
async function openSender55(user: ReturnType<typeof userEvent.setup>) {
  renderAtComplaints(fm)
  await screen.findByText('أم أحمد')
  await user.click(screen.getByRole('button', { name: `${M.viewMessages} — أم أحمد` }))
  return screen.findByRole('dialog')
}

describe('Complaints & Suggestions — grouped by sender', () => {
  it('lists senders with their role and counts, and filters by type + status + role', async () => {
    const user = userEvent.setup()
    fm.reply(SENDERS, { json: complaintsPage([complaintSender({ total: 3, open_count: 2 })]) })
    fm.reply('GET /admin/complaints/senders?type=suggestion&status=open&role=cook&page=1', {
      json: complaintsPage([complaintSender({ user_id: 77, name: 'سعاد' })]),
    })
    renderAtComplaints(fm)

    const card = (await screen.findByText('أم أحمد')).closest('li')!
    expect(within(card).getByText(M.roleLabels.cook)).toBeInTheDocument()
    expect(within(card).getByText(M.messagesCount(3))).toBeInTheDocument()
    expect(within(card).getByText(M.openCount(2))).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(M.filterType), 'suggestion')
    await user.selectOptions(screen.getByLabelText(M.filterStatus), 'open')
    await user.selectOptions(screen.getByLabelText(M.filterRole), 'cook')
    await screen.findByText('سعاد')
    expect(fm.count('GET /admin/complaints/senders?type=suggestion&status=open&role=cook&page=1')).toBe(1)
  })

  it("opening a sender lists all their messages; expanding one shows the thread and a reply POSTs", async () => {
    const user = userEvent.setup()
    fm.reply(SENDERS, { json: complaintsPage([complaintSender()]) })
    fm.reply(OF_55, {
      json: complaintsPage([
        complaint({ id: 700, body: 'الطلب اتأخر' }),
        complaint({ id: 701, type: 'suggestion', body: 'زودوا أصناف' }),
      ]),
    })
    fm.reply('GET /admin/complaints/700', {
      json: ok(complaintDetail({ id: 700, body: 'الطلب اتأخر', thread: [] })),
    })
    fm.reply('POST /admin/complaints/700/reply', {
      json: ok(complaintDetail({
        id: 700,
        thread: [{ id: 1, author: 'admin', body: 'نعتذر', created_at: '2026-09-02T09:00:00+00:00' }],
      })),
    })

    const drawer = await openSender55(user)
    expect(await within(drawer).findByText('الطلب اتأخر')).toBeInTheDocument()
    expect(within(drawer).getByText('زودوا أصناف')).toBeInTheDocument()

    await user.click(within(drawer).getByRole('button', { name: `${M.expand} #700` }))
    await user.type(await within(drawer).findByLabelText(M.replyLabel), 'نعتذر')
    await user.click(within(drawer).getByRole('button', { name: M.send }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.replySentToast))
    expect(fm.lastCall('POST /admin/complaints/700/reply')?.body).toEqual({ body: 'نعتذر' })
    await within(drawer).findByText('نعتذر')
    expect(fm.count(SENDERS)).toBe(2)
  })

  it('mark-resolved PATCHes the status', async () => {
    const user = userEvent.setup()
    fm.reply(SENDERS, { json: complaintsPage([complaintSender()]) })
    fm.reply(OF_55, { json: complaintsPage([complaint({ id: 700, status: 'open' })]) })
    fm.reply('GET /admin/complaints/700', { json: ok(complaintDetail({ id: 700, status: 'open', thread: [] })) })
    fm.reply('PATCH /admin/complaints/700/status', {
      json: ok(complaintDetail({ id: 700, status: 'resolved', thread: [] })),
    })

    const drawer = await openSender55(user)
    await user.click(await within(drawer).findByRole('button', { name: `${M.expand} #700` }))
    await user.click(await within(drawer).findByRole('button', { name: M.markResolved }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.statusDoneToast))
    expect(fm.lastCall('PATCH /admin/complaints/700/status')?.body).toEqual({ status: 'resolved' })
  })

  it('delete asks to confirm, then DELETEs and drops the message from the panel', async () => {
    const user = userEvent.setup()
    fm.reply(SENDERS, { json: complaintsPage([complaintSender()]) })
    fm.reply(OF_55, {
      json: complaintsPage([complaint({ id: 700, body: 'رسالة هتتمسح' }), complaint({ id: 701, body: 'تفضل' })]),
    })
    fm.reply('GET /admin/complaints/700', { json: ok(complaintDetail({ id: 700, thread: [] })) })
    fm.reply('DELETE /admin/complaints/700', { json: ok(null) })

    const drawer = await openSender55(user)
    await user.click(await within(drawer).findByRole('button', { name: `${M.expand} #700` }))
    await user.click(await within(drawer).findByRole('button', { name: M.remove }))
    expect(fm.count('DELETE /admin/complaints/700')).toBe(0)

    await user.click(within(drawer).getByRole('button', { name: M.confirmRemoveYes }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.removedToast))
    expect(fm.count('DELETE /admin/complaints/700')).toBe(1)
    expect(within(drawer).queryByText('رسالة هتتمسح')).not.toBeInTheDocument()
    expect(within(drawer).getByText('تفضل')).toBeInTheDocument()
  })

  it('an offline first load shows a screen error + Retry', async () => {
    const user = userEvent.setup()
    fm.reply(SENDERS, { networkError: true }, { json: complaintsPage([complaintSender()]) })
    renderAtComplaints(fm)
    expect(await screen.findByText(M.listError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.retry }))
    expect(await screen.findByText('أم أحمد')).toBeInTheDocument()
  })

  it('a non-admin never reaches /complaints', async () => {
    fm.reply(SENDERS, { status: 401, json: fail('Unauthenticated.') })
    renderAtComplaints(fm, { admin: false })
    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })
})
