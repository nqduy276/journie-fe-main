import type { City, TransportPref, TravelMode } from './types'

type LatLng = { lat: number; lng: number }

const EARTH_KM = 6371
const rad = (deg: number) => (deg * Math.PI) / 180

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

/** Straight-line distance is stretched to approximate road distance. */
const ROAD_FACTOR = 1.32

export type Leg = { km: number; min: number; cost: number; mode: TravelMode }

/**
 * Stand-in for the OSRM Table service: a travel-time estimate between two POIs.
 * `congestion` (1 = free flow) stretches motor travel when the monitor reports traffic.
 */
export function travelLeg(a: LatLng, b: LatLng, pref: TransportPref, city: City, congestion = 1): Leg {
  const km = haversineKm(a, b) * ROAD_FACTOR
  const walkable = km <= (pref === 'walk' ? 2.2 : 1.1)
  const mode: TravelMode = walkable ? 'walk' : pref === 'taxi' ? 'taxi' : 'bike'

  if (mode === 'walk') {
    return { km, min: Math.max(1, Math.ceil((km / 4.6) * 60)), cost: 0, mode }
  }

  const speed = city.roadKmh * (mode === 'bike' ? 1 : 0.88)
  const min = Math.ceil((km / speed) * 60 * congestion) + 4
  const cost = mode === 'bike' ? Math.max(12_000, km * 6_500) : 14_000 + km * 13_500
  return { km, min, cost: Math.round(cost / 1000) * 1000, mode }
}

export const modeLabel: Record<TravelMode, [string, string]> = {
  walk: ['Đi bộ', 'Walk'],
  bike: ['Xe máy / Grab bike', 'Motorbike'],
  taxi: ['Taxi / Grab car', 'Taxi'],
}

/** Equirectangular projection into a [0,1] box for hand-drawn maps. */
export function project(point: LatLng, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  return {
    x: (point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng),
    y: (bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat),
  }
}
