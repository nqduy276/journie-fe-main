import { useDiLive } from '../../store/diLiveStore'
import { DiAvatar } from './DiAvatar'

/** A Di that shares the corner Di's mood and gestures: it cheers, dozes, waves and points exactly when that one does. */
export function DiMirror({ className = '' }: { className?: string }) {
  const mood = useDiLive((state) => state.mood)
  const pointAt = useDiLive((state) => state.pointAt)
  return <DiAvatar mood={mood} pointAt={pointAt} className={className} />
}
