import type { ReactNode } from 'react'
import { cityImage } from '../domain/cityMedia'
import { karstPath, type Peak } from './scenes/shapes'
import { cityById } from '../domain/pois'
import type { CityId } from '../domain/types'

const FAR: Peak[] = [[60, 90, 50], [170, 130, 62], [290, 100, 52], [380, 140, 58]]
const NEAR: Peak[] = [[20, 60, 40], [120, 84, 48], [230, 70, 44], [340, 96, 54]]

/** Destination backdrop: the photo when we have one, a drawn sunrise over limestone ridges when we do not. */
export function CityCover({ city, className = '', children, overlay = 'from-night/80 via-night/20 to-transparent' }: { city: CityId; className?: string; children?: ReactNode; overlay?: string }) {
  const src = cityImage[city]
  const tint = cityById[city].tint
  return (
    <div className={`relative isolate overflow-hidden ${className}`} style={{ background: tint }}>
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-10 size-full object-cover" />
      ) : (
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 -z-10 size-full" aria-hidden="true">
          <defs>
            <linearGradient id={`cover-${city}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1f5a4b" />
              <stop offset="0.55" stopColor="#d9a45a" />
              <stop offset="1" stopColor="#e9b46a" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={`url(#cover-${city})`} />
          <circle cx="292" cy="150" r="44" fill="#f7e7b8" opacity="0.9" />
          <path d={karstPath(400, 230, 300, FAR)} fill="#4f8c7b" opacity="0.85" />
          <path d={karstPath(400, 262, 300, NEAR)} fill="#173f35" />
        </svg>
      )}
      <div className={`absolute inset-0 -z-10 bg-gradient-to-t ${overlay}`} />
      {children}
    </div>
  )
}
