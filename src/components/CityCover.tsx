import type { ReactNode } from 'react'
import { cityImage } from '../domain/cityMedia'
import { cityById } from '../domain/pois'
import type { CityId } from '../domain/types'

/** Destination backdrop: the photo when we have one, a tinted khatam lattice when we do not. */
export function CityCover({ city, className = '', children, overlay = 'from-night/80 via-night/20 to-transparent' }: { city: CityId; className?: string; children?: ReactNode; overlay?: string }) {
  const src = cityImage[city]
  const tint = cityById[city].tint
  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ background: tint }}>
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-10 size-full object-cover" />
      ) : (
        <>
          <div className="girih-gold absolute inset-0 -z-10 opacity-90" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_20%,rgba(246,203,90,0.28),transparent_60%)]" />
        </>
      )}
      <div className={`absolute inset-0 -z-10 bg-gradient-to-t ${overlay}`} />
      {children}
    </div>
  )
}
