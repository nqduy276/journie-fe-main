import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { siteConfig } from '../../content/site'
import { useTr } from '../../hooks/useTr'
import { useSky, type Phase, type Weather } from '../../store/weatherStore'
import { LangSwitch } from '../LangSwitch'
import { MagicCursor } from '../MagicCursor'
import { Di } from '../mascot/Di'
import { MascotContext, useMascot, type FocusPoint, type MascotControl, type MascotMood } from '../mascot/mascot-context'
import { Birds, Mist } from '../scenes/primitives'
import { karstPath, type Peak } from '../scenes/shapes'
import { WeatherChip } from '../weather/WeatherChip'
import { WeatherLayer } from '../weather/WeatherLayer'
import { LightContext, type LightControl } from './light-context'
import { ChestSpot, CliffNoteSpot, ConstellationSpot, FirefliesSpot, FishSpot, FlockSpot, KiteSpot, LanternSpot, LotusSpot } from './LightSpots'
import { useLit } from './use-lit'

const KEYS = (['day', 'night'] as const).flatMap((phase) => (['clear', 'cloudy', 'rain', 'storm'] as const).map((weather) => `${phase}-${weather}` as const))

const farPeaks: Peak[] = [[90, 150, 62], [270, 230, 84], [470, 170, 70], [690, 265, 96], [900, 190, 76], [1110, 250, 92], [1330, 180, 72]]
const midPeaks: Peak[] = [[180, 190, 78], [410, 130, 64], [610, 240, 90], [830, 150, 70], [1040, 220, 86], [1260, 160, 74], [1420, 200, 60]]
const nearPeaks: Peak[] = [[40, 110, 60], [340, 160, 74], [560, 100, 58], [980, 140, 72], [1190, 120, 62], [1400, 170, 80]]

const SUN_SHOW: Record<Weather, number> = { clear: 1, cloudy: 0.35, rain: 0, storm: 0 }
const MOON_SHOW: Record<Weather, number> = { clear: 1, cloudy: 0.55, rain: 0.22, storm: 0 }

/** The moon, with a face that only shows when the torch finds it. */
function Moon({ weather }: { weather: Weather }) {
  const { ref, lit } = useLit(150)
  return (
    <div
      ref={ref}
      className="auth-moon absolute left-[2.5%] top-[24%] size-24 transition-opacity duration-[1400ms] max-lg:left-[27%] max-lg:top-[1.4rem] max-lg:size-10"
      data-lit={lit}
      style={{ opacity: MOON_SHOW[weather] }}
    >
      <svg viewBox="0 0 100 100" className="size-full overflow-visible">
        <defs>
          <radialGradient id="auth-moon-fill" cx="36%" cy="34%" r="75%">
            <stop offset="0" stopColor="#fff7de" />
            <stop offset="0.6" stopColor="#f0e3b8" />
            <stop offset="1" stopColor="#d9c98f" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#auth-moon-fill)" />
        <circle cx="34" cy="36" r="7" fill="#d3c387" opacity="0.5" />
        <circle cx="66" cy="62" r="10" fill="#d3c387" opacity="0.42" />
        <g className="auth-moon-face" stroke="#4a3b1c" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M30 44Q36 38 42 44" />
          <path d="M58 44Q64 38 70 44" strokeDasharray="1 0" className="auth-moon-wink" />
          <path d="M38 58Q50 70 62 58" />
          <ellipse cx="28" cy="56" rx="6" ry="4" fill="#ec9a86" stroke="none" opacity="0.7" />
          <ellipse cx="72" cy="56" rx="6" ry="4" fill="#ec9a86" stroke="none" opacity="0.7" />
        </g>
      </svg>
    </div>
  )
}

/** Karst ridges, mist, sun and moon: the landing page's scenery, tinted by the sky it is under. */
function Backdrop({ phase, weather }: { phase: Phase; weather: Weather }) {
  const night = phase === 'night'
  const gloomy = weather === 'rain' || weather === 'storm'
  return (
    <div className="pointer-events-none absolute inset-0 -z-[2] overflow-hidden" aria-hidden="true">
      <div className="absolute -right-[8%] top-[-6%] size-[40rem] transition-opacity duration-[1400ms] max-sm:size-[22rem]" style={{ opacity: night ? 0 : SUN_SHOW[weather] }}>
        <div className="scene-sun size-full rounded-full" />
      </div>
      <div className="absolute inset-0 transition-opacity duration-[1400ms]" style={{ opacity: night ? 1 : 0 }}>
        <Moon weather={weather} />
      </div>
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

/** Things hidden in the margins of the page. They only show once the torch is on, and wake when the light reaches them. */
function BackdropSpots({ night }: { night: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-[1] max-lg:hidden" aria-hidden="true">
      <LanternSpot style={{ right: '5.2%', top: '19%' }} />
      <LanternSpot small style={{ right: '9.8%', top: '14%' }} />
      <ChestSpot style={{ left: '4.5%', bottom: '6.5%' }} />
      <LotusSpot style={{ right: '4.5%', bottom: '5%' }} />
      {night ? <ConstellationSpot style={{ left: '37%', top: '1.2%' }} /> : <KiteSpot style={{ left: '41%', top: '1.5%' }} />}
      <FlockSpot night={night} style={{ left: '57%', top: '4%' }} />
    </div>
  )
}

type Props = {
  children: ReactNode
  /** What Di says for each mood on this page. */
  lines: Partial<Record<MascotMood, string>>
}

/** Visual half of the auth card: the Tràng An arch with Di flying in it, and a few secrets in the photo. */
function Visual({ lines }: { lines: Props['lines'] }) {
  const { tr } = useTr()
  const { mood, setMood } = useMascot()
  const { ref: diRef, lit } = useLit(120)
  const line = lines[mood] ?? lines.idle ?? ''
  const lastLit = useRef(false)

  // Shining the torch on Di makes it wave, once per visit of the light.
  useEffect(() => {
    if (lit && !lastLit.current && mood === 'idle') {
      setMood('wave')
      const timer = window.setTimeout(() => setMood('idle'), 1800)
      lastLit.current = true
      return () => window.clearTimeout(timer)
    }
    if (!lit) lastLit.current = false
  }, [lit, mood, setMood])

  return (
    <div className="flex p-3 sm:p-4">
      <div className="auth-visual flex w-full flex-col justify-end">
        <img src={siteConfig.heroImage} alt="" width="1280" height="853" decoding="async" />
        <p className="absolute inset-x-0 top-[11%] text-center text-[0.62rem] font-semibold tracking-[0.22em] text-paper/80">20.2506° N, 105.9745° E</p>

        <CliffNoteSpot text={tr('Chào mừng trở lại!', 'Welcome back!')} style={{ left: '50%', top: '27%', transform: 'translateX(-50%) rotate(-4deg)' }} />
        <FirefliesSpot style={{ left: '8%', top: '46%' }} />
        <FishSpot style={{ left: '10%', bottom: '17%' }} />

        <div className="relative z-10 flex flex-col items-center px-5 pb-6 text-center">
          <div className="di-bubble mb-3 max-w-[16.5rem]" data-tail="bottom" role="status" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.p key={line} initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}>
                {line}
              </motion.p>
            </AnimatePresence>
          </div>
          <div ref={diRef}>
            <Di className="aspect-[320/300] w-44 sm:w-52 md:w-60" />
          </div>
          <p className="h-display mt-1 text-[1.45rem] text-paper">{tr('Tràng An, Ninh Bình', 'Trang An, Ninh Binh')}</p>
          <p className="mt-0.5 max-w-[17rem] text-[0.78rem] leading-snug text-paper/75">{tr('Đi Việt Nam, theo cách của riêng bạn.', 'See Vietnam your own way.')}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Full-screen auth page: landing-style scenery under the current sky (time of day and weather are
 * independent), and a split card with Di on the left and the form on the right. A torch (the lamp
 * button in the password field) throws a soft light that follows the pointer and wakes hidden things.
 */
export function AuthShell({ children, lines }: Props) {
  const { tr } = useTr()
  const sky = useSky()
  const [mood, setMoodState] = useState<MascotMood>('idle')
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null)
  const [errorTick, setErrorTick] = useState(0)
  const [lightOn, setLightOn] = useState(false)
  const originRef = useRef<HTMLDivElement | null>(null)

  const setMood = useCallback((next: MascotMood) => {
    if (next === 'error') setErrorTick((tick) => tick + 1)
    setMoodState(next)
  }, [])

  const control = useMemo<MascotControl>(() => ({ mood, setMood, focusPoint, setFocusPoint, errorTick, originRef }), [mood, setMood, focusPoint, errorTick])

  // The light drifts after the pointer a little late, like a lantern on a string.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const lx = useSpring(px, { stiffness: 70, damping: 16, mass: 0.9 })
  const ly = useSpring(py, { stiffness: 70, damping: 16, mass: 0.9 })
  const lxPx = useTransform(lx, (v) => `${v}px`)
  const lyPx = useTransform(ly, (v) => `${v}px`)

  const aimAt = useCallback(
    (x: number, y: number) => {
      px.set(x)
      py.set(y)
    },
    [px, py],
  )

  useEffect(() => {
    if (!lightOn) return
    const onPointer = (event: PointerEvent) => aimAt(event.clientX, event.clientY)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [lightOn, aimAt])

  const light = useMemo<LightControl>(() => ({ on: lightOn, setOn: setLightOn, x: lx, y: ly, aimAt }), [lightOn, lx, ly, aimAt])
  const night = sky.night

  return (
    <LightContext.Provider value={light}>
      <MascotContext.Provider value={control}>
        <div className="auth-root" data-phase={sky.phase} data-weather={sky.weather} data-light={lightOn}>
          <MagicCursor />
          {KEYS.map((key) => (
            <div key={key} className="auth-sky" data-key={key} data-on={key === sky.key} aria-hidden="true" />
          ))}
          <Backdrop phase={sky.phase} weather={sky.weather} />
          <BackdropSpots night={night} />
          <motion.div className="light-dark" data-on={lightOn && night} style={{ ['--lx' as string]: lxPx, ['--ly' as string]: lyPx }} aria-hidden="true" />
          <WeatherLayer phase={sky.phase} weather={sky.weather} />

          <header className="relative z-20 mx-auto flex w-[min(100%-2rem,72rem)] items-center justify-between py-4 sm:py-6">
            <Link to="/" className="group flex items-center gap-2.5" aria-label={tr('Về trang chủ Journie', 'Back to Journie home')}>
              <img src={night ? siteConfig.logoLockupLight : siteConfig.logoLockup} alt="" width="600" height="600" className="h-14 w-auto transition-transform duration-500 group-hover:-rotate-3 sm:h-[4.5rem]" />
              <span className="sr-only">Journie</span>
            </Link>
            <div className="flex items-center gap-2.5 sm:gap-4">
              <Link to="/" className="hidden items-center gap-1.5 text-xs font-medium text-[color:var(--a-muted)] transition-colors hover:text-[color:var(--a-accent)] sm:inline-flex">
                <ArrowLeft size={14} aria-hidden="true" />
                {tr('Trang chủ', 'Home')}
              </Link>
              <WeatherChip tone={night ? 'dark' : 'light'} align="right" />
              <LangSwitch tone={night ? 'dark' : 'light'} />
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

          <motion.div className="light-glow" data-on={lightOn} style={{ ['--lx' as string]: lxPx, ['--ly' as string]: lyPx }} aria-hidden="true" />
        </div>
      </MascotContext.Provider>
    </LightContext.Provider>
  )
}
