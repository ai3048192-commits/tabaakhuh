/** Pure pagination helpers. */

/** Number of pages for `total` rows at `perPage` per page. `perPage <= 0` → 1. */
export function totalPages(total: number, perPage: number): number {
  if (perPage <= 0) return 1
  return Math.max(1, Math.ceil(total / perPage))
}

/** Clamp `page` into `[1, pages]`, flooring a fractional input. */
export function clampPage(page: number, pages: number): number {
  const hi = Math.max(1, pages)
  return Math.min(Math.max(1, Math.floor(page)), hi)
}
