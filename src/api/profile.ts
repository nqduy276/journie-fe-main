import { readStore, writeStore } from './http'

const ONBOARDING_KEY = 'journie-onboarding-v1'

/** Interests picked during sign-up; the profile page seeds its taste sliders from these. */
export function saveOnboarding(userId: string, interests: string[]) {
  const all = readStore<Record<string, string[]>>(ONBOARDING_KEY, {})
  writeStore(ONBOARDING_KEY, { ...all, [userId]: interests })
}

export function readOnboarding(userId: string): string[] {
  return readStore<Record<string, string[]>>(ONBOARDING_KEY, {})[userId] ?? []
}
