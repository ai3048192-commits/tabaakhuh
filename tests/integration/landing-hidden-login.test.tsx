import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LandingPage from '../../src/pages/LandingPage'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok } from '../helpers/fixtures'
import { DEFAULT_LANDING_CONTENT as D } from '../../src/landing/content'

let fm: FetchMock
beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /landing-content', { json: ok({ content: D, updated_at: null }) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function renderLanding() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<div>صفحة الدخول</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Admin sign-in on the landing page', () => {
  it('shows no sign-in button or link to visitors', async () => {
    renderLanding()
    await screen.findAllByRole('img', { name: D.brand.name })

    expect(screen.queryByText('تسجيل دخول')).toBeNull()
    expect(document.querySelector('a[href="/login"]')).toBeNull()
  })

  it('opens /login after five taps on the header logo', async () => {
    renderLanding()
    const logo = (await screen.findAllByRole('img', { name: D.brand.name }))[0].closest('a')!

    for (let i = 0; i < 4; i++) fireEvent.click(logo)
    expect(screen.queryByText('صفحة الدخول')).toBeNull()

    fireEvent.click(logo)
    expect(await screen.findByText('صفحة الدخول')).toBeInTheDocument()
  })
})
