import { describe, it, expect } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import NotFound from '../../src/pages/NotFound'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard" element={<h1>لوحة التحكم</h1>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('NotFound', () => {
  it('explains an unknown path instead of rendering an empty shell', () => {
    renderAt('/does-not-exist')
    expect(screen.getByText('الصفحة غير موجودة')).toBeInTheDocument()
  })

  it('offers a way back to the dashboard', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('link', { name: 'الرجوع للوحة التحكم' })).toHaveAttribute(
      'href',
      '/dashboard',
    )
  })

  it('stays out of the way of a real route', () => {
    renderAt('/dashboard')
    expect(screen.queryByText('الصفحة غير موجودة')).not.toBeInTheDocument()
  })
})
