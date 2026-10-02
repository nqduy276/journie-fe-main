import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { siteConfig } from '../../content/site'
import { useTr } from '../../hooks/useTr'
import { LangSwitch } from '../LangSwitch'
import { MagicCursor } from '../MagicCursor'
import { Genie } from './Genie'
import { GenieContext, type FocusPoint, type GenieControl, type GenieMood } from './genie-context'
import { NightScene } from './NightScene'

type Props = {
  children: ReactNode
  /** What Jinnie says for each mood on this page. */
  lines: Partial<Record<GenieMood, string>>
}

/**
 * Full-screen night scene with Jinnie on a flying carpet beside the page's form.
 * Forms drive the genie through `useGenie()`.
 */
export function AuthShell({ children, lines }: Props) {
  const { tr } = useTr()
  const [mood, setMoodState] = useState<GenieMood>('idle')
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null)
  const [errorTick, setErrorTick] = useState(0)
  const originRef = useRef<HTMLDivElement | null>(null)

  const setMood = useCallback((next: GenieMood) => {
    if (next === 'error') setErrorTick((tick) => tick + 1)
    setMoodState(next)
  }, [])

  const control = useMemo<GenieControl>(
    () => ({ mood, setMood, focusPoint, setFocusPoint, errorTick, originRef }),
    [mood, setMood, focusPoint, errorTick],
  )

  const line = lines[mood] ?? lines.idle ?? ''

  return (
    <GenieContext.Provider value={control}>
      <div className="relative isolate min-h-dvh overflow-x-clip bg-night text-paper">
        <MagicCursor />
        <NightScene />

        <header className="relative z-20 mx-auto flex w-[min(100%-2rem,80rem)] items-center justify-between py-4 sm:py-6">
          <Link to="/" className="group flex items-center gap-2.5" aria-label={tr('Về trang chủ Journie', 'Back to Journie home')}>
            <img src={siteConfig.logoLockupLight} alt="" width="600" height="600" className="h-16 w-auto transition-transform duration-500 group-hover:-rotate-3 sm:h-20" />
            <span className="sr-only">Journie</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden items-center gap-1.5 text-xs font-medium text-paper/65 transition-colors hover:text-gold sm:inline-flex"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              {tr('Trang chủ', 'Home')}
            </Link>
            <LangSwitch />
          </div>
        </header>

        <main
          id="main-content"
          className="relative z-10 mx-auto grid w-[min(100%-2rem,80rem)] items-center gap-2 pb-16 pt-2 lg:min-h-[calc(100dvh-6.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(26rem,30rem)] lg:gap-12 lg:pb-10"
        >
          <section className="relative flex flex-col items-center lg:items-start lg:pl-24 xl:pl-40" aria-label={tr('Thần đèn Jinnie', 'Jinnie the genie')}>
            <div className="relative flex w-full max-w-md flex-row items-end justify-center gap-3 lg:max-w-none lg:flex-col lg:items-center">
              <div className="relative order-2 min-w-0 flex-1 lg:order-1 lg:flex-none">
                <div className="speech-bubble" role="status" aria-live="polite">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={line}
                      initial={{ opacity: 0, y: 10, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    >
                      {line}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
              <div className="order-1 w-32 shrink-0 sm:w-40 lg:order-2 lg:w-[min(28vw,24rem,calc(54dvh*0.766))]">
                <div className="aspect-[360/470] w-full">
                  <Genie className="h-full w-full" />
                </div>
                <div className="carpet" aria-hidden="true" />
              </div>
            </div>
          </section>

          <section className="relative lg:justify-self-end lg:self-center" aria-live="polite">
            {children}
          </section>
        </main>
      </div>
    </GenieContext.Provider>
  )
}
