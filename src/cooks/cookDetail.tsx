import { useState, type ReactNode } from 'react'
import { Copy, Download, Mail, MessageCircle } from 'lucide-react'
import { safeUrl } from '../shared/safeUrl'
import { resolveMedia } from '../review/documentMedia'
import { cookMessages as M } from './messages'
import { sendVerificationLink } from './cooksApi'
import type { DocumentRef, PendingCookEntry, SignedContract } from './types'

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
    docs.push({
      kind: 'contract',
      url: entry.contract.signed_file_url,
      label: M.docContract,
      media: entry.contract.file_kind,
    })
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
      // w-full: a <button> shrinks to its content, so without it the PDF
      // placeholder collapsed to a sliver while photos stretched the others.
      className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-400 hover:border-[#7a0d0d]"
    >
      {unavailable ? (
        <span>{M.docUnavailable}</span>
      ) : resolveMedia(doc) === 'pdf' || resolveMedia(doc) === 'unknown' ? (
        // A PDF contract can't render in an <img> — it used to fall to
        // "unavailable" here even though the viewer opens it fine.
        <span className="flex flex-col items-center gap-1 font-bold text-[#7a0d0d]">
          <span className="text-2xl">📄</span>
          <span>PDF</span>
        </span>
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

/**
 * "تنزيل العقد" — the backend's download link (saves the file), or the view
 * link on an older API build. Nothing when the file can't be signed.
 */
export function ContractDownloadLink({ contract }: { contract: SignedContract }) {
  const href = safeUrl(contract.download_url ?? contract.signed_file_url)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="flex items-center gap-1 font-bold text-[#7a0d0d]"
    >
      <Download size={14} aria-hidden="true" />
      {M.downloadContract}
    </a>
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' })
}

/**
 * How the contract was signed, and — for one signed in the app — the record
 * that proves it: who typed which name, with which national id, when, from
 * where, and the fingerprint of the exact text she agreed to.
 */
export function ContractEvidence({ contract }: { contract: SignedContract }) {
  const digital = contract.signing_method === 'digital'
  const row = (label: string, value: ReactNode, wide = false) => (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="font-bold text-gray-400">{label}</dt>
      <dd className="text-gray-700">{value}</dd>
    </div>
  )
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {row(M.contractMethod, digital ? M.contractDigital : M.contractUpload)}
      {row(M.contractSignedAt, formatDateTime(contract.signed_at))}
      {digital && (
        <>
          {row(M.contractSigner, val(contract.signer_name))}
          {row(M.contractNationalId, <bdi dir="ltr">{val(contract.signer_national_id)}</bdi>)}
          {row(M.contractIp, <bdi dir="ltr">{val(contract.signer_ip)}</bdi>)}
          {row(M.contractAppVersion, <bdi dir="ltr">{val(contract.signer_app_version)}</bdi>)}
          {row(M.contractDevice, <bdi dir="ltr">{val(contract.signer_device)}</bdi>, true)}
          {row(M.contractAcks, M.contractAcksCount(contract.acknowledgements?.length ?? 0), true)}
          {row(
            M.contractHash,
            <code dir="ltr" className="block break-all font-mono text-[10.5px] text-gray-600">
              {val(contract.content_hash)}
            </code>,
            true,
          )}
        </>
      )}
    </dl>
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
  value: ReactNode
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
      <Field label={M.fieldPhone} layout={layout} value={<bdi dir="ltr">{val(p.phone)}</bdi>} />
      <Field label={M.fieldEmail} layout={layout} value={val(p.email)} />
      <Field label={M.fieldCity} layout={layout} value={cityName} />
      <Field label={M.fieldArea} layout={layout} value={val(p.area)} />
      <Field label={M.fieldAddress} layout={layout} value={val(p.address_text)} />
      <Field label={M.fieldRadius} layout={layout} value={M.radiusKm(p.delivery_radius_km)} />
      {p.offers_delivery !== undefined || p.offers_pickup !== undefined ? (
        <Field label={M.fieldFulfillment} layout={layout} value={M.fulfillment(p.offers_delivery, p.offers_pickup)} />
      ) : null}
      <Field label={M.fieldRating} layout={layout} value={M.rating(p.rating_avg, p.rating_count)} />
      {p.payment_vodafone_cash_number ? (
        <Field label={M.fieldPayVodafone} layout={layout} value={<bdi dir="ltr">{p.payment_vodafone_cash_number}</bdi>} />
      ) : null}
      {p.payment_instapay_address ? (
        <Field label={M.fieldPayInstapay} layout={layout} value={<bdi dir="ltr">{p.payment_instapay_address}</bdi>} />
      ) : null}
      {p.bio ? <Field label={M.fieldBio} layout={layout} value={p.bio} wide /> : null}
    </dl>
  )
}

const VERIFICATION_URL = 'https://tabbakha.app/cook-verification/'

/** Egyptian mobile → wa.me international form (01xxxxxxxxx → 201xxxxxxxxx). */
function waNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.startsWith('20') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 11) return `2${digits}`
  if (digits.startsWith('1') && digits.length === 10) return `20${digits}`
  return null
}

/**
 * The identity verification the cook sent from the website form (the apps no
 * longer collect ID), plus ways to send her the form: email it from the
 * server, copy the link, or open WhatsApp with a ready message.
 */
export function IdentityVerification({ entry }: { entry: PendingCookEntry }) {
  const p = entry.profile
  const [mail, setMail] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [copied, setCopied] = useState(false)
  const firstName = (p.name ?? '').split(' ')[0] || ''
  const wa = waNumber(p.phone)

  const send = async () => {
    setMail('sending')
    try {
      await sendVerificationLink(p.id)
      setMail('sent')
    } catch {
      setMail('failed')
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(VERIFICATION_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — the link is visible below anyway */
    }
  }

  return (
    <div className="text-xs">
      {p.verification_submitted_at ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-600">
          <div className="col-span-2 font-bold text-green-700">
            {M.verificationSubmitted(formatDate(p.verification_submitted_at))}
          </div>
          <div>
            <dt className="font-bold text-gray-400">{M.verificationFullName}</dt>
            <dd>{val(p.verification_full_name)}</dd>
          </div>
          <div>
            <dt className="font-bold text-gray-400">{M.verificationNationalId}</dt>
            <dd><bdi dir="ltr">{val(p.verification_national_id)}</bdi></dd>
          </div>
        </dl>
      ) : (
        <p className="font-bold text-[#b45309]">{M.verificationMissing}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={mail === 'sending'}
          className="flex items-center gap-1 font-bold text-[#7a0d0d] disabled:opacity-50"
        >
          <Mail size={14} aria-hidden="true" />
          {mail === 'sending' ? M.verificationSending : mail === 'sent' ? M.verificationSent : M.verificationSendEmail}
        </button>
        <button type="button" onClick={copy} className="flex items-center gap-1 font-bold text-[#7a0d0d]">
          <Copy size={14} aria-hidden="true" />
          {copied ? M.verificationCopied : M.verificationCopy}
        </button>
        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(M.verificationWhatsAppText(firstName))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-bold text-[#15803d]"
          >
            <MessageCircle size={14} aria-hidden="true" />
            {M.verificationWhatsApp}
          </a>
        )}
      </div>
      {mail === 'failed' && <p className="mt-2 text-red-600">{M.verificationSendFailed}</p>}
      <p className="mt-2 text-gray-400"><bdi dir="ltr">{VERIFICATION_URL}</bdi></p>
    </div>
  )
}
