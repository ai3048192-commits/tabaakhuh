import { useId, type ReactNode } from 'react'

/** Labelled text field with an inline error message (RTL). */
export default function Field({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  icon,
  autoFocus,
  name,
  autoComplete = 'off',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  placeholder?: string
  icon?: ReactNode
  autoFocus?: boolean
  /** Explicit field name; kept off the browser's autofill heuristics by default. */
  name?: string
  /** Defaults to `off`; pass `new-password` to also block credential autofill in Chrome. */
  autoComplete?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="pr-1 text-[11px] font-bold text-gray-500">{label}</label>
      <div className="relative flex items-center">
        {icon && <span className="absolute right-3 text-[#7a0d0d]/50">{icon}</span>}
        <input
          id={id}
          type={type}
          name={name}
          value={value}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`w-full rounded-2xl border bg-white py-3 pl-4 text-sm outline-none transition ${
            icon ? 'pr-10' : 'pr-4'
          } ${error ? 'border-red-300 focus:ring-2 focus:ring-red-200' : 'border-[#e8dfc9] focus:ring-2 focus:ring-[#7a0d0d]/20'}`}
        />
      </div>
      {error && (
        <p id={`${id}-err`} className="pr-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
