import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAtCooks } from '../helpers/harness'
import { installFetchMock, type FetchMock } from '../helpers/fetchMock'
import { ok, pendingCook, cityList } from '../helpers/fixtures'
import { cookMessages as M } from '../../src/cooks/messages'
import { reviewMessages as RM } from '../../src/review/messages'

let fm: FetchMock

beforeEach(() => {
  fm = installFetchMock()
  fm.reply('GET /admin/cities', { json: ok(cityList()) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

/** Render the queue with one signed application and open its contract viewer. */
async function openContract(signedFileUrl: string) {
  const user = userEvent.setup()
  fm.reply('GET /admin/cooks/pending', {
    json: ok([
      pendingCook(
        { id: 1, store_name: 'موقّعة' },
        { template_version: 'v1', signed_file_url: signedFileUrl },
      ),
    ]),
  })
  renderAtCooks(fm)

  const article = (await screen.findByText('موقّعة')).closest('article') as HTMLElement
  await user.click(within(article).getByRole('button', { name: M.review }))
  const review = await screen.findByRole('dialog', { name: M.reviewHeading })
  await user.click(within(review).getByRole('button', { name: M.openContract }))
  return { user, viewer: await screen.findByRole('dialog', { name: M.docContract }) }
}

describe('the contract viewer picks a renderer from the file, not from the kind', () => {
  it('frames a PDF contract', async () => {
    const { viewer } = await openContract('https://cdn.test/contract-12.pdf')
    expect(within(viewer).getByTitle(M.docContract)).toBeInTheDocument()
  })

  it('shows an image contract as an image, not an empty frame', async () => {
    // A scanned, photographed contract — the case that rendered blank before.
    const { viewer } = await openContract('https://cdn.test/contract-12.jpg')
    expect(within(viewer).queryByTitle(M.docContract)).toBeNull()
    const img = within(viewer).getByRole('img', { name: M.docContract })
    expect(img).toHaveAttribute('src', 'https://cdn.test/contract-12.jpg')
    // and it gets the image controls
    expect(within(viewer).getByRole('button', { name: RM.viewerZoomIn })).toBeInTheDocument()
  })

  it('frames a URL whose type cannot be told, rather than guessing', async () => {
    const { viewer } = await openContract('https://cdn.test/files/abc123')
    expect(within(viewer).getByTitle(M.docContract)).toBeInTheDocument()
  })
})

describe('the viewer reports a failure instead of showing a blank box', () => {
  it('an image that fails to load is replaced by a message and an open action', async () => {
    const { viewer } = await openContract('https://cdn.test/contract-12.jpg')
    const img = within(viewer).getByRole('img', { name: M.docContract })

    fireEvent.error(img)

    expect(await within(viewer).findByText(RM.docLoadFailed)).toBeInTheDocument()
    expect(within(viewer).getByText(RM.docLoadFailedHint)).toBeInTheDocument()
    expect(within(viewer).queryByRole('img', { name: M.docContract })).toBeNull()
    expect(within(viewer).getByRole('link', { name: RM.openInNewTab })).toHaveAttribute(
      'href',
      'https://cdn.test/contract-12.jpg',
    )
  })

  it('a framed document that never loads falls back to the failure panel', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { viewer } = await openContract('https://cdn.test/contract-12.pdf')
      expect(within(viewer).getByTitle(M.docContract)).toBeInTheDocument()

      await vi.advanceTimersByTimeAsync(9000)

      await waitFor(() => expect(within(viewer).queryByTitle(M.docContract)).toBeNull())
      expect(within(viewer).getByText(RM.docLoadFailed)).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a framed document that loads keeps the frame and does not time out', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { viewer } = await openContract('https://cdn.test/contract-12.pdf')
      fireEvent.load(within(viewer).getByTitle(M.docContract))

      await vi.advanceTimersByTimeAsync(9000)

      expect(within(viewer).getByTitle(M.docContract)).toBeInTheDocument()
      expect(within(viewer).queryByText(RM.docLoadFailed)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('the new-tab route is on screen for a framed document from the start', async () => {
    // A cross-origin frame that loaded a 401 page reports success, so this link
    // can never be hidden behind failure detection.
    const { viewer } = await openContract('https://cdn.test/contract-12.pdf')
    expect(within(viewer).getByText(RM.docNotShowing)).toBeInTheDocument()
    expect(within(viewer).getByRole('link', { name: RM.openInNewTab })).toHaveAttribute(
      'href',
      'https://cdn.test/contract-12.pdf',
    )
  })
})
