import { cityById } from './pois'
import { haversineKm } from './geo'
import type { Interests, Poi } from './types'

export type { Interests }

export type ScoreContext = {
  interests: Interests
  /** Extra tags the user asked for in free text (e.g. "rooftop", "viewpoint"). */
  keywords: string[]
  /** Budget per stop that still feels comfortable (VND). */
  perStopBudget: number
  rainy: boolean
}

/** Weights of Eq. (3): S_i = αC_i + βR_i + γP_i + δB_i + εG_i. Empirical, to be validated. */
export const WEIGHTS = { alpha: 0.38, beta: 0.2, gamma: 0.1, delta: 0.12, epsilon: 0.2 } as const

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export type ScoreParts = { c: number; r: number; p: number; b: number; g: number; score: number }

export function scorePoi(poi: Poi, ctx: ScoreContext): ScoreParts {
  const interest = ctx.interests[poi.cat] ?? 0.5
  const keywordHits = ctx.keywords.filter((word) => poi.tags.includes(word)).length
  const c = clamp01(interest + keywordHits * 0.18)
  const r = clamp01((poi.rating - 3.5) / 1.5)
  const p = clamp01(poi.pop / 100)
  const b = poi.cost <= ctx.perStopBudget ? 1 : clamp01(1 - (poi.cost - ctx.perStopBudget) / Math.max(1, ctx.perStopBudget))
  const city = cityById[poi.city]
  const g = clamp01(1 - haversineKm(poi, city) / city.radiusKm)

  let score = WEIGHTS.alpha * c + WEIGHTS.beta * r + WEIGHTS.gamma * p + WEIGHTS.delta * b + WEIGHTS.epsilon * g
  if (ctx.rainy) score *= poi.indoor ? 1.08 : 0.78
  return { c, r, p, b, g, score: clamp01(score) }
}

export type Reason = { key: 'match' | 'rating' | 'budget' | 'central' | 'popular' | 'indoor'; value: number }

/** Why the planner liked this POI: the top two contributions in Eq. (3), for the "explain" chips. */
export function explainPoi(parts: ScoreParts, poi: Poi, rainy: boolean): Reason[] {
  const items: Reason[] = [
    { key: 'match', value: WEIGHTS.alpha * parts.c },
    { key: 'rating', value: WEIGHTS.beta * parts.r },
    { key: 'budget', value: WEIGHTS.delta * parts.b },
    { key: 'central', value: WEIGHTS.epsilon * parts.g },
    { key: 'popular', value: WEIGHTS.gamma * parts.p },
  ]
  if (rainy && poi.indoor) items.push({ key: 'indoor', value: 0.3 })
  return items.sort((a, b) => b.value - a.value).slice(0, 2)
}
