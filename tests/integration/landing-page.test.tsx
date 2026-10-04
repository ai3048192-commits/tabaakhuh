import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LandingPage from '../../src/pages/LandingPage'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok } from '../helpers/fixtures'
import { DEFAULT_LANDING_CONTENT as D } from '../../src/landing/content'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const renderLanding = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )

describe('Landing page content', () => {
  it('renders the saved content, store links and social links, and hides disabled sections', async () => {
    fm.reply('GET /landing-content', {
      json: ok({
        content: {
          ...D,
          hero: { ...D.hero, titleLine1: 'عنوان من الإدارة' },
          faq: { ...D.faq, enabled: false },
          app: { ...D.app, googlePlayUrl: 'https://play.google.com/store/apps/details?id=app.tabbakha' },
          social: { ...D.social, links: [{ id: 's', platform: 'instagram', label: 'إنستجرام', url: 'https://instagram.com/tabbakha' }] },
        },
        updated_at: null,
      }),
    })
    renderLanding()

    expect(await screen.findByText('عنوان من الإدارة')).toBeInTheDocument()
    expect(screen.queryByText(D.faq.items[0].question)).toBeNull()
    expect(screen.getByRole('link', { name: /Google Play/ })).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=app.tabbakha',
    )
    // no App Store link yet → shown as "soon", not a link
    expect(screen.queryByRole('link', { name: /App Store/ })).toBeNull()
    expect(screen.getAllByRole('link', { name: /إنستجرام/ })[0]).toHaveAttribute('href', 'https://instagram.com/tabbakha')
  })

  it('falls back to the built-in content when the API is down', async () => {
    fm.reply('GET /landing-content', { networkError: true })
    renderLanding()
    expect(await screen.findByText(D.hero.titleHighlight)).toBeInTheDocument()
    expect(screen.getByText(D.contact.title)).toBeInTheDocument()
  })

  it('drops unsafe admin links', async () => {
    fm.reply('GET /landing-content', {
      json: ok({ content: { ...D, cta: { ...D.cta, buttonHref: 'javascript:alert(1)' } }, updated_at: null }),
    })
    renderLanding()
    const btn = (await screen.findByText(D.cta.buttonLabel)).closest('a')!
    expect(btn.getAttribute('href')).toBe('#')
  })
})
