import { useMemo, useRef } from 'react'
import type { MotionValue } from 'motion/react'
import type { Phase, Weather } from '../../store/weatherStore'
import { Di } from './Di'
import { MascotContext, type MascotControl, type MascotMood } from './mascot-context'

/** Di outside the auth form: a fixed mood, still tracking the pointer, blinking and dressing for the sky. */
export function DiAvatar({ mood = 'idle', className = '', phase, weather, trail = true, energy, roll }: { mood?: MascotMood; className?: string; phase?: Phase; weather?: Weather; trail?: boolean; energy?: MotionValue<number>; roll?: MotionValue<number> }) {
  const originRef = useRef<HTMLDivElement | null>(null)
  const value = useMemo<MascotControl>(
    () => ({ mood, setMood: () => undefined, focusPoint: null, setFocusPoint: () => undefined, errorTick: 0, originRef }),
    [mood],
  )
  return (
    <MascotContext.Provider value={value}>
      <Di className={className} phase={phase} weather={weather} trail={trail} energy={energy} roll={roll} />
    </MascotContext.Provider>
  )
}
