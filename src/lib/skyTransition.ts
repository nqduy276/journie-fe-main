import { flushSync } from 'react-dom'

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> }
}

/**
 * Runs a state change inside a View Transition so the new sky grows out of a point (the sun/moon
 * switch) as an expanding circle. Browsers without the API, and people who prefer reduced motion,
 * just get the change.
 */
export function withSkyTransition(update: () => void, origin?: { x: number; y: number }) {
  const doc = document as ViewTransitionDocument
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || calm) {
    update()
    return
  }
  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? window.innerHeight / 2
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const transition = doc.startViewTransition(() => flushSync(update))
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
    .catch(() => undefined)
}
