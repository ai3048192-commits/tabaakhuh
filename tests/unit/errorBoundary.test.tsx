import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../../src/shared/ErrorBoundary'

function Boom(): never {
  throw new Error('render exploded')
}

describe('ErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>محتوى سليم</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('محتوى سليم')).toBeInTheDocument()
  })

  it('replaces a crashed tree with a recoverable alert instead of a blank page', () => {
    // React logs the caught error itself; silence it so the run stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('حصل خطأ غير متوقع')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تحديث الصفحة' })).toBeInTheDocument()
  })

  it('reloads the page on the recovery button', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reload = vi.fn()
    // jsdom's location.reload is not writable; replace the accessor.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'تحديث الصفحة' }))
    expect(reload).toHaveBeenCalledOnce()
  })
})
