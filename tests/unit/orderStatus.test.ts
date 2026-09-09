import { describe, it, expect } from 'vitest'
import {
  ORDER_STATUSES,
  statusLabel,
  isCancelled,
  STATUS_ICONS,
  typeLabel,
  TYPE_ICONS,
} from '../../src/orders/orderStatus'

describe('orderStatus (FR-004, FR-011)', () => {
  it('ORDER_STATUSES is the 12 values in spec order', () => {
    expect([...ORDER_STATUSES]).toEqual([
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
    ])
  })

  it('statusLabel returns a non-empty string for every status', () => {
    for (const s of ORDER_STATUSES) {
      expect(typeof statusLabel(s)).toBe('string')
      expect(statusLabel(s).length).toBeGreaterThan(0)
    }
  })

  it('STATUS_ICONS has an icon for every status', () => {
    for (const s of ORDER_STATUSES) {
      expect(STATUS_ICONS[s]).toBeTruthy()
    }
  })

  it('isCancelled is true only for cancelled', () => {
    for (const s of ORDER_STATUSES) {
      expect(isCancelled(s)).toBe(s === 'cancelled')
    }
  })

  it('typeLabel is non-empty and distinct for regular vs custom', () => {
    expect(typeLabel('regular').length).toBeGreaterThan(0)
    expect(typeLabel('custom').length).toBeGreaterThan(0)
    expect(typeLabel('regular')).not.toBe(typeLabel('custom'))
    expect(TYPE_ICONS.regular).not.toBe(TYPE_ICONS.custom)
  })
})
