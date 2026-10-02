import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Wand2 } from 'lucide-react'
import { useTr } from '../../hooks/useTr'
import { SKY_LABEL, useSky, useWeatherStore, type WeatherMode } from '../../store/weatherStore'
import { WeatherIcon, type WeatherKind } from '../icons'

const OPTIONS: WeatherKind[] = ['sunny', 'cloudy', 'rain', 'storm', 'night']

/** Shows the current sky and lets anyone pin another one, so the whole app can be seen in any weather. */
export function WeatherChip({ tone = 'light', align = 'left', direction = 'down', compact = false }: { tone?: 'light' | 'dark'; align?: 'left' | 'right'; direction?: 'down' | 'up'; /** Icon and temperature only, for tight headers. */ compact?: boolean }) {
  const { tr, language } = useTr()
  const sky = useSky()
  const mode = useWeatherStore((state) => state.mode)
  const setMode = useWeatherStore((state) => state.setMode)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  const pick = (next: WeatherMode) => {
    setMode(next)
    setOpen(false)
  }

  const dark = tone === 'dark'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`group inline-flex items-center gap-2 border py-1 pl-1.5 pr-3 text-left transition-colors ${
          dark ? 'border-paper/20 text-paper hover:border-sun' : 'border-forest/20 text-ink hover:border-terracotta'
        } rounded-full`}
      >
        <span className={`grid size-8 place-items-center rounded-full ${dark ? 'bg-paper/10' : 'bg-forest/6'}`}>
          <motion.span key={sky.kind} initial={{ rotate: -40, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }} className="block">
            <WeatherIcon kind={sky.kind} size={24} />
          </motion.span>
        </span>
        <span className="leading-tight">
          <span className="tabular block text-[0.8rem] font-bold">{sky.tempC}°C</span>
          <span className={`${compact ? 'hidden' : 'block'} text-[0.64rem] ${dark ? 'text-paper/60' : 'text-ink/55'}`}>
            {sky.label[language === 'vi' ? 0 : 1]}
            {sky.auto && ` · ${tr('tự động', 'auto')}`}
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
            className={`absolute z-[60] w-64 border border-forest/20 bg-paper p-2 text-ink shadow-[0_24px_50px_-20px_rgba(13,40,34,0.6)] ${align === 'right' ? 'right-0' : 'left-0'} ${direction === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'}`}
            role="menu"
          >
            <p className="px-2 pb-1.5 pt-1 text-[0.7rem] font-semibold text-ink/55">{tr('Xem app dưới bầu trời nào?', 'Which sky do you want to see?')}</p>
            <ul className="grid grid-cols-5 gap-1">
              {OPTIONS.map((kind) => {
                const active = mode === kind
                return (
                  <li key={kind}>
                    <button type="button" role="menuitemradio" aria-checked={active} onClick={() => pick(kind)} className={`flex w-full flex-col items-center gap-1 px-1 py-2 text-[0.62rem] font-semibold transition-colors ${active ? 'bg-forest text-paper' : 'text-ink/70 hover:bg-forest/8'}`}>
                      <WeatherIcon kind={kind} size={26} />
                      {SKY_LABEL[kind][language === 'vi' ? 0 : 1]}
                    </button>
                  </li>
                )
              })}
            </ul>
            <button type="button" role="menuitemradio" aria-checked={mode === 'auto'} onClick={() => pick('auto')} className={`mt-1.5 flex w-full items-center gap-2 px-2.5 py-2 text-[0.78rem] font-semibold transition-colors ${mode === 'auto' ? 'bg-terracotta/12 text-terracotta' : 'text-ink/70 hover:bg-forest/8'}`}>
              <Wand2 size={15} aria-hidden="true" /> {tr('Tự động theo giờ và dự báo', 'Automatic: follow the clock and forecast')}
              {mode === 'auto' && <Check size={14} className="ml-auto" aria-hidden="true" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
