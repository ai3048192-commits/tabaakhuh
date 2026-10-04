import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtSettings } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, settingsResponse } from '../helpers/fixtures'
import { DEFAULT_LANDING_CONTENT } from '../../src/landing/content'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /admin/settings', { json: settingsResponse(25) })
  fm.reply('GET /admin/cities', { json: ok([]) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const GET = 'GET /landing-content'
const PUT = 'PUT /admin/landing-content'

describe('Settings → home page content editor', () => {
  it('loads the saved content, edits a field, and saves the whole document', async () => {
    const user = userEvent.setup()
    const stored = { ...DEFAULT_LANDING_CONTENT, hero: { ...DEFAULT_LANDING_CONTENT.hero, titleLine1: 'أكل زمان' } }
    fm.reply(GET, { json: ok({ content: stored, updated_at: '2026-10-01T10:00:00+00:00' }) })
    fm.reply(PUT, { json: ok({ content: { ...stored, hero: { ...stored.hero, titleLine1: 'أكل النهاردة' } }, updated_at: '2026-10-04T10:00:00+00:00' }) })
    renderAtSettings(fm, { path: '/settings?tab=landing' })

    const title = await screen.findByLabelText('العنوان — السطر الأول')
    expect(title).toHaveValue('أكل زمان')
    const save = screen.getByRole('button', { name: 'حفظ ونشر' })
    expect(save).toBeDisabled()

    await user.clear(title)
    await user.type(title, 'أكل النهاردة')
    expect(screen.getByText('تعديلات غير محفوظة')).toBeInTheDocument()
    await user.click(save)

    await waitFor(() => expect(fm.count(PUT)).toBe(1))
    const body = fm.lastCall(PUT)?.body as { content: typeof stored }
    expect(body.content.hero.titleLine1).toBe('أكل النهاردة')
    expect(body.content.faq.items).toHaveLength(DEFAULT_LANDING_CONTENT.faq.items.length)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('تم حفظ محتوى الصفحة الرئيسية'))
  })

  it('adds a social account with a link', async () => {
    const user = userEvent.setup()
    fm.reply(GET, { json: ok({ content: null, updated_at: null }) })
    fm.reply(PUT, { json: ok({ content: DEFAULT_LANDING_CONTENT, updated_at: null }) })
    renderAtSettings(fm, { path: '/settings?tab=landing' })

    expect(await screen.findByText(/الصفحة بتعرض المحتوى الافتراضي/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /السوشيال ميديا/ }))
    await user.click(screen.getByRole('button', { name: 'إضافة حساب' }))
    await user.click(screen.getByRole('button', { name: 'YouTube' }))
    await user.type(screen.getByLabelText('الرابط'), 'https://youtube.com/@tabbakha')
    await user.click(screen.getByRole('button', { name: 'حفظ ونشر' }))

    await waitFor(() => expect(fm.count(PUT)).toBe(1))
    const links = (fm.lastCall(PUT)?.body as { content: typeof DEFAULT_LANDING_CONTENT }).content.social.links
    expect(links.at(-1)).toMatchObject({ platform: 'youtube', url: 'https://youtube.com/@tabbakha' })
  })

  it('deletes a FAQ question', async () => {
    const user = userEvent.setup()
    fm.reply(GET, { json: ok({ content: DEFAULT_LANDING_CONTENT, updated_at: null }) })
    fm.reply(PUT, { json: ok({ content: DEFAULT_LANDING_CONTENT, updated_at: null }) })
    renderAtSettings(fm, { path: '/settings?tab=landing' })

    await user.click(await screen.findByRole('button', { name: /الأسئلة الشائعة/ }))
    const first = DEFAULT_LANDING_CONTENT.faq.items[0].question
    await user.click(screen.getByRole('button', { name: `حذف «${first}»` }))
    await user.click(screen.getByRole('button', { name: 'حفظ ونشر' }))

    await waitFor(() => expect(fm.count(PUT)).toBe(1))
    const items = (fm.lastCall(PUT)?.body as { content: typeof DEFAULT_LANDING_CONTENT }).content.faq.items
    expect(items.map((q) => q.question)).not.toContain(first)
    expect(items).toHaveLength(DEFAULT_LANDING_CONTENT.faq.items.length - 1)
  })

  it('a failed load offers a retry', async () => {
    const user = userEvent.setup()
    fm.reply(GET, { networkError: true }, { json: ok({ content: null, updated_at: null }) })
    renderAtSettings(fm, { path: '/settings?tab=landing' })

    await user.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByLabelText('العنوان — السطر الأول')).toBeInTheDocument()
  })

  it('the tab bar switches between system settings and page content', async () => {
    const user = userEvent.setup()
    fm.reply(GET, { json: ok({ content: null, updated_at: null }) })
    renderAtSettings(fm)

    const tabs = await screen.findByRole('tablist')
    await user.click(within(tabs).getByRole('tab', { name: 'محتوى الصفحة الرئيسية' }))
    expect(await screen.findByLabelText('العنوان — السطر الأول')).toBeInTheDocument()
  })
})
