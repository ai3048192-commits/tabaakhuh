import { useEffect, useId, useRef, useState } from 'react'
import DialogShell from '../shared/DialogShell'
import logoIcon from '../assets/logo_icon_trim.png'
import { warningMessages as M } from './messages'
import {
  LEVEL_LABELS,
  OTHER_VIOLATION,
  VIOLATIONS,
  type WarnableRole,
  type WarningLevel,
} from './policies'
import { buildWarningDocument, fullName } from './warningDocument'
import { printWarning } from './printWarning'

export interface WarnableUser {
  id: number
  first_name: string
  last_name: string
  phone: string
  email: string
  role: WarnableRole
}

const LEVELS: WarningLevel[] = ['first', 'second', 'final']

export default function IssueWarningDialog({
  user,
  issuerName,
  onIssued,
  onBlocked,
  onCancel,
}: {
  user: WarnableUser
  issuerName: string
  onIssued: () => void
  /** The popup blocker refused the letter window. */
  onBlocked: () => void
  onCancel: () => void
}) {
  const uid = useId()
  const selectRef = useRef<HTMLSelectElement>(null)
  const [level, setLevel] = useState<WarningLevel>('first')
  const [violation, setViolation] = useState('')
  const [details, setDetails] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    selectRef.current?.focus()
  }, [])

  const name = fullName(user)
  const isOther = violation === OTHER_VIOLATION
  const violationError = violation === '' ? M.violationRequired : null
  const detailsError = isOther && details.trim() === '' ? M.detailsRequired : null

  const submit = () => {
    setSubmitted(true)
    if (violationError || detailsError) return

    const label = isOther
      ? M.otherViolationInLetter
      : VIOLATIONS[user.role].find((v) => v.id === violation)?.label ?? violation

    const doc = buildWarningDocument({
      recipient: user,
      level,
      violation: label,
      details,
      issuedAt: new Date(),
      issuerName,
      logoUrl: new URL(logoIcon, window.location.href).href,
    })
    if (printWarning(doc)) onIssued()
    else onBlocked()
  }

  const field =
    'rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[#7a0d0d]'

  return (
    <DialogShell label={M.dialogTitle(name)} onDismiss={onCancel}>
      <h2 className="mb-1 text-base font-black text-gray-800">{M.dialogTitle(name)}</h2>
      <p className="mb-4 text-xs text-gray-500">{M.intro}</p>

      <fieldset className="mb-4">
        <legend className="mb-2 text-xs font-bold text-gray-500">{M.levelLegend}</legend>
        <div className="flex gap-2">
          {LEVELS.map((l) => (
            <label
              key={l}
              className={`flex-1 cursor-pointer rounded-lg border px-2 py-2 text-center text-xs font-black ${
                level === l ? 'border-[#7a0d0d] bg-[#7a0d0d] text-white' : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <input
                type="radio"
                name={`${uid}-level`}
                value={l}
                checked={level === l}
                onChange={() => setLevel(l)}
                className="sr-only"
              />
              {LEVEL_LABELS[l]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mb-4 flex flex-col gap-1">
        <label htmlFor={`${uid}-violation`} className="text-xs font-bold text-gray-500">
          {M.violationLabel}
        </label>
        <select
          ref={selectRef}
          id={`${uid}-violation`}
          value={violation}
          onChange={(e) => setViolation(e.target.value)}
          aria-invalid={submitted && violationError ? true : undefined}
          aria-describedby={submitted && violationError ? `${uid}-violation-err` : undefined}
          className={`${field} ${submitted && violationError ? 'border-red-300' : 'border-gray-200'}`}
        >
          <option value="">{M.violationPlaceholder}</option>
          {VIOLATIONS[user.role].map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
          <option value={OTHER_VIOLATION}>{M.otherViolation}</option>
        </select>
        {submitted && violationError && (
          <p id={`${uid}-violation-err`} className="text-xs text-red-600">{violationError}</p>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-1">
        <label htmlFor={`${uid}-details`} className="text-xs font-bold text-gray-500">
          {M.detailsLabel} {!isOther && <span className="font-normal text-gray-400">{M.detailsOptional}</span>}
        </label>
        <textarea
          id={`${uid}-details`}
          rows={3}
          maxLength={1000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={M.detailsPlaceholder}
          aria-invalid={submitted && detailsError ? true : undefined}
          aria-describedby={submitted && detailsError ? `${uid}-details-err` : undefined}
          className={`resize-none ${field} ${submitted && detailsError ? 'border-red-300' : 'border-gray-200'}`}
        />
        {submitted && detailsError && (
          <p id={`${uid}-details-err`} className="text-xs text-red-600">{detailsError}</p>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600">
          {M.cancel}
        </button>
        <button type="button" onClick={submit} className="flex-1 rounded-xl bg-[#7a0d0d] py-2.5 text-sm font-black text-white">
          {M.generate}
        </button>
      </div>
    </DialogShell>
  )
}
