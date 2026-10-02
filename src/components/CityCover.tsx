import type { ReactNode } from 'react'
import { cityImage } from '../domain/cityMedia'
import { cityById } from '../domain/pois'
import type { CityId } from '../domain/types'
import { CityArt } from './place/art/PlaceArt'

/** Destination backdrop: the photo when we have one, a drawn scene of the city when we do not. */
export function CityCover({ city, className = '', children, overlay = 'from-night/80 via-night/20 to-transparent' }: { city: CityId; className?: string; children?: ReactNode; overlay?: string }) {
  const src = cityImage[city]
  const tint = cityById[city].tint
  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ background: tint }}>
      {src ? <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-10 size-full object-cover" /> : <CityArt city={city} className="absolute inset-0 -z-10 size-full" />}
      <div className={`absolute inset-0 -z-10 bg-gradient-to-t ${overlay}`} />
      {children}
    </div>
  )
}
