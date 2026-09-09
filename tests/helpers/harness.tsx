import type { ReactNode } from 'react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { render } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../src/auth/AuthContext'
import RequireAdmin from '../../src/auth/RequireAdmin'
import FullScreenLoader from '../../src/auth/FullScreenLoader'
import Login from '../../src/pages/Login'
import Header from '../../src/components/Header'
import Sidebar from '../../src/components/Sidebar'
import CookApplicationsPage from '../../src/cooks/CookApplicationsPage'
import DriverApplicationsPage from '../../src/drivers/DriverApplicationsPage'
import SettingsPage from '../../src/settings/SettingsPage'
import CitiesPage from '../../src/cities/CitiesPage'
import OverviewPage from '../../src/overview/OverviewPage'
import OrdersPage from '../../src/orders/OrdersPage'
import WithdrawalsPage from '../../src/withdrawals/WithdrawalsPage'
import UsersPage from '../../src/users/UsersPage'
import ComplaintsPage from '../../src/complaints/ComplaintsPage'
import ReportsPage from '../../src/reports/ReportsPage'
import DeliveryPage from '../../src/delivery/DeliveryPage'
import { STORAGE_KEYS } from '../../src/auth/authStorage'
import { __resetCityDirectory } from '../../src/cities/citiesApi'
import { adminUser, ok } from './fixtures'
import type { FetchMock } from './fetchMock'

/** Mirrors `<LoginRoute>` in src/App.tsx. */
function LoginRoute() {
  const { status } = useAuth()
  if (status === 'checking') return <FullScreenLoader />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <Login />
}

/** Lightweight stand-in for the guarded dashboard shell. Renders the real Header + Sidebar. */
function DashboardStub() {
  return (
    <div>
      <Sidebar isOpen={false} onClose={() => {}} />
      <Header toggleSidebar={() => {}} />
      <h1>لوحة التحكم — الرئيسية</h1>
    </div>
  )
}

export function renderApp(initialEntries: string[] = ['/login'], extra?: ReactNode) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<div>الموقع</div>} />
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <DashboardStub />
              </RequireAdmin>
            }
          />
        </Routes>
        {extra}
      </AuthProvider>
    </MemoryRouter>,
  )
}

/**
 * Render the real `CookApplicationsPage` at `/cooks` inside an already-signed-in
 * admin session. Seeds the stored token/profile and (by default) the
 * `GET /auth/me` restore reply; the test configures `GET /admin/cities` and
 * `GET /admin/cooks/pending` on `fm` before calling this.
 */
export function renderAtCooks(fm: FetchMock, opts: { seedMe?: boolean } = {}) {
  const { seedMe = true } = opts
  __resetCityDirectory()
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(adminUser))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: adminUser }) })

  return render(
    <MemoryRouter initialEntries={['/cooks']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <CookApplicationsPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/**
 * Render the real `DriverApplicationsPage` at `/drivers` inside an
 * already-signed-in admin session. Seeds the stored token/profile and (by
 * default) the `GET /auth/me` restore reply; the test configures
 * `GET /admin/cities` and `GET /admin/drivers/pending` on `fm` before calling.
 * Pass `{ admin: false }` to seed a non-admin profile (FR-029).
 */
export function renderAtDrivers(
  fm: FetchMock,
  opts: { seedMe?: boolean; admin?: boolean } = {},
) {
  const { seedMe = true, admin = true } = opts
  const who = admin ? adminUser : { ...adminUser, role: 'customer' as const }
  __resetCityDirectory()
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(who))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: who }) })

  return render(
    <MemoryRouter initialEntries={['/drivers']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <DriverApplicationsPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/**
 * Render the real `SettingsPage` at `/settings` inside an already-signed-in admin
 * session. Seeds the stored token/profile and (by default) the `GET /auth/me`
 * restore reply; the test configures `GET /admin/settings` (and `PUT`) on `fm`
 * before calling. Pass `{ admin: false }` to seed a non-admin profile (FR-022).
 */
export function renderAtSettings(
  fm: FetchMock,
  opts: { seedMe?: boolean; admin?: boolean } = {},
) {
  const { seedMe = true, admin = true } = opts
  const who = admin ? adminUser : { ...adminUser, role: 'customer' as const }
  __resetCityDirectory()
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(who))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: who }) })
  // SettingsPage reads the city list for its "المدن والمناطق" card; a test that
  // cares about that card stubs `GET /admin/cities` itself. Left unstubbed the
  // fetch rejects and the card falls back to an empty state (tolerated).

  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <SettingsPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/**
 * Render the real `CitiesPage` at `/cities` inside an already-signed-in admin
 * session. Seeds the stored token/profile and (by default) the `GET /auth/me`
 * restore reply; the test configures `GET /admin/cities` on `fm` before calling.
 * Pass `{ admin: false }` to seed a non-admin profile (FR-036).
 */
export function renderAtCities(
  fm: FetchMock,
  opts: { seedMe?: boolean; admin?: boolean } = {},
) {
  const { seedMe = true, admin = true } = opts
  const who = admin ? adminUser : { ...adminUser, role: 'customer' as const }
  __resetCityDirectory()
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(who))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: who }) })

  return render(
    <MemoryRouter initialEntries={['/cities']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <CitiesPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/**
 * Render the real `OverviewPage` at `/dashboard` inside an already-signed-in
 * admin session. Seeds the stored token/profile and (by default) the
 * `GET /auth/me` restore reply; the test configures
 * `GET /admin/reports/overview` on `fm` before calling. A `/orders` stub route
 * backs the US3 drill-down check. Pass `{ admin: false }` to seed a non-admin
 * profile (FR-001).
 */
export function renderAtDashboard(
  fm: FetchMock,
  opts: { seedMe?: boolean; admin?: boolean; onQuickAction?: (t: string) => void } = {},
) {
  const { seedMe = true, admin = true } = opts
  const who = admin ? adminUser : { ...adminUser, role: 'customer' as const }
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(who))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: who }) })

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route path="/orders" element={<div>شاشة الطلبات</div>} />
          <Route path="/delivery" element={<div>شاشة الدليفري</div>} />
          <Route path="/cooks" element={<div>شاشة الطهاة</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <OverviewPage onQuickAction={opts.onQuickAction} />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/**
 * Render the real `OrdersPage` at `/orders` (or a full query string via
 * `opts.path`) inside an already-signed-in admin session. Seeds the stored
 * token/profile and (by default) the `GET /auth/me` restore reply; the test
 * configures `GET /admin/orders?...` and `GET /admin/cities` on `fm` before
 * calling. Pass `{ admin: false }` to seed a non-admin profile (FR-030).
 */
export function renderAtOrders(
  fm: FetchMock,
  opts: { seedMe?: boolean; admin?: boolean; path?: string } = {},
) {
  const { seedMe = true, admin = true, path = '/orders' } = opts
  const who = admin ? adminUser : { ...adminUser, role: 'customer' as const }
  __resetCityDirectory()
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(who))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: who }) })

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <OrdersPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/**
 * Render the real `WithdrawalsPage` at `/withdrawals` inside an already-signed-in
 * admin session. Seeds the stored token/profile and (by default) the
 * `GET /auth/me` restore reply; the test configures the
 * `GET /admin/withdrawals?...` replies on `fm` before calling. Pass
 * `{ admin: false }` to seed a non-admin profile (FR-035).
 */
export function renderAtWithdrawals(
  fm: FetchMock,
  opts: { seedMe?: boolean; admin?: boolean } = {},
) {
  const { seedMe = true, admin = true } = opts
  const who = admin ? adminUser : { ...adminUser, role: 'customer' as const }
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(who))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: who }) })

  return render(
    <MemoryRouter initialEntries={['/withdrawals']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <WithdrawalsPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/** Render the real `UsersPage` at `/users` in an already-signed-in admin session. */
export function renderAtUsers(
  fm: FetchMock,
  opts: { seedMe?: boolean; admin?: boolean } = {},
) {
  const { seedMe = true, admin = true } = opts
  const who = admin ? adminUser : { ...adminUser, role: 'customer' as const }
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(who))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: who }) })

  return render(
    <MemoryRouter initialEntries={['/users']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <UsersPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/** Render the real `ComplaintsPage` at `/complaints` in an already-signed-in admin session. */
export function renderAtComplaints(
  fm: FetchMock,
  opts: { seedMe?: boolean; admin?: boolean } = {},
) {
  const { seedMe = true, admin = true } = opts
  const who = admin ? adminUser : { ...adminUser, role: 'customer' as const }
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(who))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: who }) })

  return render(
    <MemoryRouter initialEntries={['/complaints']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <ComplaintsPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/** Render the real `ReportsPage` at `/reports` in an already-signed-in admin session. */
export function renderAtReports(
  fm: FetchMock,
  opts: { seedMe?: boolean; admin?: boolean } = {},
) {
  const { seedMe = true, admin = true } = opts
  const who = admin ? adminUser : { ...adminUser, role: 'customer' as const }
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(who))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: who }) })

  return render(
    <MemoryRouter initialEntries={['/reports']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <ReportsPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/** Render the real `DeliveryPage` at `/delivery` in an already-signed-in admin session. */
export function renderAtDelivery(
  fm: FetchMock,
  opts: { seedMe?: boolean; admin?: boolean } = {},
) {
  const { seedMe = true, admin = true } = opts
  const who = admin ? adminUser : { ...adminUser, role: 'customer' as const }
  localStorage.setItem(STORAGE_KEYS.token, 'tok-admin')
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(who))
  if (seedMe) fm.reply('GET /auth/me', { json: ok({ user: who }) })

  return render(
    <MemoryRouter initialEntries={['/delivery']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>صفحة تسجيل الدخول</div>} />
          <Route
            path="/*"
            element={
              <RequireAdmin>
                <DeliveryPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}
