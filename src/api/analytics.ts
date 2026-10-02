import type { CityId, Disruption } from '../domain/types'
import { seededRandom } from '../utils/css'
import { latency, readStore, writeStore } from './http'

const EVENTS_KEY = 'journie-events-v1'

export type AnalyticsEvent = {
  t: string
  type: 'trip_created' | 'trip_edited' | 'replan_suggested' | 'replan_accepted' | 'replan_dismissed' | 'trip_started' | 'search'
  city?: CityId
  reason?: Disruption['kind']
  lambda?: number
  detail?: string
}

/** Interaction log: in production this is what feeds the ML tuning of λ and the scoring weights. */
export function track(event: Omit<AnalyticsEvent, 't'>) {
  const events = readStore<AnalyticsEvent[]>(EVENTS_KEY, [])
  writeStore(EVENTS_KEY, [...events.slice(-399), { ...event, t: new Date().toISOString() }])
}

export const readEvents = () => readStore<AnalyticsEvent[]>(EVENTS_KEY, [])

export type DailyPoint = { date: string; trips: number; replans: number; users: number }

export type AnalyticsReport = {
  totals: {
    trips: number
    users: number
    avgDays: number
    avgStops: number
    replansPerTrip: number
    acceptRate: number
    avgSolveMs: number
    searches: number
  }
  daily: DailyPoint[]
  /** [weekday 0=Mon…6=Sun][hour 0-23] interactions */
  heat: number[][]
  reasons: { kind: Disruption['kind']; count: number; accepted: number; lambda: number }[]
  cities: { city: CityId; trips: number }[]
  lambdaBins: { from: number; to: number; count: number }[]
  funnel: { key: 'visit' | 'generated' | 'edited' | 'started' | 'completed'; count: number }[]
  statuses: { key: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE'; count: number }[]
  live: AnalyticsEvent[]
}

function build(): AnalyticsReport {
  const rand = seededRandom(2026)
  const today = new Date()
  const daily: DailyPoint[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (29 - i))
    const weekend = [0, 6].includes(date.getDay()) ? 1.35 : 1
    const trips = Math.round((22 + i * 0.7 + 7 * Math.sin(i / 3.2) + rand() * 6) * weekend)
    return {
      date: date.toISOString().slice(0, 10),
      trips,
      replans: Math.round(trips * (0.55 + rand() * 0.25)),
      users: Math.round(trips * (0.62 + rand() * 0.12)),
    }
  })

  const heat = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const lunch = Math.exp(-((hour - 12) ** 2) / 5)
      const evening = Math.exp(-((hour - 21) ** 2) / 7) * 1.6
      const morning = Math.exp(-((hour - 8.5) ** 2) / 4) * 0.5
      const weekend = day >= 5 ? 1.3 : 1
      return Math.round((lunch * 38 + evening * 52 + morning * 22 + rand() * 6) * weekend)
    }),
  )

  const tripsTotal = daily.reduce((s, d) => s + d.trips, 0)
  const reasons: AnalyticsReport['reasons'] = [
    { kind: 'traffic', count: 412, accepted: 301, lambda: 0.9 },
    { kind: 'weather', count: 301, accepted: 193, lambda: 0.7 },
    { kind: 'closure', count: 224, accepted: 181, lambda: 1.3 },
    { kind: 'delay', count: 178, accepted: 103, lambda: 1.8 },
  ]
  const cities: AnalyticsReport['cities'] = [
    { city: 'hoi-an', trips: 0.22 },
    { city: 'sai-gon', trips: 0.2 },
    { city: 'ha-noi', trips: 0.17 },
    { city: 'phu-quoc', trips: 0.13 },
    { city: 'da-lat', trips: 0.1 },
    { city: 'ninh-binh', trips: 0.08 },
    { city: 'ha-long', trips: 0.06 },
    { city: 'ha-giang', trips: 0.04 },
  ].map((c) => ({ city: c.city as CityId, trips: Math.round(c.trips * tripsTotal) }))
  const lambdaBins = [0, 0.5, 1, 1.5, 2, 2.5].map((from, i) => ({ from, to: from + 0.5, count: [64, 189, 241, 172, 98, 46][i] }))

  const live = readEvents()
  const sessionTrips = live.filter((e) => e.type === 'trip_created').length
  const sessionReplans = live.filter((e) => e.type === 'replan_suggested').length
  const sessionAccepted = live.filter((e) => e.type === 'replan_accepted').length
  const replans = daily.reduce((s, d) => s + d.replans, 0) + sessionReplans
  const trips = tripsTotal + sessionTrips

  return {
    totals: {
      trips,
      users: 1284 + live.filter((e) => e.type === 'trip_started').length,
      avgDays: 2.6,
      avgStops: 9.4,
      replansPerTrip: Math.round((replans / trips) * 100) / 100,
      acceptRate: Math.round(((reasons.reduce((s, r) => s + r.accepted, 0) + sessionAccepted) / (reasons.reduce((s, r) => s + r.count, 0) + sessionReplans)) * 100),
      avgSolveMs: 38,
      searches: 5120 + live.filter((e) => e.type === 'search').length,
    },
    daily,
    heat,
    reasons,
    cities,
    lambdaBins,
    funnel: [
      { key: 'visit', count: 4210 },
      { key: 'generated', count: trips },
      { key: 'edited', count: Math.round(trips * 0.58) },
      { key: 'started', count: Math.round(trips * 0.41) },
      { key: 'completed', count: Math.round(trips * 0.33) },
    ],
    statuses: [
      { key: 'OPTIMAL', count: Math.round(trips * 0.43) },
      { key: 'FEASIBLE', count: Math.round(trips * 0.55) },
      { key: 'INFEASIBLE', count: Math.round(trips * 0.02) },
    ],
    live: live.slice(-8).reverse(),
  }
}

export const getAnalytics = () => latency(build, 400, 800)
