import { poiById } from './pois'
import { newUid, retimeDay, tripCost } from './solver'
import type { Stop, Trip, Violation } from './types'

/**
 * Manual edits follow the flow in report §2.2.2: apply the change, re-time the day, validate the
 * hard constraints, and only accept the result when nothing breaks.
 */
export type EditResult = { trip: Trip; ok: true } | { ok: false; violations: Violation[] }

function commitDay(trip: Trip, dayIndex: number, stops: Stop[]): EditResult {
  const { stops: timed, violations } = retimeDay(stops, {
    city: trip.city,
    dayStart: trip.dayStart,
    dayEnd: trip.dayEnd,
    transport: trip.transport,
  })
  if (violations.length) return { ok: false, violations }
  const next: Trip = { ...trip, days: trip.days.map((day) => (day.index === dayIndex ? { ...day, stops: timed } : day)) }
  if (tripCost(next.days) > trip.budget * 1.0001 && tripCost(next.days) > tripCost(trip.days)) {
    return {
      ok: false,
      violations: [{ uid: timed[0]?.uid ?? '', kind: 'budget', detail: `Chi phí vượt ngân sách ${new Intl.NumberFormat('vi-VN').format(trip.budget)}đ`, detailEn: `Cost exceeds the ${new Intl.NumberFormat('en-US').format(trip.budget)} VND budget` }],
    }
  }
  return { ok: true, trip: next }
}

export const reorderDay = (trip: Trip, dayIndex: number, order: Stop[]) => commitDay(trip, dayIndex, order)

export const changeDuration = (trip: Trip, dayIndex: number, uid: string, delta: number) =>
  commitDay(
    trip,
    dayIndex,
    trip.days[dayIndex].stops.map((stop) => (stop.uid === uid ? { ...stop, visit: Math.min(360, Math.max(15, stop.visit + delta)) } : stop)),
  )

export const removeStop = (trip: Trip, dayIndex: number, uid: string) =>
  commitDay(
    trip,
    dayIndex,
    trip.days[dayIndex].stops.filter((stop) => stop.uid !== uid),
  )

export function toggleLock(trip: Trip, dayIndex: number, uid: string): Trip {
  const stops = trip.days[dayIndex].stops.map((stop) => (stop.uid === uid ? { ...stop, locked: !stop.locked } : stop))
  const locked = stops.find((stop) => stop.uid === uid)?.locked
  const poiId = stops.find((stop) => stop.uid === uid)?.poiId
  return {
    ...trip,
    mustInclude: poiId ? (locked ? [...new Set([...trip.mustInclude, poiId])] : trip.mustInclude.filter((id) => id !== poiId)) : trip.mustInclude,
    days: trip.days.map((day) => (day.index === dayIndex ? { ...day, stops } : day)),
  }
}

export function addStop(trip: Trip, dayIndex: number, poiId: string): EditResult {
  const poi = poiById[poiId]
  const stop: Stop = {
    uid: newUid(),
    poiId,
    start: 0,
    end: 0,
    visit: poi.visit,
    travelMin: 0,
    travelKm: 0,
    travelCost: 0,
    mode: 'walk',
    wait: 0,
    locked: false,
  }
  return commitDay(trip, dayIndex, [...trip.days[dayIndex].stops, stop])
}

export const usedPoiIds = (trip: Trip) => new Set(trip.days.flatMap((day) => day.stops.map((stop) => stop.poiId)))

/** Stop-level diff between two versions of a day, for the "review the new itinerary" step. */
export function diffDay(before: Stop[], after: Stop[]) {
  const beforeIds = before.map((stop) => stop.poiId)
  const afterIds = after.map((stop) => stop.poiId)
  return {
    added: after.filter((stop) => !beforeIds.includes(stop.poiId)),
    removed: before.filter((stop) => !afterIds.includes(stop.poiId)),
    kept: after.filter((stop) => beforeIds.includes(stop.poiId)),
  }
}
