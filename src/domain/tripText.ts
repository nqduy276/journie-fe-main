import type { Language } from '../types/i18n'
import type { Trip } from './types'

/**
 * The three sample trips are stored in Vietnamese. Show them in the page language until the traveler renames
 * them or writes their own; anything a person typed or generated is shown as it is.
 */
const SAMPLES: Record<string, { title: [string, string]; request: [string, string] }> = {
  't-demo-live': { title: ['Sài Gòn một ngày trọn vẹn', 'A whole day in Saigon'], request: ['Một ngày ở Sài Gòn, thích bảo tàng, ăn ngon và cà phê, đi xe máy.', 'One day in Saigon: museums, good food and coffee, by motorbike.'] },
  't-demo-upcoming': { title: ['Hội An chậm rãi · 3 ngày', 'Slow Hoi An · 3 days'], request: ['Ba ngày ở Hội An, đi thật chậm, ăn ngon, ngân sách 4 triệu.', 'Three days in Hoi An, very slow, good food, a 4 million budget.'] },
  't-demo-done': { title: ['Hà Nội hai ngày', 'Two days in Hanoi'], request: ['Hai ngày Hà Nội, văn hóa và ẩm thực.', 'Two days in Hanoi: culture and food.'] },
}

export function tripTitle(trip: Pick<Trip, 'id' | 'title'>, language: Language): string {
  const sample = SAMPLES[trip.id]
  return language === 'en' && sample && trip.title === sample.title[0] ? sample.title[1] : trip.title
}

export function tripRequest(trip: Pick<Trip, 'id' | 'request'>, language: Language): string {
  const sample = SAMPLES[trip.id]
  return language === 'en' && sample && trip.request === sample.request[0] ? sample.request[1] : trip.request
}
