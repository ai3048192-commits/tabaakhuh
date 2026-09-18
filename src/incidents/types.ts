/**
 * Driver incident reports (`POST /driver/incidents` on the driver app) —
 * persisted server-side as a support ticket with `category: "incident"`
 * (see `docs/driver-app-api.md` D-SUPPORT on the backend). This screen is
 * a narrowed view over the general `/admin/support/tickets` surface,
 * mirroring how `/admin/complaints` narrows the same surface to
 * `complaint`/`suggestion` — see `src/complaints/`.
 */

export type IncidentStatus = 'open' | 'pending' | 'resolved' | 'closed'

/** One row in the list — `TicketResource` shape, category always `incident`. */
export interface Incident {
  id: number
  user_id: number
  subject: string
  status: IncidentStatus
  order_id: number | null
  assigned_admin_id: number | null
  user: { id: number | string; name: string | null; role: string } | null
  messages_count: number | null
  last_message_at: string | null
  /** ISO 8601. */
  created_at: string | null
}

/** One message in an incident's thread. `attachment_url` carries the incident photo, if any. */
export interface ThreadMessage {
  id: number
  author: 'customer' | 'admin'
  body: string
  attachment_url: string | null
  created_at: string
}

/** `GET /admin/support/tickets/{id}` payload — the ticket plus its thread. */
export interface IncidentDetail extends Incident {
  thread: ThreadMessage[]
}

export interface IncidentsPage {
  items: Incident[]
  page: number
  per_page: number
  total: number
}

export interface IncidentsFilters {
  status: IncidentStatus | 'all'
}

export type IncidentsScreenStatus = 'loading' | 'ready' | 'error'
