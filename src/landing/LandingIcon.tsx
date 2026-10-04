import { createElement } from 'react'
import type { LucideProps } from 'lucide-react'
import { iconFor } from './icons'

/** Renders a landing icon by its stored key (see `ICONS`). */
export default function LandingIcon({ name, ...props }: { name: string } & LucideProps) {
  return createElement(iconFor(name), props)
}
