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
  goals: string[]
  pace: Pace
  budgetPerDay: number
  interests: Interests
  dietary: string[]
  transport: TransportPref
  alerts: { traffic: boolean; weather: boolean; closure: boolean; delay: boolean }
  saved: string[]
}

export const goalOptions = [
  { id: 'relax', vi: 'Thư giãn', en: 'Unwind' },
  { id: 'discover', vi: 'Khám phá văn hóa', en: 'Discover culture' },
  { id: 'foodie', vi: 'Ăn khắp nơi', en: 'Eat everywhere' },
  { id: 'photo', vi: 'Chụp ảnh đẹp', en: 'Great photos' },
  { id: 'family', vi: 'Đi cùng gia đình', en: 'Family trip' },
  { id: 'budget', vi: 'Tiết kiệm', en: 'Save money' },
] as const

function defaults(userId: string, name: string): Profile {
  const picked = readOnboarding(userId)
  const interests: Interests = {}
  for (const id of picked) interests[id as keyof Interests] = 0.9
  return {
    userId,
    name,
    goals: [],
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
  return all[userId] ?? defaults(userId, name)
}

export const getProfile = (userId: string, name: string) => latency(() => readProfile(userId, name), 200, 420)

export function saveProfile(profile: Profile) {
  return latency(() => {
    const all = readStore<Record<string, Profile>>(PROFILE_KEY, {})
    writeStore(PROFILE_KEY, { ...all, [profile.userId]: profile })
    return profile
  }, 300, 600)
}
