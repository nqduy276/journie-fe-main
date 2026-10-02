import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { Khatam } from './art/Khatam'
import { useMotionPrefs } from '../hooks/useMotionPrefs'
import { usePortalStore } from '../store/portalStore'

/**
 * The page-to-page genie transition: a ring of lamp-light grows from the genie until it fills the
 * screen, the route changes underneath it, then the light fades to reveal the new page.
 */
export function PortalWipe() {
  const { phase, to, origin, setPhase } = usePortalStore()
  const navigate = useNavigate()
  const { reduced } = useMotionPrefs()

  useEffect(() => {
    if (phase !== 'closing' || !reduced) return
    navigate(to)
    setPhase('idle')
  }, [navigate, phase, reduced, setPhase, to])

  useEffect(() => {
    if (phase !== 'opening') return
    const timer = window.setTimeout(() => setPhase('idle'), 900)
    return () => window.clearTimeout(timer)
  }, [phase, setPhase])

  if (phase === 'idle' || reduced) return null

  return (
    <motion.div
      key={phase}
      className="portal-wipe fixed inset-0 z-[90]"
      aria-hidden="true"
      initial={
        phase === 'closing'
          ? { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`, opacity: 1 }
          : { opacity: 1 }
      }
      animate={
        phase === 'closing'
          ? { clipPath: `circle(150vmax at ${origin.x}px ${origin.y}px)` }
          : { opacity: 0 }
      }
      transition={
        phase === 'closing'
          ? { duration: 0.95, ease: [0.7, 0, 0.3, 1] }
          : { duration: 0.8, ease: 'easeOut', delay: 0.12 }
      }
      onAnimationComplete={() => {
        if (phase === 'closing') {
          navigate(to)
          setPhase('opening')
        }
      }}
    >
      <div className="girih-drift absolute -inset-16 opacity-60" />
      <div className="absolute inset-0 grid place-items-center">
        <motion.div
          initial={{ scale: 0.4, rotate: -40, opacity: 0 }}
          animate={{ scale: [0.4, 1.1, 1], rotate: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
          className="text-gold"
        >
          <Khatam size={96} />
        </motion.div>
      </div>
    </motion.div>
  )
}
