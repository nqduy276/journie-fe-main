import type { Interests, Pace, TransportPref } from '../domain/types'
import { latency, readStore, writeStore } from './http'

const ONBOARDING_KEY = 'journie-onboarding-v1'
const PROFILE_KEY = 'journie-profiles-v1'

/** Interests picked during sign-up; the profile page seeds its taste sliders from these. */
export function saveOnboarding(userId: string, interests: string[]) {
  const all = readStore<Record<string, string[]>>(ONBOARDING_KEY, {})
  writeStore(ONBOARDING_KEY, { ...all, [userId]: interests })
}

export function readOnboarding(userId: string): string[] {
  return readStore<Record<string, string[]>>(ONBOARDING_KEY, {})[userId] ?? []
}

export type Profile = {
  userId: string
  name: string
  /** The traveler's own words about how they like to travel; Di reads interests and "avoid" out of it. */
  about: string
  pace: Pace
  budgetPerDay: number
  interests: Interests
  dietary: string[]
  transport: TransportPref
  alerts: { traffic: boolean; weather: boolean; closure: boolean; delay: boolean }
  saved: string[]
}

function defaults(userId: string, name: string): Profile {
  const picked = readOnboarding(userId)
  const interests: Interests = {}
  for (const id of picked) interests[id as keyof Interests] = 0.9
  return {
    userId,
    name,
    about: '',
    pace: 'balanced',
    budgetPerDay: 900_000,
    interests,
    dietary: [],
    transport: 'bike',
    alerts: { traffic: true, weather: true, closure: true, delay: true },
    saved: [],
  }
}

export const readProfile = (userId: string, name: string): Profile => {
  const all = readStore<Record<string, Profile>>(PROFILE_KEY, {})
  return { ...defaults(userId, name), ...all[userId] }
}

export const getProfile = (userId: string, name: string) => latency(() => readProfile(userId, name), 200, 420)

export function saveProfile(profile: Profile) {
  return latency(() => {
    const all = readStore<Record<string, Profile>>(PROFILE_KEY, {})
    writeStore(PROFILE_KEY, { ...all, [profile.userId]: profile })
    return profile
  }, 300, 600)
}
