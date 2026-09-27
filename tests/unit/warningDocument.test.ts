import { describe, it, expect } from 'vitest'
import { buildWarningDocument, escapeHtml, type WarningInput } from '../../src/warnings/warningDocument'
import { GENERAL_POLICIES, ROLE_POLICIES, LEVEL_CLOSING } from '../../src/warnings/policies'

// 2026-09-25 09:05 in Cairo (UTC+3 in September).
const ISSUED = new Date('2026-09-25T06:05:00Z')

function input(overrides: Partial<WarningInput> = {}): WarningInput {
  return {
    recipient: {
      id: 42,
      first_name: 'سارة',
      last_name: 'أحمد',
      phone: '01012345678',
      email: 'sara@test.com',
      role: 'cook',
    },
    level: 'first',
    violation: 'مخالفة معايير النظافة وسلامة الغذاء',
    details: '',
    issuedAt: ISSUED,
    issuerName: 'Site Admin',
    logoUrl: 'https://admin.example.com/assets/logo.png',
    ...overrides,
  }
}

describe('buildWarningDocument', () => {
  it('titles the letter after the level, the person and the Cairo date — the PDF file name', () => {
    const doc = buildWarningDocument(input())
    expect(doc.title).toBe('إنذار أول - سارة أحمد - 2026-09-25')
    expect(doc.html).toContain('<title>إنذار أول - سارة أحمد - 2026-09-25</title>')
  })

  it('gives each letter a traceable reference', () => {
    expect(buildWarningDocument(input()).reference).toBe('TBK-W-42-20260925-0905')
  })

  it('addresses the recipient and states the violation', () => {
    const { html } = buildWarningDocument(input({ details: 'طلب رقم 1234' }))
    expect(html).toContain('سارة أحمد')
    expect(html).toContain('01012345678')
    expect(html).toContain('مخالفة معايير النظافة وسلامة الغذاء')
    expect(html).toContain('طلب رقم 1234')
  })

  it('leaves the details line out when there are none', () => {
    expect(buildWarningDocument(input()).html).not.toContain('التفاصيل:</b>')
  })

  it('includes the general policies plus only the policies for the recipient role', () => {
    const cook = buildWarningDocument(input()).html
    for (const p of [...GENERAL_POLICIES, ...ROLE_POLICIES.cook]) expect(cook).toContain(p)
    for (const p of ROLE_POLICIES.driver) expect(cook).not.toContain(p)

    const driver = buildWarningDocument(
      input({ recipient: { ...input().recipient, role: 'driver' } }),
    ).html
    for (const p of ROLE_POLICIES.driver) expect(driver).toContain(p)
    for (const p of ROLE_POLICIES.cook) expect(driver).not.toContain(p)
  })

  it('escalates the wording with the level', () => {
    const final = buildWarningDocument(input({ level: 'final' }))
    expect(final.title.startsWith('إنذار نهائي')).toBe(true)
    expect(final.html).toContain(LEVEL_CLOSING.final)
    expect(final.html).not.toContain(LEVEL_CLOSING.first)
  })

  it('escapes names and free text — they come from the API and the form', () => {
    const { html } = buildWarningDocument(
      input({
        recipient: { ...input().recipient, first_name: '<script>alert(1)</script>', last_name: '<img src=x onerror=alert(2)>' },
        details: '"><iframe src=javascript:alert(3)>',
      }),
    )
    expect(html).not.toContain('<script>alert(1)')
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<iframe')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('strips characters no file system accepts from the file name', () => {
    const doc = buildWarningDocument(
      input({ recipient: { ...input().recipient, first_name: 'a/b', last_name: 'c:d*?' } }),
    )
    expect(doc.title).toBe('إنذار أول - a b c d - 2026-09-25')
  })

  it('escapeHtml covers every character that can break out of text or an attribute', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
  })
})
