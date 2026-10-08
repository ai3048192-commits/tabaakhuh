/**
 * Food categories — specs/067-food-categories (`/admin/food-categories`).
 * The customer app browses dishes by these; a cook files each dish under one.
 */
export interface FoodCategory {
  id: number
  name_ar: string
  name_en: string
  image_url: string | null
  sort_order: number
  is_active: boolean
  /** Dishes filed under it (active or not). */
  dishes_count: number
}

/** `POST` needs both names; `PUT` takes any subset. `image_url: null` clears it. */
export interface FoodCategoryInput {
  name_ar?: string
  name_en?: string
  image_url?: string | null
  sort_order?: number
}
