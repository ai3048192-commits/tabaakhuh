import { authedRequest } from '../../api/httpClient'

/**
 * Quick-action creates, wired to the live backend
 * (`routes/api.php` — `/api/v1/admin/{cooks,notifications,users}` POST).
 * Field names match the server FormRequests EXACTLY (snake_case).
 */

export interface NewCookInput {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  store_name: string
  city_id?: number
  area?: string
  /**
   * Full cook-application profile. The server must accept these and create the
   * `cook_profile` in `approval_status: "pending"` so the new record surfaces in
   * `GET /admin/cooks/pending` (the `/cooks` review queue). Every field is
   * optional at the client; the server enforces whatever it requires.
   */
  bio?: string
  address_text?: string
  delivery_radius_km?: number
  lat?: number
  lng?: number
  avatar_url?: string
  banner_url?: string
  national_id_front_url?: string
  national_id_back_url?: string
}

/** `POST /admin/cooks` → `AdminCookApplicationController@store`. */
export function createCook(body: NewCookInput): Promise<unknown> {
  return authedRequest('/admin/cooks', { method: 'POST', body })
}

export interface NewDriverInput {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  city_id?: number
  /** `YYYY-MM-DD`. */
  birth_date?: string
  vehicle_type?: string
  vehicle_model?: string
  vehicle_year?: number
  vehicle_color?: string
  vehicle_plate_no?: string
  vehicle_plate_letters?: string
  national_id_front_url?: string
  national_id_back_url?: string
  license_url?: string
}

/**
 * `POST /admin/drivers` — create a driver account **and** its pending
 * application (vehicle profile + verification documents) in one call, so the
 * record shows up in `GET /admin/drivers/pending` (the `/drivers` review queue).
 *
 * This mirrors `POST /admin/cooks` and must be provided by the backend. The
 * older quick action posted to `POST /admin/users` with `role: "driver"`, which
 * only seeds a bare login and never reaches the review queue.
 */
export function createDriver(body: NewDriverInput): Promise<unknown> {
  return authedRequest('/admin/drivers', { method: 'POST', body })
}

export type NotificationAudience = 'all' | 'customers' | 'cooks' | 'drivers'

export interface NewNotificationInput {
  title: string
  body: string
  audience: NotificationAudience
}

/** `POST /admin/notifications` → `AdminNotificationController@store`. */
export function createNotification(body: NewNotificationInput): Promise<unknown> {
  return authedRequest('/admin/notifications', { method: 'POST', body })
}

export type UserRole = 'customer' | 'cook' | 'driver' | 'admin'

export interface NewUserInput {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  role: UserRole
}

/** `POST /admin/users` → `AdminUserController@store`. */
export function createUser(body: NewUserInput): Promise<unknown> {
  return authedRequest('/admin/users', { method: 'POST', body })
}
