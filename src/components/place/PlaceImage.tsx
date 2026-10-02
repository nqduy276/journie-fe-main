import { placeMedia } from '../../domain/placeMedia'
import type { Poi } from '../../domain/types'
import { PlaceArt } from './art/PlaceArt'

/**
 * The picture for a place: a real photograph whenever one exists (of the place, else of its city) and the
 * drawn scene only when there is none. Fills its (relatively positioned) parent.
 */
export function PlaceImage({ poi, className = '' }: { poi: Poi; className?: string }) {
  const media = placeMedia(poi)
  if (media.kind === 'art') return <PlaceArt poi={poi} className={`absolute inset-0 size-full ${className}`} />
  return <img src={media.src} alt="" loading="lazy" decoding="async" style={media.style} className={`absolute inset-0 size-full object-cover saturate-[0.94] ${className}`} />
}
