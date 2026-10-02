import { poiById, poisByCity } from './pois'
import { scorePoi } from './scoring'
import { MAX_STOPS, retimeDay, solveDay, tripCost } from './solver'
import type { Disruption, Poi, Stop, Trip, Violation } from './types'

/**
 * Dynamic incremental replanning (report §1.4.2):
 *   I' = argmax_I [ Utility(I) − λ · ChangeCost(I, I_old) ]
 * Utility is the sum of Eq. (3) scores, ChangeCost charges for dropped, added, shifted and
 * re-ordered stops. λ trades the best possible plan against keeping what the traveler already knows.
 */

export type ReplanOption = {
  id: 'keep' | 'balanced' | 'fresh' | 'custom'
  lambda: number
  stops: Stop[]
  kept: string[]
  dropped: string[]
  added: string[]
  utility: number
  changeCost: number
  objective: number
  endTime: number
  travelMin: number
  nodes: number
}

export type ReplanResult = {
  /** Original remaining stops re-timed under the disruption, with whatever now breaks. */
  baseline: { stops: Stop[]; violations: Violation[]; utility: number; endTime: number }
  options: ReplanOption[]
  completed: Stop[]
  now: number
}

export type LambdaSpec = { id: ReplanOption['id']; lambda: number }

export const LAMBDAS: LambdaSpec[] = [
  { id: 'keep', lambda: 2.6 },
  { id: 'balanced', lambda: 0.9 },
  { id: 'fresh', lambda: 0.12 },
]

const DROP_COST = 14
const LOCKED_DROP_COST = 60
const ADD_COST = 4
const MOVE_COST = 2.5
const SHIFT_PER_MIN = 1 / 12

export function splitDay(stops: Stop[], now: number) {
  const completed = stops.filter((stop) => stop.end <= now || stop.start <= now)
  const remaining = stops.filter((stop) => !completed.includes(stop))
  return { completed, remaining }
}

function changeCost(oldIds: string[], oldStarts: Map<string, number>, locked: Set<string>, ids: string[], starts: number[], closed?: string) {
  let cost = 0
  const newPos = new Map(ids.map((id, i) => [id, i]))
  oldIds.forEach((id, oldIndex) => {
    const pos = newPos.get(id)
    if (pos === undefined) {
      if (id !== closed) cost += locked.has(id) ? LOCKED_DROP_COST : DROP_COST
      return
    }
    cost += Math.abs(starts[pos] - (oldStarts.get(id) ?? 0)) * SHIFT_PER_MIN + Math.abs(pos - oldIndex) * MOVE_COST
  })
  for (const id of ids) if (!oldStarts.has(id)) cost += ADD_COST
  return cost
}

export function replanDay(trip: Trip, dayIndex: number, now: number, disruption: Disruption, lambdas: LambdaSpec[] = LAMBDAS): ReplanResult {
  const day = trip.days[dayIndex]
  const { completed, remaining } = splitDay(day.stops, now)
  const last = completed[completed.length - 1]
  const origin = last ? poiById[last.poiId] : undefined
  const delay = disruption.kind === 'delay' ? disruption.minutes : 0
  const resumeAt = Math.max(now, last?.end ?? now) + delay
  const congestion = disruption.kind === 'traffic' ? 1.75 : 1
  const rainWindow = disruption.kind === 'weather' ? { from: now, until: disruption.until } : undefined
  const closedId = disruption.kind === 'closure' ? disruption.poiId : undefined
  const rainy = trip.rainy || disruption.kind === 'weather'

  const ctx = {
    interests: trip.interests ?? {},
    keywords: trip.keywords ?? [],
    perStopBudget: trip.budget / Math.max(1, trip.days.length * MAX_STOPS[trip.pace]),
    rainy,
  }
  const scoreOf = (poi: Poi) => scorePoi(poi, ctx).score

  const usedElsewhere = new Set(trip.days.flatMap((d) => d.stops.map((stop) => stop.poiId)))
  const avoid = new Set(trip.avoidTags)
  const oldRemaining = remaining.filter((stop) => stop.poiId !== closedId)
  const alternatives = poisByCity(trip.city)
    .filter((poi) => !usedElsewhere.has(poi.id) && poi.id !== closedId && !poi.tags.some((tag) => avoid.has(tag)) && poi.close > resumeAt + poi.visit)
    .sort((a, b) => Number(rainy && b.indoor) - Number(rainy && a.indoor) || scoreOf(b) - scoreOf(a))
    .slice(0, 4)

  const candidates = [...oldRemaining.map((stop) => poiById[stop.poiId]), ...alternatives]
  const scores = new Map(candidates.map((poi) => [poi.id, scoreOf(poi)]))
  const locked = new Set(remaining.filter((stop) => stop.locked && stop.poiId !== closedId).map((stop) => stop.poiId))
  const oldIds = remaining.map((stop) => stop.poiId)
  const oldStarts = new Map(remaining.map((stop) => [stop.poiId, stop.start]))

  const spentBefore = tripCost(trip.days.map((d) => ({ ...d, stops: d.index === dayIndex ? completed : d.stops })))

  // What the old plan looks like if nothing changes.
  const baselineBase = retimeDay(
    oldRemaining.map((stop) => ({ ...stop })),
    { city: trip.city, dayStart: resumeAt, dayEnd: trip.dayEnd, transport: trip.transport, congestion },
  )
  const baselineViolations = [...baselineBase.violations]
  if (rainWindow) {
    for (const stop of baselineBase.stops) {
      const poi = poiById[stop.poiId]
      if (!poi.indoor && stop.start >= rainWindow.from && stop.start < rainWindow.until) {
        baselineViolations.push({ uid: stop.uid, kind: 'closed', detail: `${poi.name} ngoài trời, đang mưa lớn` })
      }
    }
  }
  if (closedId) {
    const stop = remaining.find((s) => s.poiId === closedId)
    if (stop) baselineViolations.push({ uid: stop.uid, kind: 'closed', detail: `${poiById[closedId].name} đóng cửa đột xuất` })
  }
  const baseline = {
    stops: baselineBase.stops,
    violations: baselineViolations,
    utility: baselineBase.stops.reduce((sum, stop) => sum + (scores.get(stop.poiId) ?? 0) * 100, 0),
    endTime: baselineBase.stops[baselineBase.stops.length - 1]?.end ?? resumeAt,
  }

  const options: ReplanOption[] = []
  const seen = new Set<string>()
  for (const { id, lambda } of lambdas) {
    const solved = solveDay({
      city: trip.city,
      candidates,
      scores,
      dayStart: resumeAt,
      dayEnd: trip.dayEnd,
      maxStops: Math.min(MAX_STOPS.fast, Math.max(oldRemaining.length + 1, 2)),
      transport: trip.transport,
      budgetLeft: Math.max(0, trip.budget - spentBefore),
      mustInclude: locked,
      origin,
      congestion,
      rainWindow,
      extra: (ids, starts) => -lambda * changeCost(oldIds, oldStarts, locked, ids, starts, closedId),
    })
    if (!solved.feasible) continue
    const ids = solved.stops.map((stop) => stop.poiId)
    const signature = ids.join('|')
    if (id !== 'custom' && seen.has(signature)) continue
    seen.add(signature)
    const cost = changeCost(oldIds, oldStarts, locked, ids, solved.stops.map((stop) => stop.start), closedId)
    options.push({
      id,
      lambda,
      stops: solved.stops,
      kept: ids.filter((poiId) => oldStarts.has(poiId)),
      dropped: oldIds.filter((poiId) => !ids.includes(poiId)),
      added: ids.filter((poiId) => !oldStarts.has(poiId)),
      utility: solved.utility,
      changeCost: cost,
      objective: solved.utility - lambda * cost,
      endTime: solved.stops[solved.stops.length - 1]?.end ?? resumeAt,
      travelMin: solved.travelMin,
      nodes: solved.nodes,
    })
  }

  return { baseline, options, completed, now }
}

export function applyReplan(trip: Trip, dayIndex: number, completed: Stop[], option: ReplanOption): Trip {
  return {
    ...trip,
    version: trip.version + 1,
    days: trip.days.map((day) => (day.index === dayIndex ? { ...day, stops: [...completed, ...option.stops] } : day)),
  }
}

export const disruptionMeta: Record<Disruption['kind'], { vi: string; en: string }> = {
  traffic: { vi: 'Kẹt xe', en: 'Traffic jam' },
  closure: { vi: 'Điểm đóng cửa', en: 'Venue closed' },
  weather: { vi: 'Mưa lớn', en: 'Heavy rain' },
  delay: { vi: 'Trễ lịch', en: 'Running late' },
}
