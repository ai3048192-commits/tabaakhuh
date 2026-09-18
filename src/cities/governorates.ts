/**
 * The 27 Egyptian governorates, Arabic + English, in the platform's display
 * order (the order the admin sees them in the picker list).
 *
 * This is a static catalogue, not API data: `GET /admin/cities` returns only
 * the cities already on the platform, so the picker needs a source for the ones
 * that have never been added. Entries are matched to live cities by name
 * (`matchKey` below), never by id.
 */
export interface Governorate {
  name_ar: string
  name_en: string
}

export const GOVERNORATES: readonly Governorate[] = [
  { name_ar: 'القاهرة', name_en: 'Cairo' },
  { name_ar: 'الجيزة', name_en: 'Giza' },
  { name_ar: 'الإسكندرية', name_en: 'Alexandria' },
  { name_ar: 'القليوبية', name_en: 'Qalyubia' },
  { name_ar: 'الشرقية', name_en: 'Sharqia' },
  { name_ar: 'الدقهلية', name_en: 'Dakahlia' },
  { name_ar: 'الغربية', name_en: 'Gharbia' },
  { name_ar: 'المنوفية', name_en: 'Monufia' },
  { name_ar: 'البحيرة', name_en: 'Beheira' },
  { name_ar: 'كفر الشيخ', name_en: 'Kafr El Sheikh' },
  { name_ar: 'دمياط', name_en: 'Damietta' },
  { name_ar: 'بورسعيد', name_en: 'Port Said' },
  { name_ar: 'الإسماعيلية', name_en: 'Ismailia' },
  { name_ar: 'السويس', name_en: 'Suez' },
  { name_ar: 'شمال سيناء', name_en: 'North Sinai' },
  { name_ar: 'جنوب سيناء', name_en: 'South Sinai' },
  { name_ar: 'الفيوم', name_en: 'Fayoum' },
  { name_ar: 'بني سويف', name_en: 'Beni Suef' },
  { name_ar: 'المنيا', name_en: 'Minya' },
  { name_ar: 'أسيوط', name_en: 'Asyut' },
  { name_ar: 'سوهاج', name_en: 'Sohag' },
  { name_ar: 'قنا', name_en: 'Qena' },
  { name_ar: 'الأقصر', name_en: 'Luxor' },
  { name_ar: 'أسوان', name_en: 'Aswan' },
  { name_ar: 'البحر الأحمر', name_en: 'Red Sea' },
  { name_ar: 'الوادي الجديد', name_en: 'New Valley' },
  { name_ar: 'مطروح', name_en: 'Matrouh' },
]

/** Arabic presentation forms that differ only cosmetically between sources. */
const NORMALISE = /[أإآ]/g

/**
 * The key a catalogue entry and a live city are matched on: the English name,
 * case- and space-insensitive, falling back to the Arabic name with alef forms
 * folded. Two rows with the same key are the same governorate.
 */
export function matchKey(entry: { name_ar: string; name_en: string }): string {
  const en = entry.name_en.trim().toLowerCase().replace(/\s+/g, ' ')
  if (en !== '') return `en:${en}`
  return `ar:${entry.name_ar.trim().replace(NORMALISE, 'ا')}`
}
