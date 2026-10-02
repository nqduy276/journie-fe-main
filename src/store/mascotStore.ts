import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Di's preferences: whether it is out at all, and whether it points at the control under the pointer. */
type MascotPrefs = {
  hidden: boolean
  point: boolean
  setHidden: (hidden: boolean) => void
  setPoint: (point: boolean) => void
}

export const useMascotPrefs = create<MascotPrefs>()(
  persist(
    (set) => ({
      hidden: false,
      point: true,
      setHidden: (hidden) => set({ hidden }),
      setPoint: (point) => set({ point }),
    }),
    { name: 'journie-di-prefs', version: 1 },
  ),
)
