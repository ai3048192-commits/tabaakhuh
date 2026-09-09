/**
 * Shared chrome strings for the review DocumentViewer (Arabic, RTL). Consumed by
 * both the cook-review and driver-review features. Feature-specific strings
 * (field labels, toasts, dialog copy) stay in each feature's own `messages.ts`.
 * Wording is provisional per spec Assumptions ("descriptive, not final copy").
 */
export const reviewMessages = {
  viewerClose: 'إغلاق',
  viewerPrev: 'المستند السابق',
  viewerNext: 'المستند التالي',
  viewerZoomIn: 'تكبير',
  viewerZoomOut: 'تصغير',
  viewerZoomReset: 'إعادة الحجم',
  docUnavailable: 'المستند غير متاح',
  openInNewTab: 'فتح في تبويب جديد',
  docContract: 'العقد الموقّع',
} as const

export type ReviewMessages = typeof reviewMessages
