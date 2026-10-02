import type { CategoryId } from './types'

export const categories: Record<CategoryId, { vi: string; en: string; color: string }> = {
  culture: { vi: 'Văn hóa', en: 'Culture', color: '#25399b' },
  food: { vi: 'Ẩm thực', en: 'Food', color: '#c2335d' },
  cafe: { vi: 'Cà phê', en: 'Cafés', color: '#a8642a' },
  nature: { vi: 'Thiên nhiên', en: 'Nature', color: '#2f8f6b' },
  beach: { vi: 'Biển', en: 'Beach', color: '#1fa6a0' },
  market: { vi: 'Chợ & phố', en: 'Markets', color: '#c98a12' },
  nightlife: { vi: 'Về đêm', en: 'Nightlife', color: '#7a63d4' },
  adventure: { vi: 'Phiêu lưu', en: 'Adventure', color: '#d96745' },
}

export const categoryIds = Object.keys(categories) as CategoryId[]

export const dietaryTags = [
  { id: 'seafood', vi: 'Hải sản', en: 'Seafood' },
  { id: 'peanut', vi: 'Đậu phộng', en: 'Peanuts' },
  { id: 'pork', vi: 'Thịt heo', en: 'Pork' },
  { id: 'beef', vi: 'Thịt bò', en: 'Beef' },
  { id: 'goat', vi: 'Thịt dê', en: 'Goat' },
] as const
