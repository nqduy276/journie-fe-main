import { create } from 'zustand'
import type { FocusPoint, MascotMood } from '../components/mascot/mascot-context'

/**
 * What the corner Di is doing right now. Any other Di that should share its feelings and gestures (the big one
 * on the dashboard) reads this instead of keeping a mood of its own.
 */
type DiLive = {
  mood: MascotMood
  pointAt: FocusPoint | null
  publish: (state: { mood: MascotMood; pointAt: FocusPoint | null }) => void
}

export const useDiLive = create<DiLive>()((set) => ({
  mood: 'idle',
  pointAt: null,
  publish: (state) => set(state),
}))
