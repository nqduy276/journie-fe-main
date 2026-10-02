import { useMemo, useRef } from 'react'
import { Genie } from './Genie'
import { GenieContext, type GenieControl, type GenieMood } from './genie-context'

/** Jinnie outside the auth pages: a fixed mood, still tracking the pointer and blinking. */
export function GenieAvatar({ mood = 'idle', className = '' }: { mood?: GenieMood; className?: string }) {
  const originRef = useRef<HTMLDivElement | null>(null)
  const value = useMemo<GenieControl>(
    () => ({ mood, setMood: () => undefined, focusPoint: null, setFocusPoint: () => undefined, errorTick: 0, originRef }),
    [mood],
  )
  return (
    <GenieContext.Provider value={value}>
      <Genie className={className} />
    </GenieContext.Provider>
  )
}
