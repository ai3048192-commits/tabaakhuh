import { describe, it, expect } from 'vitest'
import { validateNames } from '../../src/cities/cityValidation'
import { cityMessages as M } from '../../src/cities/messages'

describe('validateNames (FR-009 / FR-010 / FR-018 / FR-019)', () => {
  describe('add mode', () => {
    it('flags a blank Arabic name', () => {
      const e = validateNames({ name_ar: '', name_en: 'Cairo' }, 'add')
      expect(e.name_ar).toBe(M.nameRequired)
      expect(e.name_en).toBeUndefined()
    })

    it('flags a blank English name', () => {
      const e = validateNames({ name_ar: 'القاهرة', name_en: '' }, 'add')
      expect(e.name_en).toBe(M.nameRequired)
    })

    it('flags a whitespace-only field as required', () => {
      const e = validateNames({ name_ar: '   ', name_en: 'Cairo' }, 'add')
      expect(e.name_ar).toBe(M.nameRequired)
    })

    it('passes with both names present', () => {
      expect(validateNames({ name_ar: 'القاهرة', name_en: 'Cairo' }, 'add')).toEqual({})
    })

    it('a 255-char name passes; 256 is too long', () => {
      const long = 'x'.repeat(255)
      expect(validateNames({ name_ar: long, name_en: 'Cairo' }, 'add')).toEqual({})
      const tooLong = 'x'.repeat(256)
      expect(validateNames({ name_ar: tooLong, name_en: 'Cairo' }, 'add').name_ar).toBe(
        M.nameTooLong,
      )
    })
  })

  describe('edit mode', () => {
    const initial = { name_ar: 'القاهرة', name_en: 'Cairo' }

    it('flags a form-level error when neither name changed', () => {
      expect(validateNames(initial, 'edit', initial).form).toBe(M.atLeastOneName)
    })

    it('flags a form-level error when both fields are cleared', () => {
      expect(
        validateNames({ name_ar: '', name_en: '' }, 'edit', initial).form,
      ).toBe(M.atLeastOneName)
    })

    it('passes when only the Arabic name changed', () => {
      expect(
        validateNames({ name_ar: 'القاهره', name_en: 'Cairo' }, 'edit', initial),
      ).toEqual({})
    })

    it('passes when only the English name changed', () => {
      expect(
        validateNames({ name_ar: 'القاهرة', name_en: 'Kairo' }, 'edit', initial),
      ).toEqual({})
    })

    it('still enforces the 255-char limit', () => {
      expect(
        validateNames({ name_ar: 'x'.repeat(256), name_en: 'Cairo' }, 'edit', initial).name_ar,
      ).toBe(M.nameTooLong)
    })
  })
})
