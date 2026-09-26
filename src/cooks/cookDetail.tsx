import { useState } from 'react'
import { cookMessages as M } from './messages'
import type { DocumentRef, PendingCookEntry } from './types'

/** Ordered document list for the viewer: the four images, then the contract. */
export function buildDocs(entry: PendingCookEntry): DocumentRef[] {
  const p = entry.profile
  const docs: DocumentRef[] = [
    { kind: 'id_front', url: p.national_id_front_url, label: M.docIdFront },
    { kind: 'id_back', url: p.national_id_back_url, label: M.docIdBack },
    { kind: 'avatar', url: p.avatar_url, label: M.docAvatar },
    { kind: 'banner', url: p.banner_url, label: M.docBanner },
  ]
  if (entry.contract) {
    docs.push({ kind: 'contract', url: entry.contract.signed_file_url, label: M.docContract })
  }
  return docs
}

/** A present value, or the neutral placeholder for a missing/empty field. */
export function val(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return M.placeholder
  const s = String(v).trim()
  return s === '' ? M.placeholder : s
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('ar-EG')
}

export function DocTile({ doc, onOpen }: { doc: DocumentRef; onOpen: () => void }) {
  const [broken, setBroken] = useState(false)
  const unavailable = doc.url === null || broken
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={doc.label}
      className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-400 hover:border-[#7a0d0d]"
    >
      {unavailable ? (
        <span>{M.docUnavailable}</span>
      ) : (
        <img
          src={doc.url ?? undefined}
          alt={doc.label}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      )}
    </button>
  )
}

export type DetailLayout = 'inline' | 'grid'

function Field({
  label,
  value,
  layout,
  wide = false,
}: {
  label: string
  value: string
  layout: DetailLayout
  wide?: boolean
}) {
  if (layout === 'inline') {
    return (
      <div className="flex gap-1.5">
        <dt className="font-bold text-gray-400">{label}</dt>
        <dd className="text-gray-700">{value}</dd>
      </div>
    )
  }
  return (
    <div className={wide ? 'col-span-2 md:col-span-3' : undefined}>
      <dt className="font-bold text-gray-400">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/**
 * The submitted cook facts, shared by the list row and the review overlay.
 * `inline` packs "label value" pairs on a wrapping line (dense list row);
 * `grid` lays them out in labelled columns (the review screen).
 */
export function CookDetails({
  entry,
  cityName,
  layout = 'grid',
}: {
  entry: PendingCookEntry
  cityName: string
  layout?: DetailLayout
}) {
  const p = entry.profile
  const cls =
    layout === 'inline'
      ? 'flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600'
      : 'grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 md:grid-cols-3'
  return (
    <dl className={cls}>
      <Field label={M.fieldCity} layout={layout} value={cityName} />
      <Field label={M.fieldArea} layout={layout} value={val(p.area)} />
      <Field label={M.fieldAddress} layout={layout} value={val(p.address_text)} />
      <Field label={M.fieldRadius} layout={layout} value={M.radiusKm(p.delivery_radius_km)} />
      <Field label={M.fieldRating} layout={layout} value={M.rating(p.rating_avg, p.rating_count)} />
      {p.bio ? <Field label={M.fieldBio} layout={layout} value={p.bio} wide /> : null}
    </dl>
  )
}
