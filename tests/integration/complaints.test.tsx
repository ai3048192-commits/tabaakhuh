import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtComplaints } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, fail, complaint, complaintDetail, complaintsPage } from '../helpers/fixtures'
import { complaintMessages as M } from '../../src/complaints/messages'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const LIST = 'GET /admin/complaints?page=1'

describe('Complaints & Suggestions (provisional /admin/complaints*)', () => {
  it('loads the list and filters by type + status into the query', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: complaintsPage([complaint({ id: 700, subject: 'تأخير' })], { total: 4 }) })
    fm.reply('GET /admin/complaints?type=suggestion&status=open&page=1', {
      json: complaintsPage([complaint({ id: 701, type: 'suggestion', subject: 'فكرة' })], { total: 1 }),
    })
    renderAtComplaints(fm)
    await screen.findByText('تأخير')

    await user.selectOptions(screen.getByLabelText(M.filterType), 'suggestion')
    await user.selectOptions(screen.getByLabelText(M.filterStatus), 'open')
    await screen.findByText('فكرة')
    expect(fm.count('GET /admin/complaints?type=suggestion&status=open&page=1')).toBe(1)
  })

  it('opening a row fetches the thread; sending a reply POSTs the body and re-fetches', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { json: complaintsPage([complaint({ id: 700, subject: 'تأخير' })], { total: 1 }) })
    fm.reply('GET /admin/complaints/700', {
      json: ok(complaintDetail({ id: 700, subject: 'تأخير', body: 'الطلب اتأخر', thread: [] })),
    })
    fm.reply('POST /admin/complaints/700/reply', {
      json: ok(
        complaintDetail({
          id: 700,
          subject: 'تأخير',
          thread: [{ id: 1, author: 'admin', body: 'نعتذر', created_at: '2026-09-02T09:00:00+00:00' }],
        }),
      ),
    })
    renderAtComplaints(fm)
    await screen.findByText('تأخير')

    await user.click(screen.getByRole('button', { name: M.open }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('الطلب اتأخر')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(M.replyLabel), 'نعتذر')
    await user.click(within(dialog).getByRole('button', { name: M.send }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.replySentToast))
    expect(fm.lastCall('POST /admin/complaints/700/reply')?.body).toEqual({ body: 'نعتذر' })
    await within(dialog).findByText('نعتذر')
  })

  it('mark-resolved PATCHes the status and re-fetches the list', async () => {
    const user = userEvent.setup()
    fm.reply(
      LIST,
      { json: complaintsPage([complaint({ id: 700, status: 'open' })], { total: 1 }) },
      { json: complaintsPage([complaint({ id: 700, status: 'resolved' })], { total: 1 }) },
    )
    fm.reply('GET /admin/complaints/700', { json: ok(complaintDetail({ id: 700, status: 'open', thread: [] })) })
    fm.reply('PATCH /admin/complaints/700/status', {
      json: ok(complaintDetail({ id: 700, status: 'resolved', thread: [] })),
    })
    renderAtComplaints(fm)
    await screen.findByText('موضوع 700')
    await user.click(screen.getByRole('button', { name: M.open }))
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: M.markResolved }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(M.statusDoneToast))
    expect(fm.lastCall('PATCH /admin/complaints/700/status')?.body).toEqual({ status: 'resolved' })
    expect(fm.count(LIST)).toBe(2)
  })

  it('an offline first load shows a screen error + Retry; a non-admin is redirected', async () => {
    const user = userEvent.setup()
    fm.reply(LIST, { networkError: true }, { json: complaintsPage([complaint({ id: 1 })], { total: 1 }) })
    renderAtComplaints(fm)
    expect(await screen.findByText(M.listError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: M.retry }))
    expect(await screen.findByText('موضوع 1')).toBeInTheDocument()
  })

  it('a non-admin never reaches /complaints', async () => {
    fm.reply(LIST, { status: 401, json: fail('Unauthenticated.') })
    renderAtComplaints(fm, { admin: false })
    expect(await screen.findByText('صفحة تسجيل الدخول')).toBeInTheDocument()
  })
})
