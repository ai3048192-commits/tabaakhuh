/**
 * User-facing auth strings (Arabic, RTL). Wording is provisional per spec
 * Assumptions ("descriptive, not final copy").
 */
export const messages = {
  /** FR-007 / SC-006 — one generic message, no per-field disclosure. */
  credentialError: 'بيانات الدخول غير صحيحة.',
  /** FR-008 — no counters or exact limits. */
  rateLimited: 'حاولت مرات كتير. استنى شوية وجرّب تاني.',
  /** FR-005 / FR-015 — valid credentials but not an admin account. */
  notPermitted: 'هذا الحساب غير مسموح له باستخدام لوحة التحكم.',
  /** FR-010 / FR-024 — unexpected server error. */
  serverError: 'حصل خطأ غير متوقع. حاول تاني.',
  /** FR-010 — connectivity failure. */
  networkError: 'في مشكلة في الاتصال. اتأكد من الإنترنت وحاول تاني.',
  /** FR-003 — empty field. */
  identifierRequired: 'اكتب البريد الإلكتروني أو رقم الهاتف.',
  passwordRequired: 'اكتب كلمة المرور.',
} as const

export type MessageKey = keyof typeof messages
