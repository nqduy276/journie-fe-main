import { isRainy, weatherFor } from '../domain/conditions'
import { extractIntent, type Intent } from '../domain/nlp'
import { planTrip, type PlanInput } from '../domain/planner'
import { cityById, poisByCity } from '../domain/pois'
import { scorePoi } from '../domain/scoring'
import { hm, todayIso } from '../domain/time'
import type { Pace, Trip, TransportPref, Weather } from '../domain/types'
import { scoreContext } from '../domain/planner'
import { latency } from './http'
import type { Profile } from './profile'

/** What the planner learned while gathering data, shown as the pipeline completes. */
export type PlanReport = {
  intent: Intent
  weather: Weather
  considered: number
  excluded: number
  trip: Trip
}

export type PlanRequest = {
  text: string
  userId: string
  lang?: 'vi' | 'en'
  profile: Profile
  /** Values the traveler edited in the form; they win over what the text said. */
  overrides: Partial<{ city: PlanInput['city']; days: number; startDate: string; budget: number; pace: Pace; transport: TransportPref }>
}

export function analyzeRequest(text: string) {
  return latency(() => extractIntent(text), 500, 900)
}

export function buildInput(request: PlanRequest, intent: Intent): PlanInput {
  const { profile, overrides } = request
  const city = overrides.city ?? intent.city ?? 'hoi-an'
  const days = overrides.days ?? intent.days ?? 2
  const startDate = overrides.startDate ?? todayIso()
  const pace = overrides.pace ?? intent.pace ?? profile.pace
  const budget = overrides.budget ?? intent.budget ?? profile.budgetPerDay * days
  const weather = weatherFor(city, startDate)
  const interests = { ...profile.interests, ...intent.interests }
  const en = request.lang === 'en'
  const paceWord = { slow: en ? 'relaxed' : 'chậm rãi', balanced: en ? 'full' : 'trọn vẹn', fast: en ? 'explorer' : 'khám phá' }[pace]
  const cityLabel = en ? cityById[city].nameEn : cityById[city].name
  return {
    title: `${cityLabel} ${paceWord} · ${days} ${en ? (days > 1 ? 'days' : 'day') : 'ngày'}`,
    userId: request.userId,
    request: request.text,
    city,
    days,
    startDate,
    budget,
    dayStart: intent.dayStart ?? hm('08:00'),
    dayEnd: intent.dayEnd ?? hm('21:00'),
    pace,
    transport: overrides.transport ?? intent.transport ?? profile.transport,
    interests,
    keywords: intent.keywords,
    avoidTags: [...new Set([...profile.dietary, ...intent.avoidTags])],
    mustInclude: intent.mustInclude,
    rainy: isRainy(weather),
  }
}

/** Runs the whole generate-itinerary flow (report §2.2.1) and returns what each stage produced. */
export function generateItinerary(request: PlanRequest, intent: Intent) {
  return latency(() => {
    const input = buildInput(request, intent)
    const weather = weatherFor(input.city, input.startDate)
    const pool = poisByCity(input.city)
    const trip = planTrip(input)
    return {
      intent,
      weather,
      considered: pool.length,
      excluded: pool.filter((poi) => poi.tags.some((tag) => input.avoidTags.includes(tag))).length,
      trip,
    } satisfies PlanReport
  }, 400, 700)
}

/**
 * "Automatic modify" (report §2.2.2): extra requests are merged into the original wish and the
 * plan is rebuilt. The result is returned as a proposal; nothing is saved until the traveler accepts.
 */
export function adjustItinerary(trip: Trip, extraText: string, profile: Profile) {
  return latency(() => {
    const extra = extractIntent(extraText)
    const interests = { ...trip.interests, ...extra.interests }
    const avoidTags = [...new Set([...trip.avoidTags, ...extra.avoidTags])]
    const mustInclude = [...new Set([...trip.mustInclude, ...extra.mustInclude])]
    const input: PlanInput = {
      userId: trip.userId,
      request: `${trip.request} ${extraText}`.trim(),
      city: trip.city,
      days: trip.days.length,
      startDate: trip.startDate,
      budget: extra.budget ?? trip.budget,
      dayStart: extra.dayStart ?? trip.dayStart,
      dayEnd: extra.dayEnd ?? trip.dayEnd,
      pace: extra.pace ?? trip.pace,
      transport: extra.transport ?? trip.transport ?? profile.transport,
      interests,
      keywords: [...new Set([...trip.keywords, ...extra.keywords])],
      avoidTags,
      mustInclude,
      rainy: trip.rainy,
      title: trip.title,
    }
    const next = planTrip(input)
    return { ...next, id: trip.id, status: trip.status, createdAt: trip.createdAt, version: trip.version, extraIntent: extra }
  }, 900, 1500)
}

/** Top POIs for a request, for the "why these places" panel. */
export function topPicks(trip: Trip, count = 5) {
  const ctx = scoreContext({ interests: trip.interests, keywords: trip.keywords, budget: trip.budget, days: trip.days.length, pace: trip.pace, rainy: trip.rainy })
  return poisByCity(trip.city)
    .map((poi) => ({ poi, parts: scorePoi(poi, ctx) }))
    .sort((a, b) => b.parts.score - a.parts.score)
    .slice(0, count)
}
