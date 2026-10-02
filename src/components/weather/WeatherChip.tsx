import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Wand2 } from 'lucide-react'
import { useTr } from '../../hooks/useTr'
import { withSkyTransition } from '../../lib/skyTransition'
import { PHASE_LABEL, WEATHER_LABEL, useSky, useWeatherStore, type PhaseMode, type Weather, type WeatherMode } from '../../store/weatherStore'
import { SkyIcon } from '../icons'

const WEATHERS: Weather[] = ['clear', 'cloudy', 'rain', 'storm']

/** Shows the current sky and lets anyone pin the time of day and the weather, so the whole app can be seen in any of them. */
export function WeatherChip({ tone = 'light', align = 'left', direction = 'down', compact = false }: { tone?: 'light' | 'dark'; align?: 'left' | 'right'; direction?: 'down' | 'up'; /** Icon and temperature only, for tight headers. */ compact?: boolean }) {
  const { tr, language } = useTr()
  const sky = useSky()
  const phaseMode = useWeatherStore((state) => state.phaseMode)
  const weatherMode = useWeatherStore((state) => state.weatherMode)
  const setPhaseMode = useWeatherStore((state) => state.setPhaseMode)
  const setWeatherMode = useWeatherStore((state) => state.setWeatherMode)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const i = language === 'vi' ? 0 : 1

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pickPhase = (next: PhaseMode, event: React.MouseEvent) => {
    if (next === phaseMode) return
    withSkyTransition(() => setPhaseMode(next), { x: event.clientX, y: event.clientY })
  }
  const pickWeather = (next: WeatherMode) => setWeatherMode(next)

  const dark = tone === 'dark'
  const phaseOptions: { value: PhaseMode; label: string; node: React.ReactNode }[] = [
    { value: 'auto', label: tr('Tự động', 'Auto'), node: <Wand2 size={15} aria-hidden="true" /> },
    { value: 'day', label: tr('Ngày', 'Day'), node: <SkyIcon phase="day" weather="clear" size={22} /> },
    { value: 'night', label: tr('Đêm', 'Night'), node: <SkyIcon phase="night" weather="clear" size={22} /> },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={tr('Bầu trời: ', 'Sky: ') + `${PHASE_LABEL[sky.phase][i]}, ${WEATHER_LABEL[sky.weather][i]}, ${sky.tempC}°C`}
        className={`group inline-flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-left transition-colors ${dark ? 'border-paper/20 text-paper hover:border-sun' : 'border-forest/20 text-ink hover:border-terracotta'}`}
      >
        <span className={`relative grid size-8 place-items-center overflow-hidden rounded-full ${dark ? 'bg-paper/10' : 'bg-forest/6'}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={sky.key} initial={{ y: sky.night ? 26 : -26, rotate: -50, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} exit={{ y: sky.night ? -26 : 26, rotate: 50, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="block">
              <SkyIcon phase={sky.phase} weather={sky.weather} size={24} />
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="leading-tight">
          <span className="tabular block text-[0.8rem] font-bold">{sky.tempC}°C</span>
          <span className={`${compact ? 'hidden' : 'block'} text-[0.64rem] ${dark ? 'text-paper/60' : 'text-ink/55'}`}>
            {PHASE_LABEL[sky.phase][i]} · {WEATHER_LABEL[sky.weather][i]}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: direction === 'down' ? -8 : 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === 'down' ? -6 : 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={`sky-pop absolute z-[60] w-[17.5rem] border border-forest/25 bg-paper p-3 text-ink shadow-[0_24px_50px_-20px_rgba(13,40,34,0.6)] ${align === 'right' ? 'right-0' : 'left-0'} ${direction === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'}`}
            role="dialog"
            aria-label={tr('Chọn bầu trời', 'Choose the sky')}
          >
            <p className="pb-1.5 text-[0.7rem] font-semibold text-ink/55">{tr('Thời gian trong ngày', 'Time of day')}</p>
            <div role="radiogroup" aria-label={tr('Thời gian trong ngày', 'Time of day')} className="grid grid-cols-3 gap-1">
              {phaseOptions.map((option) => {
                const active = phaseMode === option.value
                return (
                  <button key={option.value} type="button" role="radio" aria-checked={active} onClick={(event) => pickPhase(option.value, event)} className={`flex flex-col items-center gap-0.5 border px-1 py-2 text-[0.68rem] font-semibold transition-colors ${active ? 'border-terracotta bg-terracotta/12 text-terracotta' : 'border-forest/15 text-ink/70 hover:border-forest/40'}`}>
                    <span className="grid h-6 place-items-center">{option.node}</span>
                    {option.label}
                  </button>
                )
              })}
            </div>

            <p className="pb-1.5 pt-3 text-[0.7rem] font-semibold text-ink/55">{tr('Thời tiết', 'Weather')}</p>
            <div role="radiogroup" aria-label={tr('Thời tiết', 'Weather')} className="grid grid-cols-5 gap-1">
              <button type="button" role="radio" aria-checked={weatherMode === 'auto'} onClick={() => pickWeather('auto')} className={`flex flex-col items-center gap-0.5 border px-0.5 py-2 text-[0.62rem] font-semibold transition-colors ${weatherMode === 'auto' ? 'border-terracotta bg-terracotta/12 text-terracotta' : 'border-forest/15 text-ink/70 hover:border-forest/40'}`}>
                <span className="grid h-6 place-items-center">
                  <Wand2 size={15} aria-hidden="true" />
                </span>
                {tr('Tự động', 'Auto')}
              </button>
              {WEATHERS.map((weather) => {
                const active = weatherMode === weather
                return (
                  <button key={weather} type="button" role="radio" aria-checked={active} onClick={() => pickWeather(weather)} className={`flex flex-col items-center gap-0.5 border px-0.5 py-2 text-[0.62rem] font-semibold transition-colors ${active ? 'border-terracotta bg-terracotta/12 text-terracotta' : 'border-forest/15 text-ink/70 hover:border-forest/40'}`}>
                    <SkyIcon phase={sky.phase} weather={weather} size={24} />
                    {WEATHER_LABEL[weather][i]}
                  </button>
                )
              })}
            </div>
            <p className="pt-2.5 text-[0.68rem] leading-snug text-ink/50">{tr('Tự động: ban đêm sau 18:30 và thời tiết theo dự báo của thành phố.', 'Auto: night after 18:30, weather from the city forecast.')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
