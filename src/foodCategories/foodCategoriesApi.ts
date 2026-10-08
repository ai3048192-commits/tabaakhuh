import { authedRequest } from '../api/httpClient'
import type { FoodCategory, FoodCategoryInput } from './types'

/** `GET /admin/food-categories` — shown and hidden, in display order. */
export function listFoodCategories(signal?: AbortSignal): Promise<FoodCategory[]> {
  return authedRequest<FoodCategory[]>('/admin/food-categories', { signal })
}

/** `POST /admin/food-categories` → the created category (`201`). */
export function createFoodCategory(input: FoodCategoryInput): Promise<FoodCategory> {
  return authedRequest<FoodCategory>('/admin/food-categories', { method: 'POST', body: input })
}

/** `PUT /admin/food-categories/{id}` — partial. */
export function updateFoodCategory(id: number, input: FoodCategoryInput): Promise<FoodCategory> {
  return authedRequest<FoodCategory>(`/admin/food-categories/${id}`, { method: 'PUT', body: input })
}

/** `PATCH /admin/food-categories/{id}/status`, body `{ is_active }`. */
export function setFoodCategoryStatus(id: number, is_active: boolean): Promise<FoodCategory> {
  return authedRequest<FoodCategory>(`/admin/food-categories/${id}/status`, { method: 'PATCH', body: { is_active } })
}

/** `DELETE /admin/food-categories/{id}` — its dishes become uncategorized. */
export function deleteFoodCategory(id: number): Promise<null> {
  return authedRequest<null>(`/admin/food-categories/${id}`, { method: 'DELETE' })
}
