import { isRainy, weatherFor } from '../domain/conditions'
import { planTrip } from '../domain/planner'
import { addDays, hm, todayIso } from '../domain/time'
import type { Trip, TripStatus } from '../domain/types'
import { latency, readStore, writeStore } from './http'

const KEY = 'journie-trips-v2'

const read = () => readStore<Trip[]>(KEY, [])
const write = (trips: Trip[]) => writeStore(KEY, trips)

/** Demo data for the traveler account: one trip underway, one coming up, one finished. */
function seedFor(userId: string): Trip[] {
  const today = todayIso()
  const base = {
    userId,
    dayStart: hm('08:00'),
    dayEnd: hm('21:30'),
    mustInclude: [] as string[],
    avoidTags: [] as string[],
    keywords: [] as string[],
  }
  const live = planTrip({
    ...base,
    request: 'Một ngày ở Sài Gòn, thích bảo tàng, ăn ngon và cà phê, đi xe máy.',
    city: 'sai-gon',
    days: 1,
    startDate: today,
    budget: 1_600_000,
    pace: 'balanced',
    transport: 'bike',
    interests: { culture: 0.9, food: 0.9, cafe: 0.8 },
    rainy: false,
    title: 'Sài Gòn một ngày trọn vẹn',
  })
  const upcoming = planTrip({
    ...base,
    request: 'Ba ngày ở Hội An, đi thật chậm, ăn ngon, ngân sách 4 triệu.',
    city: 'hoi-an',
    days: 3,
    startDate: addDays(today, 9),
    budget: 4_000_000,
    pace: 'slow',
    transport: 'walk',
    interests: { food: 0.95, culture: 0.8, cafe: 0.8 },
    keywords: ['lanterns'],
    rainy: isRainy(weatherFor('hoi-an', addDays(today, 9))),
    title: 'Hội An chậm rãi · 3 ngày',
  })
  const done = planTrip({
    ...base,
    request: 'Hai ngày Hà Nội, văn hóa và ẩm thực.',
    city: 'ha-noi',
    days: 2,
    startDate: addDays(today, -21),
    budget: 2_500_000,
    pace: 'balanced',
    transport: 'bike',
    interests: { culture: 0.95, food: 0.9 },
    rainy: false,
    title: 'Hà Nội hai ngày',
  })
  return [
    { ...live, id: 't-demo-live', status: 'live' as TripStatus },
    { ...upcoming, id: 't-demo-upcoming', status: 'upcoming' as TripStatus },
    { ...done, id: 't-demo-done', status: 'completed' as TripStatus },
  ]
}

function ensure(userId: string) {
  const trips = read()
  if (userId === 'u-traveler' && !trips.some((trip) => trip.userId === userId)) {
    const seeded = [...trips, ...seedFor(userId)]
    write(seeded)
    return seeded
  }
  return trips
}

export const listTrips = (userId: string) =>
  latency(() => ensure(userId).filter((trip) => trip.userId === userId).sort(byRecency), 260, 520)

export const getTrip = (id: string, userId: string) =>
  latency(() => {
    const trip = ensure(userId).find((entry) => entry.id === id && entry.userId === userId)
    if (!trip) throw new Error('not_found')
    return trip
  }, 180, 380)

export const createTrip = (trip: Trip) =>
  latency(() => {
    write([...read(), trip])
    return trip
  }, 250, 450)

export const saveTrip = (trip: Trip) =>
  latency(() => {
    const next = { ...trip, version: trip.version + 1 }
    write(read().map((entry) => (entry.id === trip.id ? next : entry)))
    return next
  }, 160, 340)

export const deleteTrip = (id: string) =>
  latency(() => {
    write(read().filter((trip) => trip.id !== id))
    return id
  }, 200, 380)

const order: Record<TripStatus, number> = { live: 0, upcoming: 1, draft: 2, completed: 3 }
const byRecency = (a: Trip, b: Trip) => order[a.status] - order[b.status] || a.startDate.localeCompare(b.startDate)
