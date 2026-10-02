export type CategoryId =
  | 'culture'
  | 'food'
  | 'cafe'
  | 'nature'
  | 'beach'
  | 'market'
  | 'nightlife'
  | 'adventure'

export type CityId = 'ha-noi' | 'ninh-binh' | 'ha-long' | 'ha-giang' | 'hoi-an' | 'sai-gon' | 'phu-quoc' | 'da-lat'

export type Interests = Partial<Record<CategoryId, number>>

export type TravelMode = 'walk' | 'bike' | 'taxi'
export type TransportPref = 'walk' | 'bike' | 'taxi'
export type Pace = 'slow' | 'balanced' | 'fast'

/** A point of interest. Times are minutes after midnight, costs in VND. */
export type Poi = {
  id: string
  city: CityId
  name: string
  cat: CategoryId
  lat: number
  lng: number
  open: number
  close: number
  visit: number
  cost: number
  rating: number
  pop: number
  indoor: boolean
  tags: string[]
  area: string
  blurb: [vi: string, en: string]
  url: string
}

export type City = {
  id: CityId
  name: string
  nameEn: string
  lat: number
  lng: number
  /** Typical road speed (km/h) before congestion, to reflect terrain. */
  roadKmh: number
  /** Radius (km) in which a POI counts as "central" for geographic suitability. */
  radiusKm: number
  tagline: [vi: string, en: string]
  tint: string
}

export type Stop = {
  uid: string
  poiId: string
  /** When the visit starts and ends (minutes after midnight). */
  start: number
  end: number
  visit: number
  /** Leg from the previous stop of the day. */
  travelMin: number
  travelKm: number
  travelCost: number
  mode: TravelMode
  /** Minutes spent waiting for the venue to open. */
  wait: number
  locked: boolean
}

export type Day = {
  index: number
  stops: Stop[]
}

export type SolverStatus = 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE'

export type SolverMeta = {
  status: SolverStatus
  objective: number
  nodes: number
  ms: number
  model: string
}

export type TripStatus = 'draft' | 'upcoming' | 'live' | 'completed'

export type Trip = {
  id: string
  userId: string
  title: string
  city: CityId
  startDate: string
  days: Day[]
  budget: number
  dayStart: number
  dayEnd: number
  pace: Pace
  transport: TransportPref
  status: TripStatus
  solver: SolverMeta
  request: string
  rainy: boolean
  createdAt: string
  /** Bumped on every saved edit so the UI can tell stale copies apart. */
  version: number
  /** POI ids the user said must be in the plan. */
  mustInclude: string[]
  avoidTags: string[]
  /** Taste profile the plan was scored with; replanning reuses it. */
  interests: Interests
  keywords: string[]
}

export type Violation = {
  uid: string
  kind: 'closed' | 'overtime' | 'budget'
  detail: string
}

export type Disruption =
  | { kind: 'traffic'; minutes: number; label?: string }
  | { kind: 'closure'; poiId: string; label?: string }
  | { kind: 'weather'; until: number; label?: string }
  | { kind: 'delay'; minutes: number; label?: string }

export type Weather = {
  condition: 'sunny' | 'cloudy' | 'rain' | 'storm'
  tempC: number
  rainChance: number
  note: [vi: string, en: string]
}
