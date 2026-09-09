import { describe, it, expect } from 'vitest'
import {
  PHONE_RE,
  validateCook,
  validateUser,
  validateNotification,
  mergeServerErrors,
  type CookValues,
  type UserValues,
} from '../../src/components/quickActions/validate'

const cook: CookValues = {
  first_name: 'أحمد', last_name: 'محمد', email: 'a@b.com', phone: '+201001234567',
  password: 'secret12', store_name: 'مطبخ أحمد', city_id: '', area: '',
}
const user: UserValues = {
  first_name: 'سارة', last_name: 'علي', email: 's@x.com', phone: '+201001234567',
  password: 'password1', role: 'cook',
}

describe('PHONE_RE mirrors the server regex', () => {
  it('accepts intl form; rejects short / letters / leading 0-after-plus', () => {
    expect(PHONE_RE.test('+201234567')).toBe(true)
    expect(PHONE_RE.test('12345678')).toBe(true)
    expect(PHONE_RE.test('01001234567')).toBe(false) // leading 0 fails the server regex
    expect(PHONE_RE.test('123')).toBe(false)
    expect(PHONE_RE.test('+0123456789')).toBe(false)
    expect(PHONE_RE.test('01a34567')).toBe(false)
  })
})

describe('validateCook', () => {
  it('passes a valid form', () => {
    expect(validateCook(cook)).toEqual({})
  })
  it('flags every required field', () => {
    const e = validateCook({ ...cook, first_name: '', last_name: ' ', email: '', phone: '', password: '', store_name: '' })
    expect(Object.keys(e).sort()).toEqual(
      ['email', 'first_name', 'last_name', 'password', 'phone', 'store_name'].sort(),
    )
  })
  it('flags a bad email, a bad phone, and a short password', () => {
    const e = validateCook({ ...cook, email: 'nope', phone: '12', password: 'short' })
    expect(e.email).toBeTruthy()
    expect(e.phone).toBeTruthy()
    expect(e.password).toBeTruthy()
  })
  it('optional area over 255 is flagged; empty area is fine', () => {
    expect(validateCook({ ...cook, area: 'x'.repeat(256) }).area).toBeTruthy()
    expect(validateCook({ ...cook, area: '' }).area).toBeUndefined()
  })
})

describe('validateUser', () => {
  it('passes a valid form; rejects an unknown role', () => {
    expect(validateUser(user)).toEqual({})
    expect(validateUser({ ...user, role: 'wizard' }).role).toBeTruthy()
  })
})

describe('validateNotification', () => {
  it('requires title/body/audience and caps body at 2000', () => {
    expect(validateNotification({ title: '', body: '', audience: 'nope' })).toMatchObject({
      title: expect.any(String), body: expect.any(String), audience: expect.any(String),
    })
    expect(validateNotification({ title: 'x', body: 'y'.repeat(2001), audience: 'all' }).body).toBeTruthy()
    expect(validateNotification({ title: 'x', body: 'y', audience: 'cooks' })).toEqual({})
  })
})

describe('mergeServerErrors', () => {
  it('overlays a 422 errors map onto existing client errors', () => {
    const out = mergeServerErrors({ phone: 'client msg' }, { email: ['مستخدم بالفعل'], phone: ['من السيرفر'] })
    expect(out).toEqual({ phone: 'من السيرفر', email: 'مستخدم بالفعل' })
  })
  it('null map is a no-op', () => {
    expect(mergeServerErrors({ a: '1' }, null)).toEqual({ a: '1' })
  })
})
