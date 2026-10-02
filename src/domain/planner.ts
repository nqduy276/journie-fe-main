import { cityById, poiById, poisByCity } from './pois'
import { scorePoi, type ScoreContext } from './scoring'
import { MAX_STOPS, newUid, solveDay, tripCost } from './solver'
import { addDays } from './time'
import type { CityId, Day, Interests, Pace, Poi, SolverStatus, TransportPref, Trip } from './types'

export type PlanInput = {
  userId: string
  request: string
  city: CityId
  days: number
  startDate: string
  budget: number
  dayStart: number
  dayEnd: number
  pace: Pace
  transport: TransportPref
  interests: Interests
  keywords: string[]
  avoidTags: string[]
  mustInclude: string[]
  rainy: boolean
  title?: string
}

const CANDIDATES_PER_DAY = 9
const paceTitle: Record<Pace, string> = { slow: 'chậm rãi', balanced: 'trọn vẹn', fast: 'khám phá' }

export function scoreContext(input: Pick<PlanInput, 'interests' | 'keywords' | 'budget' | 'days' | 'pace' | 'rainy'>): ScoreContext {
  return {
    interests: input.interests,
    keywords: input.keywords,
    perStopBudget: input.budget / Math.max(1, input.days * MAX_STOPS[input.pace]),
    rainy: input.rainy,
  }
}

/** Farthest-first seeded k-means on coordinates; deterministic so plans are reproducible. */
function cluster(items: Poi[], k: number): Poi[][] {
  if (k <= 1 || items.length <= k) return k <= 1 ? [items] : items.map((item) => [item])
  const centers: { lat: number; lng: number }[] = [{ lat: items[0].lat, lng: items[0].lng }]
  while (centers.length < k) {
    let far = items[0]
    let farD = -1
    for (const item of items) {
      const d = Math.min(...centers.map((c) => (c.lat - item.lat) ** 2 + (c.lng - item.lng) ** 2))
      if (d > farD) {
        farD = d
        far = item
      }
    }
    centers.push({ lat: far.lat, lng: far.lng })
  }
  let groups: Poi[][] = []
  for (let round = 0; round < 8; round += 1) {
    groups = centers.map(() => [])
    for (const item of items) {
      let bi = 0
      let bd = Infinity
      centers.forEach((c, i) => {
        const d = (c.lat - item.lat) ** 2 + (c.lng - item.lng) ** 2
        if (d < bd) {
          bd = d
          bi = i
        }
      })
      groups[bi].push(item)
    }
    groups.forEach((group, i) => {
      if (!group.length) return
      centers[i] = {
        lat: group.reduce((s, g) => s + g.lat, 0) / group.length,
        lng: group.reduce((s, g) => s + g.lng, 0) / group.length,
      }
    })
  }
  return groups.filter((g) => g.length)
}

export function planTrip(input: PlanInput): Trip {
  const t0 = performance.now()
  const city = cityById[input.city]
  const maxStops = MAX_STOPS[input.pace]
  const ctx = scoreContext(input)
  const avoid = new Set(input.avoidTags)

  const pool = poisByCity(input.city).filter((poi) => !poi.tags.some((tag) => avoid.has(tag)) || input.mustInclude.includes(poi.id))
  const scores = new Map(pool.map((poi) => [poi.id, scorePoi(poi, ctx).score]))
  const ranked = [...pool].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))

  const must = new Set(input.mustInclude.filter((id) => pool.some((poi) => poi.id === id)))
  const days = Math.max(1, Math.min(input.days, 7))
  // Spread a small pool over the days instead of front-loading the first one.
  const dayCap = days > 1 ? Math.min(maxStops, Math.max(2, Math.ceil(pool.length / days))) : maxStops

  let groups: Poi[][]
  if (days === 1) {
    groups = [ranked.slice(0, CANDIDATES_PER_DAY)]
    for (const id of must) if (!groups[0].some((poi) => poi.id === id)) groups[0].push(poiById[id])
  } else {
    const top = ranked.slice(0, Math.min(ranked.length, days * maxStops + 2))
    for (const id of must) if (!top.some((poi) => poi.id === id)) top.push(poiById[id])
    groups = cluster(top, days)
      .map((group) => group.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0)))
      .sort((a, b) => b.reduce((s, p) => s + (scores.get(p.id) ?? 0), 0) - a.reduce((s, p) => s + (scores.get(p.id) ?? 0), 0))
    while (groups.length < days) groups.push([])
  }

  let totalNodes = 0
  let allComplete = true
  let objective = 0
  let spent = 0
  const used = new Set<string>()
  const result: Day[] = []

  groups.slice(0, days).forEach((group, index) => {
    // A day's own cluster first, then the nearest unused POIs from anywhere, so no day is left thin.
    const own = group.filter((poi) => !used.has(poi.id)).slice(0, CANDIDATES_PER_DAY)
    const centre = own.length
      ? { lat: own.reduce((s, g) => s + g.lat, 0) / own.length, lng: own.reduce((s, g) => s + g.lng, 0) / own.length }
      : { lat: city.lat, lng: city.lng }
    const ownIds = new Set(own.map((poi) => poi.id))
    const filler = ranked
      .filter((poi) => !used.has(poi.id) && !ownIds.has(poi.id))
      .sort((a, b) => (a.lat - centre.lat) ** 2 + (a.lng - centre.lng) ** 2 - ((b.lat - centre.lat) ** 2 + (b.lng - centre.lng) ** 2))
      .slice(0, Math.max(0, CANDIDATES_PER_DAY - own.length))
    const candidates = [...own, ...filler]
    const share = (input.budget - spent) / (days - index)
    const solved = solveDay({
      city: input.city,
      candidates,
      scores,
      dayStart: input.dayStart,
      dayEnd: input.dayEnd,
      maxStops: dayCap,
      transport: input.transport,
      budgetLeft: Math.min(input.budget - spent, share * 1.3),
      mustInclude: new Set(candidates.filter((poi) => must.has(poi.id)).map((poi) => poi.id)),
    })
    totalNodes += solved.nodes
    allComplete = allComplete && solved.complete
    objective += solved.objective
    solved.stops.forEach((stop) => used.add(stop.poiId))
    spent += solved.stops.reduce((s, stop) => s + poiById[stop.poiId].cost + stop.travelCost, 0)
    result.push({ index, stops: solved.stops })
  })

  const anyStops = result.some((day) => day.stops.length)
  const status: SolverStatus = !anyStops ? 'INFEASIBLE' : days === 1 && allComplete ? 'OPTIMAL' : 'FEASIBLE'
  const dayLabel = days === 1 ? '1 ngày' : `${days} ngày`

  return {
    id: `t-${Date.now().toString(36)}${newUid().slice(-3)}`,
    userId: input.userId,
    title: input.title ?? `${city.name} ${paceTitle[input.pace]} · ${dayLabel}`,
    city: input.city,
    startDate: input.startDate,
    days: result,
    budget: input.budget,
    dayStart: input.dayStart,
    dayEnd: input.dayEnd,
    pace: input.pace,
    transport: input.transport,
    status: 'upcoming',
    solver: {
      status,
      objective: Math.round(objective * 10) / 10,
      nodes: totalNodes,
      ms: Math.max(1, Math.round(performance.now() - t0)),
      model: days === 1 ? 'CP-SAT · OPTW' : 'CP-SAT · TOPTW (day-by-day)',
    },
    request: input.request,
    rainy: input.rainy,
    createdAt: new Date().toISOString(),
    version: 1,
    mustInclude: [...must],
    avoidTags: input.avoidTags,
    interests: input.interests,
    keywords: input.keywords,
  }
}

export const tripEndDate = (trip: Trip) => addDays(trip.startDate, trip.days.length - 1)
export const tripStopCount = (trip: Trip) => trip.days.reduce((n, day) => n + day.stops.length, 0)
export const tripSpend = (trip: Trip) => tripCost(trip.days)
