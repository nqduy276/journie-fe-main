import { createContext, useContext } from 'react'

export type GenieMood = 'idle' | 'watching' | 'hiding' | 'peeking' | 'thinking' | 'error' | 'joy'

export type FocusPoint = { x: number; y: number }

export type GenieControl = {
  mood: GenieMood
  setMood: (mood: GenieMood) => void
  /** Screen position the genie should look at while a field has focus (null = follow the pointer). */
  focusPoint: FocusPoint | null
  setFocusPoint: (point: FocusPoint | null) => void
  /** Bumps whenever something goes wrong, so the genie can shake its head again. */
  errorTick: number
  /** Where the genie stands on screen; the portal transition grows from here. */
  originRef: { current: HTMLDivElement | null }
}

export const GenieContext = createContext<GenieControl | null>(null)

export function useGenie() {
  const value = useContext(GenieContext)
  if (!value) throw new Error('useGenie must be used inside AuthShell')
  return value
}
