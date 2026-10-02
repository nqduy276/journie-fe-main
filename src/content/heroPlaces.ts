import haGiangImage from '../assets/images/ha-giang.jpg'
import haLongImage from '../assets/images/ha-long.jpg'
import hoiAnImage from '../assets/images/hoi-an.jpg'
import ninhBinhImage from '../assets/images/ninh-binh.jpg'
import phuQuocImage from '../assets/images/phu-quoc.jpg'
import saiGonImage from '../assets/images/ho-chi-minh-city.jpg'
import type { CityId } from '../domain/types'

/** A destination whose photograph can stand behind Di on the sign-in pages and in the landing hero. */
export type HeroPlace = {
  id: CityId
  image: string
  lat: number
  lng: number
  name: [vi: string, en: string]
  alt: [vi: string, en: string]
  /** Where to centre the photograph when it is cropped into the arch. */
  focus: string
  /** Whether there is open water in the picture (a koi may leap in it). */
  water: boolean
  /** The little weather card on the landing hero. */
  temp: number
  note: [vi: string, en: string]
}

export const HERO_PLACES: HeroPlace[] = [
  { id: 'ninh-binh', image: ninhBinhImage, lat: 20.2506, lng: 105.9745, name: ['Tràng An, Ninh Bình', 'Trang An, Ninh Binh'], alt: ['Du khách chèo thuyền giữa núi đá vôi và sông nước Tràng An, Ninh Bình', 'Travelers rowing among limestone mountains and waterways in Trang An, Ninh Binh'], focus: '50% 50%', water: true, temp: 26, note: ['Đẹp trời để đi thuyền', 'Great weather for a boat ride'] },
  { id: 'ha-long', image: haLongImage, lat: 20.9101, lng: 107.1839, name: ['Vịnh Hạ Long, Quảng Ninh', 'Ha Long Bay, Quang Ninh'], alt: ['Những hòn đảo đá vôi và thuyền du lịch trên vịnh Hạ Long', 'Limestone islands and cruise boats on Ha Long Bay'], focus: '55% 50%', water: true, temp: 24, note: ['Biển lặng, hợp đi du thuyền', 'Calm water, good for a cruise'] },
  { id: 'ha-giang', image: haGiangImage, lat: 22.8233, lng: 104.9836, name: ['Hạ Thành, Hà Giang', 'Ha Thanh, Ha Giang'], alt: ['Ruộng bậc thang xanh mướt và núi mờ sương ở Hà Giang', 'Green rice terraces and misty hills in Ha Giang'], focus: '45% 50%', water: false, temp: 22, note: ['Mây thấp, hợp săn mây', 'Low clouds, good for chasing them'] },
  { id: 'hoi-an', image: hoiAnImage, lat: 15.8801, lng: 108.338, name: ['Phố cổ Hội An, Quảng Nam', 'Hoi An Ancient Town, Quang Nam'], alt: ['Những dãy nhà vàng và đèn lồng trong phố cổ Hội An', 'Yellow merchant houses and lanterns in Hoi An Ancient Town'], focus: '38% 50%', water: false, temp: 27, note: ['Nắng dịu, hợp dạo phố cổ', 'Soft sun for an old-town stroll'] },
  { id: 'sai-gon', image: saiGonImage, lat: 10.7769, lng: 106.7009, name: ['Sông Sài Gòn, TP.HCM', 'Saigon River, Ho Chi Minh City'], alt: ['Trung tâm Thành phố Hồ Chí Minh nhìn từ sông Sài Gòn', 'Central Ho Chi Minh City viewed from the Saigon River'], focus: '30% 50%', water: true, temp: 29, note: ['Trời thoáng, hợp ngắm thành phố', 'Clear skies for the city view'] },
  { id: 'phu-quoc', image: phuQuocImage, lat: 10.19, lng: 104.0, name: ['Bãi biển Phú Quốc, Kiên Giang', 'Phu Quoc Beach, Kien Giang'], alt: ['Bãi biển cát vàng và hàng dừa ở Phú Quốc', 'A golden beach lined with coconut palms on Phu Quoc'], focus: '60% 50%', water: true, temp: 29, note: ['Biển xanh, hợp tắm biển', 'Blue sea, good for a swim'] },
]

const LAST_KEY = 'journie-hero-last'
let chosen: HeroPlace | null = null

/**
 * The destination for this visit. It is picked at random once per page load (so the landing page and the sign-in
 * pages agree while you move between them) and never the one shown on the previous load.
 */
export function heroPlace(): HeroPlace {
  if (chosen) return chosen
  let last: string | null = null
  try {
    last = localStorage.getItem(LAST_KEY)
  } catch {
    last = null
  }
  const pool = HERO_PLACES.filter((place) => place.id !== last)
  chosen = pool[Math.floor(Math.random() * pool.length)]
  try {
    localStorage.setItem(LAST_KEY, chosen.id)
  } catch {
    // private mode: the choice just is not remembered
  }
  return chosen
}

export const formatCoords = (place: Pick<HeroPlace, 'lat' | 'lng'>) => `${place.lat.toFixed(4)}° N, ${place.lng.toFixed(4)}° E`
