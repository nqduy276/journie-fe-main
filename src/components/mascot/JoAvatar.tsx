import { useMemo, useRef } from 'react'
import type { WeatherKind } from '../icons'
import { Jo } from './Jo'
import { MascotContext, type MascotControl, type MascotMood } from './mascot-context'

/** Jo outside the auth form: a fixed mood, still tracking the pointer, blinking and dressing for the weather. */
export function JoAvatar({ mood = 'idle', className = '', weather, trail = true }: { mood?: MascotMood; className?: string; weather?: WeatherKind; trail?: boolean }) {
  const originRef = useRef<HTMLDivElement | null>(null)
  const value = useMemo<MascotControl>(
    () => ({ mood, setMood: () => undefined, focusPoint: null, setFocusPoint: () => undefined, errorTick: 0, originRef }),
    [mood],
  )
  return (
    <MascotContext.Provider value={value}>
      <Jo className={className} weather={weather} trail={trail} />
    </MascotContext.Provider>
  )
}
