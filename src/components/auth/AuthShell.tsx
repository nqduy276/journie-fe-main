import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { siteConfig } from '../../content/site'
import { useTr } from '../../hooks/useTr'
import { useSky } from '../../store/weatherStore'
import { LangSwitch } from '../LangSwitch'
import { MagicCursor } from '../MagicCursor'
import { Jo } from '../mascot/Jo'
import { MascotContext, useMascot, type FocusPoint, type MascotControl, type MascotMood } from '../mascot/mascot-context'
import { Birds, Mist } from '../scenes/primitives'
import { karstPath, type Peak } from '../scenes/shapes'
import { WeatherChip } from '../weather/WeatherChip'
import { WeatherLayer } from '../weather/WeatherLayer'
import type { WeatherKind } from '../icons'

const SKIES: WeatherKind[] = ['sunny', 'cloudy', 'rain', 'storm', 'night']

const farPeaks: Peak[] = [[90, 150, 62], [270, 230, 84], [470, 170, 70], [690, 265, 96], [900, 190, 76], [1110, 250, 92], [1330, 180, 72]]
const midPeaks: Peak[] = [[180, 190, 78], [410, 130, 64], [610, 240, 90], [830, 150, 70], [1040, 220, 86], [1260, 160, 74], [1420, 200, 60]]
const nearPeaks: Peak[] = [[40, 110, 60], [340, 160, 74], [560, 100, 58], [980, 140, 72], [1190, 120, 62], [1400, 170, 80]]

/** Karst ridges, mist, sun and moon: the landing page's scenery, tinted by the sky it is under. */
function Backdrop({ kind }: { kind: WeatherKind }) {
  const night = kind === 'night'
  const gloomy = kind === 'rain' || kind === 'storm'
  return (
    <div className="pointer-events-none absolute inset-0 -z-[2] overflow-hidden" aria-hidden="true">
      <div className="absolute -right-[8%] top-[-6%] size-[40rem] transition-opacity duration-[1400ms] max-sm:size-[22rem]" style={{ opacity: kind === 'sunny' ? 1 : kind === 'cloudy' ? 0.35 : 0 }}>
        <div className="scene-sun size-full rounded-full" />
      </div>
      <div
        className="absolute left-[2.5%] top-[24%] size-24 rounded-full transition-opacity duration-[1400ms] max-lg:left-[27%] max-lg:top-[1.4rem] max-lg:size-10"
        style={{
          opacity: night ? 1 : 0,
          background: 'radial-gradient(circle at 35% 35%, #fff7de, #f0e3b8 60%, #d9c98f)',
          boxShadow: '0 0 70px 24px rgba(240,185,75,0.22)',
        }}
      />
      {!night && !gloomy && (
        <div className="scene" data-live="true">
          <Birds />
        </div>
      )}
      <svg className="ridge absolute inset-x-0 bottom-0 h-[58%] w-full" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice" fill="none">
        <path d={karstPath(1440, 380, 420, farPeaks)} style={{ fill: 'var(--ridge-far)' }} />
      </svg>
      <div className="scene" data-live="true">
        <Mist count={3} seed={4} color={night ? 'rgba(79,184,164,0.16)' : 'rgba(255,252,244,0.85)'} className="top-[40%] h-[40%]" />
      </div>
      <svg className="ridge absolute inset-x-0 bottom-0 h-[44%] w-full" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" fill="none">
        <path d={karstPath(1440, 290, 320, midPeaks)} style={{ fill: 'var(--ridge-mid)' }} />
      </svg>
      <div className="scene" data-live="true">
        <Mist count={3} seed={9} color={night ? 'rgba(79,184,164,0.14)' : 'rgba(255,252,244,0.8)'} className="top-[62%] h-[34%]" />
      </div>
      <svg className="ridge absolute inset-x-0 bottom-0 h-[30%] w-full" viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice" fill="none">
        <path d={karstPath(1440, 215, 230, nearPeaks)} style={{ fill: 'var(--ridge-near)' }} />
      </svg>
    </div>
  )
}

type Props = {
  children: ReactNode
  /** What Jo says for each mood on this page. */
  lines: Partial<Record<MascotMood, string>>
}

/** Visual half of the auth card: the Tràng An arch with Jo standing in it. */
function Visual({ lines }: { lines: Props['lines'] }) {
  const { tr } = useTr()
  const { mood } = useMascot()
  const line = lines[mood] ?? lines.idle ?? ''
  return (
    <div className="flex p-3 sm:p-4">
      <div className="auth-visual flex w-full flex-col justify-end">
        <img src={siteConfig.heroImage} alt="" width="1280" height="853" decoding="async" />
        <p className="absolute inset-x-0 top-[11%] text-center text-[0.62rem] font-semibold tracking-[0.22em] text-paper/80">20.2506° N, 105.9745° E</p>
        <div className="relative z-10 flex flex-col items-center px-5 pb-6 text-center">
          <div className="jo-bubble mb-3 max-w-[16.5rem]" data-tail="bottom" role="status" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.p key={line} initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}>
                {line}
              </motion.p>
            </AnimatePresence>
          </div>
          <Jo className="aspect-[300/340] w-36 sm:w-44 md:w-52" />
          <p className="h-display mt-1 text-[1.45rem] text-paper">{tr('Tràng An, Ninh Bình', 'Trang An, Ninh Binh')}</p>
          <p className="mt-0.5 max-w-[17rem] text-[0.78rem] leading-snug text-paper/75">{tr('Đi Việt Nam, theo cách của riêng bạn.', 'See Vietnam your own way.')}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Full-screen auth page: landing-style scenery under the current sky, and a split card with Jo on the
 * left and the form on the right. Forms drive Jo through `useMascot()`.
 */
export function AuthShell({ children, lines }: Props) {
  const { tr } = useTr()
  const sky = useSky()
  const [mood, setMoodState] = useState<MascotMood>('idle')
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null)
  const [errorTick, setErrorTick] = useState(0)
  const originRef = useRef<HTMLDivElement | null>(null)

  const setMood = useCallback((next: MascotMood) => {
    if (next === 'error') setErrorTick((tick) => tick + 1)
    setMoodState(next)
  }, [])

  const control = useMemo<MascotControl>(() => ({ mood, setMood, focusPoint, setFocusPoint, errorTick, originRef }), [mood, setMood, focusPoint, errorTick])

  return (
    <MascotContext.Provider value={control}>
      <div className="auth-root" data-sky={sky.kind}>
        <MagicCursor />
        {SKIES.map((kind) => (
          <div key={kind} className="auth-sky" data-kind={kind} data-on={kind === sky.kind} aria-hidden="true" />
        ))}
        <Backdrop kind={sky.kind} />
        <WeatherLayer kind={sky.kind} tone={sky.kind === 'night' ? 'dark' : 'light'} plain />

        <header className="relative z-20 mx-auto flex w-[min(100%-2rem,72rem)] items-center justify-between py-4 sm:py-6">
          <Link to="/" className="group flex items-center gap-2.5" aria-label={tr('Về trang chủ Journie', 'Back to Journie home')}>
            <img src={sky.kind === 'night' ? siteConfig.logoLockupLight : siteConfig.logoLockup} alt="" width="600" height="600" className="h-14 w-auto transition-transform duration-500 group-hover:-rotate-3 sm:h-[4.5rem]" />
            <span className="sr-only">Journie</span>
          </Link>
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link to="/" className="hidden items-center gap-1.5 text-xs font-medium text-[color:var(--a-muted)] transition-colors hover:text-[color:var(--a-accent)] sm:inline-flex">
              <ArrowLeft size={14} aria-hidden="true" />
              {tr('Trang chủ', 'Home')}
            </Link>
            <WeatherChip tone={sky.kind === 'night' ? 'dark' : 'light'} align="right" />
            <LangSwitch tone={sky.kind === 'night' ? 'dark' : 'light'} />
          </div>
        </header>

        <main id="main-content" className="relative z-10 mx-auto flex w-[min(100%-1.5rem,72rem)] justify-center pb-16 pt-2 md:min-h-[calc(100dvh-8rem)] md:items-center md:pb-10">
          <div className="auth-card">
            <Visual lines={lines} />
            <section className="relative flex flex-col justify-center px-6 pb-8 pt-3 sm:px-10 md:py-12" aria-live="polite">
              {children}
            </section>
          </div>
        </main>
      </div>
    </MascotContext.Provider>
  )
}
