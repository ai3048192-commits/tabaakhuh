import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/envelope'
import {
  createFoodCategory,
  deleteFoodCategory,
  listFoodCategories,
  setFoodCategoryStatus,
  updateFoodCategory,
} from './foodCategoriesApi'
import type { FoodCategory, FoodCategoryInput } from './types'

export type LoadStatus = 'loading' | 'ready' | 'error'

/** `null` on success, otherwise a message to show next to the form/action. */
export type MutationResult = string | null

const sortCategories = (list: FoodCategory[]) =>
  [...list].sort((a, b) => a.sort_order - b.sort_order || a.name_ar.localeCompare(b.name_ar, 'ar'))

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const first = Object.values(err.fieldErrors ?? {})[0]?.[0]
    if (first) return first
    if (err.status === 422 || err.status === 404) return err.message
  }
  return 'تعذّر الحفظ. تأكد من الاتصال وحاول مرة أخرى.'
}

/**
 * Loads the food categories once and keeps the list in step with every
 * create / edit / show-hide / delete (the server's echoed row replaces the
 * local one, so no refetch is needed).
 */
export function useFoodCategories() {
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [items, setItems] = useState<FoodCategory[]>([])

  const load = useCallback((signal?: AbortSignal) => {
    setStatus('loading')
    listFoodCategories(signal)
      .then((list) => {
        setItems(sortCategories(list))
        setStatus('ready')
      })
      .catch((err) => {
        if ((err as Error)?.name === 'AbortError') return
        setStatus('error')
      })
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  const upsert = (row: FoodCategory) =>
    setItems((list) => sortCategories([...list.filter((c) => c.id !== row.id), row]))

  const save = useCallback(async (id: number | null, input: FoodCategoryInput): Promise<MutationResult> => {
    try {
      const row = id === null ? await createFoodCategory(input) : await updateFoodCategory(id, input)
      // The save endpoints don't count dishes; keep the count we had.
      upsert({ ...row, dishes_count: row.dishes_count ?? items.find((c) => c.id === row.id)?.dishes_count ?? 0 })
      return null
    } catch (err) {
      return errorText(err)
    }
  }, [items])

  const setActive = useCallback(async (category: FoodCategory, isActive: boolean): Promise<MutationResult> => {
    try {
      const row = await setFoodCategoryStatus(category.id, isActive)
      upsert({ ...row, dishes_count: category.dishes_count })
      return null
    } catch (err) {
      return errorText(err)
    }
  }, [])

  const remove = useCallback(async (category: FoodCategory): Promise<MutationResult> => {
    try {
      await deleteFoodCategory(category.id)
      setItems((list) => list.filter((c) => c.id !== category.id))
      return null
    } catch (err) {
      return errorText(err)
    }
  }, [])

  return { status, items, reload: () => load(), save, setActive, remove }
}
