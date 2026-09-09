import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import FullScreenLoader from './FullScreenLoader'

/**
 * Route guard for the authenticated dashboard shell.
 * - `checking`  → neutral loader; no authenticated content, no sign-in form (FR-017, SC-008)
 * - otherwise not `authenticated` → redirect to `/login`
 * - `authenticated` → render children
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'checking') return <FullScreenLoader />
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  return <>{children}</>
}
