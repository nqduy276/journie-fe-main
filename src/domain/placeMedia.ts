import type { CSSProperties } from 'react'
import { cityImage } from './cityMedia'
import { hashString } from './conditions'
import type { CityId, Poi } from './types'

/**
 * Where a picture of a place comes from, best first:
 *  1. `src/assets/images/places/<poi-id>.jpg` – a real photo of that very place (drop a file in and it is used);
 *  2. the city's own photograph, framed differently for every place so a city's cards are not identical;
 *  3. a drawn illustration, only when there is no photograph of the city either.
 */
const placePhotos = import.meta.glob('../assets/images/places/*.{jpg,jpeg,png,webp,avif}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const byPoi: Record<string, string> = {}
for (const [path, url] of Object.entries(placePhotos)) {
  const stem = path.split('/').pop()!.replace(/\.[^.]+$/, '')
  byPoi[stem] = url
}

export type Media = { kind: 'photo' | 'city'; src: string; style: CSSProperties } | { kind: 'art' }

/** A seeded crop so one city photo can serve many places without them all looking the same. */
function frame(seed: string): CSSProperties {
  const h = hashString(seed)
  const x = 12 + (h % 77)
  const y = 18 + ((h >>> 7) % 58)
  const zoom = 1.12 + ((h >>> 14) % 34) / 100
  return { objectPosition: `${x}% ${y}%`, transform: `scale(${zoom.toFixed(2)})`, transformOrigin: `${x}% ${y}%` }
}

export function placeMedia(poi: Poi): Media {
  const own = byPoi[poi.id]
  if (own) return { kind: 'photo', src: own, style: {} }
  const city = cityImage[poi.city]
  if (city) return { kind: 'city', src: city, style: frame(poi.id) }
  return { kind: 'art' }
}

export function cityMedia(city: CityId): Media {
  const src = cityImage[city]
  return src ? { kind: 'photo', src, style: {} } : { kind: 'art' }
}
