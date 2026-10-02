import { categories } from '../domain/categories'
import { hashString } from '../domain/conditions'
import { haversineKm } from '../domain/geo'
import { normalize, poiById, pois } from '../domain/pois'
import type { CategoryId, CityId, Poi } from '../domain/types'
import { latency } from './http'

export type PriceTier = 'free' | 'low' | 'mid' | 'high'

export type SearchParams = {
  query: string
  cities: CityId[]
  categories: CategoryId[]
  prices: PriceTier[]
  minRating: number
  indoorOnly: boolean
  openAt?: number
  sort: 'relevance' | 'rating' | 'price' | 'distance'
}

export type SearchHit = { poi: Poi; distanceKm?: number; anchor?: Poi; score: number }

export const tierOf = (cost: number): PriceTier => (cost === 0 ? 'free' : cost < 100_000 ? 'low' : cost < 300_000 ? 'mid' : 'high')

const NEAR = /\b(gan|quanh|canh|near|around|nearby)\b\s*(.*)$/

/**
 * Keyword + contextual search (report §1.3.1): "cà phê gần Chùa Cầu" splits into the thing wanted
 * and the place it should be near, then ranks by distance from that anchor.
 */
export function searchPois(params: SearchParams): SearchHit[] {
  const q = normalize(params.query).trim()
  const near = q.match(NEAR)
  const wanted = (near ? q.slice(0, near.index) : q).trim()
  const anchorText = near?.[2]?.trim()
  const anchor = anchorText
    ? pois.find((poi) => normalize(poi.name).includes(anchorText) || normalize(poi.area).includes(anchorText))
    : undefined
  const tokens = wanted.split(/\s+/).filter((token) => token.length > 1)

  const hits: SearchHit[] = []
  for (const poi of pois) {
    if (params.cities.length && !params.cities.includes(poi.city)) continue
    if (params.categories.length && !params.categories.includes(poi.cat)) continue
    if (params.prices.length && !params.prices.includes(tierOf(poi.cost))) continue
    if (poi.rating < params.minRating) continue
    if (params.indoorOnly && !poi.indoor) continue
    if (params.openAt !== undefined && !(poi.open <= params.openAt && params.openAt < poi.close)) continue

    const haystack = normalize(`${poi.name} ${poi.area} ${poi.tags.join(' ')} ${poi.blurb[0]} ${categories[poi.cat].vi} ${categories[poi.cat].en} ${poi.blurb[1]}`)
    let score = poi.pop / 100 + poi.rating / 10
    if (tokens.length) {
      const matched = tokens.filter((token) => haystack.includes(token)).length
      if (!matched) continue
      score += matched * 2 + (normalize(poi.name).includes(wanted) ? 3 : 0)
    }
    let distanceKm: number | undefined
    if (anchor) {
      distanceKm = haversineKm(poi, anchor)
      if (poi.id === anchor.id || distanceKm > 4) continue
      score += 3 - distanceKm
    }
    hits.push({ poi, distanceKm, anchor, score })
  }

  const sorters: Record<SearchParams['sort'], (a: SearchHit, b: SearchHit) => number> = {
    relevance: (a, b) => b.score - a.score,
    rating: (a, b) => b.poi.rating - a.poi.rating || b.poi.pop - a.poi.pop,
    price: (a, b) => a.poi.cost - b.poi.cost,
    distance: (a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99),
  }
  return hits.sort(sorters[anchor && params.sort === 'relevance' ? 'distance' : params.sort])
}

export const querySearch = (params: SearchParams) => latency(() => searchPois(params), 140, 320)

/* ───────── reviews (deterministic stand-ins for the RAG review store) ───────── */

export type Review = { id: string; author: string; rating: number; vi: string; en: string; daysAgo: number }

const AUTHORS = ['Minh Anh', 'Thu Hà', 'Quốc Bảo', 'Lan Phương', 'Tuấn Kiệt', 'Mai Linh', 'Đức Huy', 'Ngọc Trâm', 'Alex T.', 'Sophie L.']

const SNIPPETS: Record<CategoryId, [string, string][]> = {
  culture: [['Rất đáng ghé, nên đến sớm cho đỡ đông.', 'Well worth it; go early to beat the crowds.'], ['Có nhiều chuyện hay để nghe, đi cùng hướng dẫn viên thì tuyệt.', 'Lots of stories here; a guide makes it.'], ['Kiến trúc đẹp, chụp ảnh thích mắt.', 'Beautiful architecture and great for photos.']],
  food: [['Món ngon, giá hợp lý, phục vụ nhanh.', 'Tasty, fairly priced and quick service.'], ['Giờ cao điểm hơi đông nhưng đáng chờ.', 'Busy at peak hours but worth the wait.'], ['Hương vị đậm đà đúng kiểu địa phương.', 'Properly local flavours.']],
  cafe: [['Không gian dễ chịu, ngồi làm việc cũng được.', 'Pleasant space, fine for working too.'], ['Cà phê thơm, view đẹp lúc chiều.', 'Great coffee and an afternoon view.'], ['Nhạc nhẹ, nhân viên thân thiện.', 'Soft music and friendly staff.']],
  nature: [['Phong cảnh ngoạn mục, nhớ mang nón và nước.', 'Stunning scenery; bring a hat and water.'], ['Đi buổi sáng sớm thì mát và vắng.', 'Early morning is cool and quiet.'], ['Hơi xa nhưng hoàn toàn xứng đáng.', 'A bit far but completely worth it.']],
  beach: [['Biển sạch, nước trong, buổi sáng rất yên.', 'Clean, clear water and calm mornings.'], ['Có chỗ để ngả lưng và quán gần đó.', 'Spots to lounge and eateries nearby.'], ['Chiều tắm biển là hợp nhất.', 'Late afternoon swims are best.']],
  market: [['Nhộn nhịp, nhiều món ăn vặt, nhớ mặc cả.', 'Lively with lots of snacks; do haggle.'], ['Đi tối mát hơn và đông vui hơn.', 'Cooler and livelier in the evening.'], ['Đồ lưu niệm đa dạng, giá ổn.', 'Plenty of souvenirs at fair prices.']],
  nightlife: [['Lên đèn lúc hoàng hôn là đẹp nhất.', 'Best as the lights come on at dusk.'], ['Không khí sôi động nhưng không quá ồn.', 'Lively but not too loud.'], ['Đáng đi một lần để cảm nhận thành phố về đêm.', 'Worth one visit to feel the city at night.']],
  adventure: [['Trải nghiệm thú vị, kiểm tra thời tiết trước khi đi.', 'Great fun; check the weather first.'], ['Có hơi mệt nhưng cảnh trên cao quá đã.', 'Tiring, but the view is worth it.'], ['Nên mang giày thoải mái.', 'Wear comfortable shoes.']],
}

export function reviewsFor(poiId: string): Review[] {
  const poi = poiById[poiId]
  if (!poi) return []
  const h = hashString(poiId)
  return Array.from({ length: 4 }, (_, i) => {
    const snippet = SNIPPETS[poi.cat][(h + i) % 3]
    const wobble = (((h >> (i * 3)) & 7) - 3) / 6
    return {
      id: `${poiId}-${i}`,
      author: AUTHORS[(h + i * 3) % AUTHORS.length],
      rating: Math.max(3, Math.min(5, Math.round((poi.rating + wobble) * 2) / 2)),
      vi: snippet[0],
      en: snippet[1],
      daysAgo: 6 + ((h >> (i * 2)) % 70),
    }
  })
}

export const getReviews = (poiId: string) => latency(() => reviewsFor(poiId), 180, 380)

export function ratingHistogram(poi: Poi): number[] {
  const mean = poi.rating
  const raw = [5, 4, 3, 2, 1].map((star) => Math.exp(-((star - Math.min(4.9, mean + 0.3)) ** 2) / 0.9))
  const sum = raw.reduce((a, b) => a + b, 0)
  return raw.map((value) => value / sum)
}
