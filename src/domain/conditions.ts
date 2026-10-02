import { cityById } from './pois'
import type { CityId, Weather } from './types'

/** Deterministic hash so the same city and day always report the same weather. */
export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const BASE_TEMP: Record<CityId, number> = {
  'ha-noi': 29,
  'ninh-binh': 29,
  'ha-long': 28,
  'ha-giang': 24,
  'hoi-an': 31,
  'sai-gon': 33,
  'phu-quoc': 31,
  'da-lat': 22,
}

/** Stand-in for the weather API in the "gather real-time data" step. */
export function weatherFor(city: CityId, date: string): Weather {
  const h = hashString(`${city}${date}`)
  const roll = h % 100
  const tempC = BASE_TEMP[city] + ((h >> 8) % 5) - 2
  if (roll < 14) return { condition: 'rain', tempC: tempC - 3, rainChance: 70 + (h % 25), note: ['Mưa rải rác, ưu tiên điểm trong nhà', 'Showers likely, indoor stops favoured'] }
  if (roll < 24) return { condition: 'storm', tempC: tempC - 4, rainChance: 85, note: ['Dông chiều, tránh điểm ngoài trời', 'Afternoon storms, avoid outdoor stops'] }
  if (roll < 54) return { condition: 'cloudy', tempC, rainChance: 20 + (h % 20), note: ['Nhiều mây, dễ chịu để đi bộ', 'Cloudy and comfortable for walking'] }
  return { condition: 'sunny', tempC: tempC + 1, rainChance: 5 + (h % 12), note: ['Nắng đẹp, nhớ mang nón và nước', 'Clear and sunny, bring a hat and water'] }
}

export const isRainy = (weather: Weather) => weather.condition === 'rain' || weather.condition === 'storm'

/** Congestion multiplier by hour (1 = free flow); rush hours bite in big cities. */
export function congestionAt(city: CityId, minutes: number): number {
  const hour = minutes / 60
  const rush = (hour >= 7 && hour <= 9) || (hour >= 16.5 && hour <= 19)
  const big = city === 'ha-noi' || city === 'sai-gon'
  return rush ? (big ? 1.5 : 1.2) : 1
}

export const cityName = (id: CityId) => cityById[id].name
