import { useState } from 'react'
import { driverMessages as M } from './messages'
import type { DocumentRef, DriverApplication } from './types'

/** Ordered document list for the viewer: the three verification images. */
export function buildDocs(entry: DriverApplication): DocumentRef[] {
  return [
    { kind: 'id_front', url: entry.national_id_front_url, label: M.docIdFront },
    { kind: 'id_back', url: entry.national_id_back_url, label: M.docIdBack },
    { kind: 'license', url: entry.license_url, label: M.docLicense },
  ]
}

/** A present value, or the neutral placeholder for a missing/empty field (FR-003b). */
export function val(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return M.placeholder
  const s = String(v).trim()
  if (s === '' || s === '0') return M.placeholder
  return s
}

export function formatDate(value: string): string {
  if (!value) return M.placeholder
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('ar-EG')
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

function Field({ label, value, layout }: { label: string; value: string; layout: DetailLayout }) {
  if (layout === 'inline') {
    return (
      <div className="flex gap-1.5">
        <dt className="font-bold text-gray-400">{label}</dt>
        <dd className="text-gray-700">{value}</dd>
      </div>
    )
  }
  return (
    <div>
      <dt className="font-bold text-gray-400">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export type DetailLayout = 'inline' | 'grid'

/**
 * The identity / vehicle facts, shared by the list row and the review overlay.
 * `inline` packs "label value" pairs on a wrapping line (dense list row);
 * `grid` lays them out in labelled columns (the review screen).
 */
export function DriverDetails({
  entry,
  cityName,
  layout = 'grid',
}: {
  entry: DriverApplication
  cityName: string
  layout?: DetailLayout
}) {
  const cls =
    layout === 'inline'
      ? 'flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600'
      : 'grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 md:grid-cols-3'
  return (
    <dl className={cls}>
      <Field
        label={M.fieldVehicle}
        layout={layout}
        value={M.vehicleLine(
          val(entry.vehicle_type),
          val(entry.vehicle_model),
          val(entry.vehicle_year),
          val(entry.vehicle_color),
        )}
      />
      <Field
        label={M.fieldPlate}
        layout={layout}
        value={M.plateLine(val(entry.vehicle_plate_no), val(entry.vehicle_plate_letters))}
      />
      <Field label={M.fieldCity} layout={layout} value={cityName} />
      <Field label={M.fieldBirthDate} layout={layout} value={formatDate(entry.birth_date)} />
      <Field label={M.fieldSubmittedAt} layout={layout} value={formatDate(entry.submitted_at)} />
      <Field
        label={M.fieldRating}
        layout={layout}
        value={M.rating(entry.rating_avg, entry.rating_count)}
      />
    </dl>
  )
}
