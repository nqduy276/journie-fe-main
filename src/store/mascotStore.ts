import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Di's preferences: whether it is out at all, and whether it trails the pointer or waits in the corner. */
type MascotPrefs = {
  hidden: boolean
  follow: boolean
  setHidden: (hidden: boolean) => void
  setFollow: (follow: boolean) => void
}

export const useMascotPrefs = create<MascotPrefs>()(
  persist(
    (set) => ({
      hidden: false,
      follow: true,
      setHidden: (hidden) => set({ hidden }),
      setFollow: (follow) => set({ follow }),
    }),
    { name: 'journie-di', version: 1 },
  ),
)
