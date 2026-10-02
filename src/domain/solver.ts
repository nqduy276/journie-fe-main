import { cityById, poiById } from './pois'
import { travelLeg } from './geo'
import { fmtTime } from './time'
import type { CityId, Day, Pace, Poi, Stop, TransportPref, Violation } from './types'

/**
 * Orienteering-with-time-windows solver (report §5.7, §6.3.3).
 *
 * The production backend uses OR-Tools CP-SAT. This is a faithful in-browser stand-in: an exact
 * depth-first search with branch-and-bound over the ordered subsets of a candidate set, honouring
 * the same hard constraints (opening windows, travel time, day window, budget, mandatory POIs).
 * Because it enumerates every feasible ordering of the candidates, a single-day result is OPTIMAL
 * for the modelled objective; multi-day plans are decomposed day by day and reported FEASIBLE.
 */

export const MAX_STOPS: Record<Pace, number> = { slow: 4, balanced: 6, fast: 8 }
const TRAVEL_PENALTY = 0.22
const WAIT_PENALTY = 0.12
/** Longest sensible wait for a venue to open (minutes); longer plans are rejected. */
const MAX_WAIT = 75
const MEAL_BONUS = 7
const NODE_LIMIT = 300_000

export type DayProblem = {
  city: CityId
  candidates: Poi[]
  scores: Map<string, number>
  dayStart: number
  dayEnd: number
  maxStops: number
  transport: TransportPref
  budgetLeft: number
  mustInclude: Set<string>
  /** Where the traveler stands when the plan starts (replanning), else the first stop is free. */
  origin?: { lat: number; lng: number }
  /** Multiplier on motorised legs (traffic). */
  congestion?: number
  /** Outdoor venues may not be *started* inside [from, until) (heavy rain). */
  rainWindow?: { from: number; until: number }
  /** Extra objective term evaluated on a complete sequence (replanning change cost). */
  extra?: (poiIds: string[], starts: number[]) => number
}

export type DayResult = {
  stops: Stop[]
  objective: number
  nodes: number
  complete: boolean
  utility: number
  travelMin: number
  feasible: boolean
}

let uidCounter = 0
export const newUid = () => `s${Date.now().toString(36)}${(uidCounter++).toString(36)}`

const isMealSlot = (poi: Poi, start: number) =>
  (poi.cat === 'food' || poi.tags.includes('street-food')) &&
  ((start >= 660 && start <= 825) || (start >= 1050 && start <= 1230))

export function solveDay(problem: DayProblem): DayResult {
  const { candidates, scores, dayStart, dayEnd, maxStops, transport, budgetLeft, mustInclude, origin } = problem
  const city = cityById[problem.city]
  const congestion = problem.congestion ?? 1
  const n = candidates.length
  const unitScore = candidates.map((poi) => (scores.get(poi.id) ?? 0) * 100)
  const sortedDesc = [...unitScore].sort((a, b) => b - a)
  const mustIdx = candidates.map((poi, i) => (mustInclude.has(poi.id) ? i : -1)).filter((i) => i >= 0)

  let best: { obj: number; seq: number[]; starts: number[]; utility: number; travel: number } = {
    obj: -Infinity,
    seq: [],
    starts: [],
    utility: 0,
    travel: 0,
  }
  let nodes = 0
  let complete = true

  // Cache leg estimates: (from index or -1 for origin) × to index.
  const legCache = new Map<number, ReturnType<typeof travelLeg>>()
  const leg = (from: number, to: number) => {
    const key = (from + 1) * 64 + to
    let value = legCache.get(key)
    if (!value) {
      const a = from < 0 ? origin : candidates[from]
      value = a ? travelLeg(a, candidates[to], transport, city, congestion) : { km: 0, min: 0, cost: 0, mode: 'walk' as const }
      legCache.set(key, value)
    }
    return value
  }

  const seq: number[] = []
  const starts: number[] = []
  const used: boolean[] = new Array(n).fill(false)

  const evaluate = (utility: number, travel: number, wait: number, meals: number) => {
    if (!mustIdx.every((i) => used[i])) return
    let obj = utility - TRAVEL_PENALTY * travel - WAIT_PENALTY * wait + MEAL_BONUS * meals
    if (problem.extra) obj += problem.extra(seq.map((i) => candidates[i].id), starts)
    if (obj > best.obj + 1e-9) best = { obj, seq: [...seq], starts: [...starts], utility, travel }
  }

  const dfs = (time: number, last: number, spent: number, utility: number, travel: number, wait: number, lunch: boolean, dinner: boolean) => {
    if (nodes++ > NODE_LIMIT) {
      complete = false
      return
    }
    evaluate(utility, travel, wait, (lunch ? 1 : 0) + (dinner ? 1 : 0))
    if (seq.length >= maxStops) return

    // Optimistic bound: best remaining scores plus both meal bonuses, ignoring all penalties.
    let bound = utility + 2 * MEAL_BONUS
    for (let k = 0, taken = 0; k < sortedDesc.length && taken < maxStops - seq.length; k += 1, taken += 1) bound += sortedDesc[k]
    // `extra` is a pure penalty (<= 0), so the optimistic bound stays valid with it.
    if (bound <= best.obj) return

    for (let i = 0; i < n; i += 1) {
      if (used[i]) continue
      const poi = candidates[i]
      const hop = seq.length === 0 && !origin ? { km: 0, min: 0, cost: 0, mode: 'walk' as const } : leg(last, i)
      const arrive = time + hop.min
      const start = Math.max(arrive, poi.open)
      const end = start + poi.visit
      if (end > Math.min(poi.close, dayEnd)) continue
      if (!(seq.length === 0 && !origin) && start - arrive > MAX_WAIT) continue
      if (problem.rainWindow && !poi.indoor && start >= problem.rainWindow.from && start < problem.rainWindow.until) continue
      const price = poi.cost + hop.cost
      if (spent + price > budgetLeft) continue

      const meal = isMealSlot(poi, start)
      used[i] = true
      seq.push(i)
      starts.push(start)
      dfs(
        end,
        i,
        spent + price,
        utility + unitScore[i],
        travel + hop.min,
        wait + (seq.length === 1 && !origin ? 0 : start - arrive),
        lunch || (meal && start < 900),
        dinner || (meal && start >= 900),
      )
      starts.pop()
      seq.pop()
      used[i] = false
      if (!complete) return
    }
  }

  dfs(dayStart, -1, 0, 0, 0, 0, false, false)

  const feasible = best.obj > -Infinity
  const stops = feasible ? buildStops(best.seq.map((i) => candidates[i]), problem) : []
  return {
    stops,
    objective: feasible ? best.obj : 0,
    nodes,
    complete,
    utility: best.utility,
    travelMin: best.travel,
    feasible,
  }
}

/** Turn an ordered list of POIs into timed stops, recomputing legs and waits from `problem`. */
function buildStops(order: Poi[], problem: DayProblem): Stop[] {
  const city = cityById[problem.city]
  let time = problem.dayStart
  let prev: { lat: number; lng: number } | undefined = problem.origin
  return order.map((poi, index) => {
    const hop = prev ? travelLeg(prev, poi, problem.transport, city, problem.congestion ?? 1) : { km: 0, min: 0, cost: 0, mode: 'walk' as const }
    const arrive = time + hop.min
    const start = Math.max(arrive, poi.open)
    const stop: Stop = {
      uid: newUid(),
      poiId: poi.id,
      start,
      end: start + poi.visit,
      visit: poi.visit,
      travelMin: hop.min,
      travelKm: Math.round(hop.km * 10) / 10,
      travelCost: hop.cost,
      mode: hop.mode,
      wait: index === 0 && !problem.origin ? 0 : start - arrive,
      locked: problem.mustInclude.has(poi.id),
    }
    time = stop.end
    prev = poi
    return stop
  })
}

/* ───────── manual edits: re-time a day and validate hard constraints ───────── */

export type RetimeOptions = {
  city: CityId
  dayStart: number
  dayEnd: number
  transport: TransportPref
  congestion?: number
}

/**
 * Re-time stops in their new order. Used after a drag, a duration change or an insert; the
 * returned violations drive the "validate edit" step of the editing flow (report §2.2.2).
 */
export function retimeDay(stops: Stop[], options: RetimeOptions): { stops: Stop[]; violations: Violation[] } {
  const city = cityById[options.city]
  const violations: Violation[] = []
  let time = options.dayStart
  let prev: Poi | undefined
  const next = stops.map((stop, index) => {
    const poi = poiById[stop.poiId]
    const hop = prev ? travelLeg(prev, poi, options.transport, city, options.congestion ?? 1) : { km: 0, min: 0, cost: 0, mode: 'walk' as const }
    const arrive = time + hop.min
    const start = Math.max(arrive, poi.open)
    const end = start + stop.visit
    if (end > poi.close) {
      violations.push({
        uid: stop.uid,
        kind: 'closed',
        detail: `${poi.name} ${poi.close >= start ? 'đóng cửa' : 'đã đóng'} lúc ${fmtTime(poi.close)}`,
      })
    }
    if (end > options.dayEnd) {
      violations.push({ uid: stop.uid, kind: 'overtime', detail: `${fmtTime(end)} vượt giờ kết thúc ${fmtTime(options.dayEnd)}` })
    }
    time = end
    prev = poi
    return {
      ...stop,
      start,
      end,
      travelMin: hop.min,
      travelKm: Math.round(hop.km * 10) / 10,
      travelCost: hop.cost,
      mode: hop.mode,
      wait: index === 0 ? 0 : start - arrive,
    }
  })
  return { stops: next, violations }
}

export const dayCost = (day: Day) =>
  day.stops.reduce((sum, stop) => sum + poiById[stop.poiId].cost + stop.travelCost, 0)

export const tripCost = (days: Day[]) => days.reduce((sum, day) => sum + dayCost(day), 0)
