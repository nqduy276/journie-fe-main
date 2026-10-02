import { AnimatePresence, motion } from 'motion/react'

/** The brand lamp as a password toggle. Rub it and a beam of light sweeps across the field, revealing what is typed. */
export function LampToggle({ on, onToggle, labelOn, labelOff }: { on: boolean; onToggle: () => void; labelOn: string; labelOff: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? labelOn : labelOff}
      title={on ? labelOn : labelOff}
      className="grid size-10 place-items-center text-[color:var(--a-muted)] transition-colors hover:text-[color:var(--a-accent)]"
    >
      <motion.svg
        viewBox="0 0 32 32"
        width="27"
        height="27"
        className={on ? 'lamp-on' : ''}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        animate={on ? { rotate: [0, -10, 8, -4, 0] } : { rotate: 0 }}
        transition={{ duration: 0.7 }}
      >
        <path d="M5 21C5 25 9 27 15 27S24 25 25 21Z" fill="currentColor" fillOpacity={on ? 0.25 : 0.08} />
        <path d="M11 16C11 12 14 10 17 10S23 12 23 16" />
        <path d="M17 10V8M15 8H19" />
        <path d="M25 18C27 17 29 15 30 12" />
        <path d="M5 21C3 21 2 19 3 17" />
        <path d="M12 27V29H20V27" />
        <AnimatePresence>
          {on && (
            <motion.path
              d="M30 12C28 8 31 6 29 3C26 7 27 9 30 12Z"
              fill="currentColor"
              stroke="none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.2, 0.95, 1.15], opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: 'mirror' }}
              style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
            />
          )}
        </AnimatePresence>
      </motion.svg>
    </button>
  )
}

/** The beam drawn over a field while the lamp is on. */
export function LampBeam({ on }: { on: boolean }) {
  return (
    <AnimatePresence>
      {on && (
        <motion.div
          className="lamp-beam"
          initial={{ scaleX: 0.1, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1, rotate: [0, -6, 5, -3, 0] }}
          exit={{ scaleX: 0.2, opacity: 0 }}
          transition={{ scaleX: { type: 'spring', stiffness: 120, damping: 16 }, opacity: { duration: 0.3 }, rotate: { duration: 2.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.2 } }}
          aria-hidden="true"
        />
      )}
    </AnimatePresence>
  )
}
