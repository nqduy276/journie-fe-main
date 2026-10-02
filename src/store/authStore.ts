import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'traveler' | 'admin'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
}

type AuthState = {
  user: SessionUser | null
  signIn: (user: SessionUser) => void
  signOut: () => void
}

/** Session lives in localStorage; the real backend would swap this for a JWT cookie. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    { name: 'journie-session', version: 1 },
  ),
)
