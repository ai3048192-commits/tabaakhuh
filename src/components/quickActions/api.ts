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
}

/** `POST /admin/cooks` → `AdminCookApplicationController@store`. */
export function createCook(body: NewCookInput): Promise<unknown> {
  return authedRequest('/admin/cooks', { method: 'POST', body })
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
