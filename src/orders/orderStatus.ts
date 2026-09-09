import {
  Clock,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  UserCheck,
  PackageOpen,
  Truck,
  MapPin,
  BadgeCheck,
  XCircle,
  ClipboardList,
  Receipt,
  Package,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { OrderStatus } from './types'
import { orderMessages } from './messages'

/** The 12 order statuses, in spec order. */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'assigned_to_driver',
  'picked_up',
  'on_the_way',
  'delivered',
  'completed',
  'cancelled',
  'pending_review',
  'quoted',
]

/** Arabic label for a status. */
export function statusLabel(s: OrderStatus): string {
  return orderMessages.statusLabels[s]
}

/** Whether an order was cancelled. */
export function isCancelled(s: OrderStatus): boolean {
  return s === 'cancelled'
}

/** Icon per status. Access directly (`STATUS_ICONS[s]`) so it reads as a lookup, not a call. */
export const STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
  pending: Clock,
  accepted: CheckCircle2,
  preparing: ChefHat,
  ready_for_pickup: PackageCheck,
  assigned_to_driver: UserCheck,
  picked_up: PackageOpen,
  on_the_way: Truck,
  delivered: MapPin,
  completed: BadgeCheck,
  cancelled: XCircle,
  pending_review: ClipboardList,
  quoted: Receipt,
}

/** Arabic label for the order type. */
export function typeLabel(t: 'regular' | 'custom'): string {
  return t === 'custom' ? orderMessages.typeCustom : orderMessages.typeRegular
}

/** Icon per order type. Access directly (`TYPE_ICONS[t]`). */
export const TYPE_ICONS: Record<'regular' | 'custom', LucideIcon> = {
  regular: Package,
  custom: Sparkles,
}
