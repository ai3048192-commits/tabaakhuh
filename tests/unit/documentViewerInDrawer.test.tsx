import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DrawerShell from '../../src/shared/DrawerShell'
import DocumentViewer from '../../src/review/DocumentViewer'

/** The account drawer opens the viewer from inside itself. */
function renderViewerInDrawer() {
  const onDismiss = vi.fn()
  const onClose = vi.fn()
  render(
    <DrawerShell label="حساب" onDismiss={onDismiss}>
      <DocumentViewer
        docs={[{ kind: 'contract', url: 'https://cdn.test/c.pdf', label: 'العقد الموقّع' }]}
        index={0}
        onIndexChange={() => {}}
        onClose={onClose}
      />
    </DrawerShell>,
  )
  return { onDismiss, onClose, viewer: screen.getByRole('dialog', { name: 'العقد الموقّع' }) }
}

describe('DocumentViewer opened from a drawer', () => {
  it('sits above the drawer', () => {
    const { viewer } = renderViewerInDrawer()
    expect(viewer.parentElement?.className).toContain('z-[75]')
  })

  it('closes only itself on Escape — the drawer stays open', () => {
    const { viewer, onClose, onDismiss } = renderViewerInDrawer()
    fireEvent.keyDown(viewer, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
