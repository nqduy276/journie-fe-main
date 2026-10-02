import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CalendarClock, Compass, MapPin, Navigation, Send, Sparkles } from 'lucide-react'
import { readProfile } from '../../api/profile'
import { useProfile, useTrips } from '../../api/queries'
import { WeatherIcon } from '../../components/icons'
import { Tilt } from '../../components/motion/Tilt'
import { DiMirror } from '../../components/mascot/DiMirror'
import { CityCover } from '../../components/CityCover'
import { CountUp } from '../../components/motion/CountUp'
import { EmptyState, Skeleton, SolverBadge } from '../../components/ui/primitives'
import { isRainy, weatherFor } from '../../domain/conditions'
import { cities, cityById, poiById } from '../../domain/pois'
import { addDays, fmtTime, formatDate, todayIso } from '../../domain/time'
import type { City, Trip } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { HeroScene } from '../../components/weather/HeroScene'
import { tripSpend, tripStopCount } from '../../domain/planner'
import { formatVnd } from '../../domain/time'
import { tripTitle } from '../../domain/tripText'

const PLACEHOLDERS: [string, string][] = [
  ['Ba ngày Hội An, đi chậm, ăn món địa phương…', 'Three slow days in Hoi An, local food…'],
  ['Cuối tuần Đà Lạt, săn mây và cà phê view đẹp…', 'Da Lat weekend, clouds and views…'],
  ['Một ngày Sài Gòn, bảo tàng và phở, 1,5 triệu…', 'One day in Saigon, museums and pho, 1.5M…'],
]

function greeting(hour: number, tr: (vi: string, en: string) => string) {
  if (hour < 11) return tr('Chào buổi sáng', 'Good morning')
  if (hour < 14) return tr('Chào buổi trưa', 'Good afternoon')
  if (hour < 18) return tr('Chào buổi chiều', 'Good afternoon')
  return tr('Chào buổi tối', 'Good evening')
}

const dayDiff = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayIso()}T00:00:00`).getTime()) / 86_400_000)

function WeatherGlyph({ condition }: { condition: ReturnType<typeof weatherFor>['condition'] }) {
  return <WeatherIcon kind={condition} size={26} />
}

export function Dashboard() {
  const { tr, language, locale } = useTr()
  const vi = language === 'vi'
  const user = useAuthStore((state) => state.user)!
  const navigate = useNavigate()
  const trips = useTrips()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const [wish, setWish] = useState('')
  const [hint, setHint] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setHint((value) => (value + 1) % PLACEHOLDERS.length), 4200)
    return () => window.clearInterval(timer)
  }, [])

  const live = trips.data?.find((trip) => trip.status === 'live')
  const upcoming = trips.data?.filter((trip) => trip.status === 'upcoming') ?? []
  const done = trips.data?.filter((trip) => trip.status === 'completed') ?? []
  const first = user.name.split(' ').slice(-1)[0]

  const submit = () => {
    if (wish.trim().length > 6) navigate('/app/plan', { state: { wish: wish.trim() } })
    else navigate('/app/plan')
  }

  const recommended = [...cities]
    .map((city) => ({ city, fit: profileFit(city, profile.interests) }))
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 4)

  const totalStops = (trips.data ?? []).reduce((sum, trip) => sum + tripStopCount(trip), 0)
  const totalKm = (trips.data ?? []).reduce((sum, trip) => sum + trip.days.reduce((s, d) => s + d.stops.reduce((k, stop) => k + stop.travelKm, 0), 0), 0)

  return (
    <div className="space-y-8">
      <section className="panel-night grid gap-6 p-6 sm:p-9 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" aria-labelledby="greeting">
        <HeroScene />
        <div>
          <p className="text-sm font-medium text-gold">{formatDate(todayIso(), locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 id="greeting" className="h-display mt-2 text-[2.3rem] text-paper sm:text-[3.1rem]">
            {greeting(new Date().getHours(), tr)}, {first}.
          </h1>
          <p className="mt-3 max-w-lg text-[0.98rem] leading-relaxed text-paper/70">
            {live
              ? tr(`Chuyến “${tripTitle(live, language)}” đang diễn ra. Di đang theo dõi giao thông và thời tiết giúp bạn.`, `“${tripTitle(live, language)}” is under way. Di is watching traffic and weather for you.`)
              : upcoming.length
                ? tr(`Bạn có ${upcoming.length} chuyến sắp tới. Muốn thêm một chuyến nữa?`, `You have ${upcoming.length} trip(s) coming up. Another trip?`)
                : tr('Bạn muốn đi đâu tiếp theo? Hãy kể, Di sẽ dựng lịch trình.', 'Where to next? Tell Di and the itinerary appears.')}
          </p>

          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <label htmlFor="quick-wish" className="sr-only">
              {tr('Kể cho Di nghe chuyến đi', 'Tell Di about your trip')}
            </label>
            <div className="group relative flex items-center rounded-2xl border border-gold/35 bg-night/45 pr-2 transition-[border-color,box-shadow] duration-300 focus-within:border-gold focus-within:shadow-[0_0_0_4px_rgba(246,203,90,0.14)]">
              <Sparkles size={19} className="ml-4 shrink-0 text-gold" aria-hidden="true" />
              <div className="relative min-w-0 flex-1">
                <input
                  id="quick-wish"
                  value={wish}
                  onChange={(event) => setWish(event.target.value)}
                  className="h-14 w-full bg-transparent px-3 font-display text-[1.05rem] italic text-paper caret-gold outline-none"
                  autoComplete="off"
                />
                {!wish && (
                  <AnimatePresence mode="wait">
                    <motion.span key={hint} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="pointer-events-none absolute inset-y-0 left-3 right-3 flex items-center truncate font-display text-[1.05rem] italic text-paper/40">
                      {tr(...PLACEHOLDERS[hint])}
                    </motion.span>
                  </AnimatePresence>
                )}
              </div>
              <button type="submit" className="btn-gold btn-sm shrink-0" aria-label={tr('Gửi cho Di', 'Send to Di')}>
                <Send size={16} aria-hidden="true" />
                <span className="hidden sm:inline">{tr('Lên lịch', 'Plan')}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="relative hidden items-end justify-center lg:flex">
          <div className="w-[min(100%,12rem)]">
            <DiMirror className="aspect-[320/300] w-full" />
          </div>
        </div>
      </section>

      {trips.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : live || upcoming.length ? (
        <section aria-labelledby="focus-trips" className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <h2 id="focus-trips" className="sr-only">
            {tr('Chuyến đi của bạn', 'Your trips')}
          </h2>
          {live ? <LiveCard trip={live} /> : <UpcomingCard trip={upcoming[0]} />}
          <div className="grid content-start gap-4">
            <div className="panel grid grid-cols-3 divide-x divide-forest/10 p-4 text-center">
              {[
                { value: trips.data?.length ?? 0, label: tr('Chuyến đi', 'Trips') },
                { value: totalStops, label: tr('Điểm đến', 'Stops') },
                { value: Math.round(totalKm), label: tr('Km di chuyển', 'Km planned') },
              ].map((stat) => (
                <div key={stat.label} className="px-2">
                  <p className="h-display text-[2rem] text-forest">
                    <CountUp value={stat.value} format={(v) => Math.round(v).toLocaleString(locale)} />
                  </p>
                  <p className="text-[0.72rem] font-medium text-ink/55">{stat.label}</p>
                </div>
              ))}
            </div>
            {upcoming.slice(live ? 0 : 1, live ? 2 : 3).map((trip) => (
              <MiniTrip key={trip.id} trip={trip} />
            ))}
            {done.length > 0 && (
              <p className="px-1 text-sm text-ink/55">
                {tr(`${done.length} chuyến đã hoàn thành.`, `${done.length} completed trip(s).`)}{' '}
                <Link to="/app/trips" className="font-semibold text-lapis hover:underline">
                  {tr('Xem tất cả', 'See all')}
                </Link>
              </p>
            )}
          </div>
        </section>
      ) : (
        <EmptyState
          title={tr('Chưa có chuyến đi nào', 'No trips yet')}
          body={tr('Kể chuyến đi đầu tiên ở khung phía trên, Di sẽ dựng một lịch trình hoàn chỉnh trong vài giây.', 'Describe your first trip above and Di builds a full itinerary in seconds.')}
          action={
            <Link to="/app/plan" className="btn-gold">
              <Sparkles size={17} aria-hidden="true" />
              {tr('Lên chuyến đầu tiên', 'Plan my first trip')}
            </Link>
          }
        />
      )}

      <section aria-labelledby="picks">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="picks" className="h-display text-[1.6rem] text-forest">
              {tr('Gợi ý hợp gu bạn', 'Picked for your taste')}
            </h2>
            <p className="mt-1 text-sm text-ink/60">{tr('Dựa trên sở thích trong hồ sơ của bạn.', 'Based on the interests in your profile.')}</p>
          </div>
          <Link to="/app/discover" className="hidden items-center gap-1.5 text-sm font-semibold text-lapis hover:underline sm:inline-flex">
            {tr('Khám phá thêm', 'Explore more')} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recommended.map(({ city }, index) => (
            <motion.li key={city.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: index * 0.08, duration: 0.55 }}>
              <Tilt className="h-60" max={7}>
              <button
                type="button"
                onClick={() => navigate('/app/plan', { state: { wish: tr(`Hai ngày ở ${city.name}, hợp gu tôi.`, `Two days in ${city.nameEn}, to my taste.`) } })}
                className="group relative block h-60 w-full overflow-hidden rounded-2xl text-left"
              >
                <CityCover city={city.id} className="size-full">
                  <span className="absolute inset-0 -z-10 transition-transform duration-[900ms] ease-out group-hover:scale-105" />
                  <span className="absolute inset-x-4 bottom-4 text-paper">
                    <span className="h-display block text-2xl">{vi ? city.name : city.nameEn}</span>
                    <span className="mt-1 block text-[0.8rem] leading-snug text-paper/80">{city.tagline[vi ? 0 : 1]}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-xs font-bold text-night transition-transform duration-300 group-hover:translate-x-1">
                      {tr('Lập lịch trình', 'Plan a trip')} <ArrowRight size={13} aria-hidden="true" />
                    </span>
                  </span>
                </CityCover>
              </button>
              </Tilt>
            </motion.li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function profileFit(city: City, interests: Record<string, number | undefined>) {
  const poisHere = Object.values(poiById).filter((poi) => poi.city === city.id)
  return poisHere.reduce((sum, poi) => sum + (interests[poi.cat] ?? 0.5) * (poi.rating / 5), 0) / Math.max(1, poisHere.length) + (Math.sin(city.lat) + 1) * 0.001
}

function LiveCard({ trip }: { trip: Trip }) {
  const { tr, language } = useTr()
  const city = cityById[trip.city]
  const stops = trip.days[0].stops
  const next = stops[Math.min(2, stops.length - 1)]
  return (
    <CityCover city={trip.city} className="min-h-72 rounded-2xl" overlay="from-night/95 via-night/55 to-night/10">
      <div className="flex h-full min-h-72 flex-col justify-between p-6 text-paper">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-firuze px-3 py-1 text-xs font-bold text-night">
          <span className="pulse-dot size-2 rounded-full bg-night" aria-hidden="true" />
          {tr('Đang diễn ra', 'Live now')}
        </span>
        <div>
          <h2 className="h-display text-[2rem]">{tripTitle(trip, language)}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-paper/75">
            <MapPin size={15} aria-hidden="true" /> {language === 'vi' ? city.name : city.nameEn} · {stops.length} {tr('điểm', 'stops')} · {fmtTime(trip.dayStart)}–{fmtTime(trip.dayEnd)}
          </p>
          {next && <p className="mt-3 text-sm text-paper/80">{tr('Điểm kế tiếp', 'Up next')}: <strong className="text-gold">{poiById[next.poiId].name}</strong></p>}
          <Link to={`/app/trips/${trip.id}/live`} className="btn-gold mt-5">
            <Navigation size={17} aria-hidden="true" />
            {tr('Tiếp tục chuyến đi', 'Resume the trip')}
          </Link>
        </div>
      </div>
    </CityCover>
  )
}

function UpcomingCard({ trip }: { trip: Trip }) {
  const { tr, locale, language } = useTr()
  const city = cityById[trip.city]
  const diff = dayDiff(trip.startDate)
  const weather = weatherFor(trip.city, trip.startDate)
  return (
    <CityCover city={trip.city} className="min-h-72 rounded-2xl" overlay="from-night/95 via-night/50 to-night/5">
      <div className="flex h-full min-h-72 flex-col justify-between p-6 text-paper">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-paper/90 px-3 py-1 text-xs font-bold text-night">
          <CalendarClock size={14} aria-hidden="true" />
          {diff <= 0 ? tr('Hôm nay', 'Today') : tr(`Còn ${diff} ngày`, `In ${diff} day(s)`)}
        </span>
        <div>
          <h2 className="h-display text-[2rem]">{tripTitle(trip, language)}</h2>
          <p className="mt-1 text-sm text-paper/75">
            {language === 'vi' ? city.name : city.nameEn} · {formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })} – {formatDate(addDays(trip.startDate, trip.days.length - 1), locale, { day: 'numeric', month: 'short' })}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-paper/80">
            <WeatherGlyph condition={weather.condition} /> {weather.tempC}°C · {isRainy(weather) ? tr('Có thể mưa', 'Rain possible') : tr('Thời tiết tốt', 'Fair weather')}
          </p>
          <Link to={`/app/trips/${trip.id}`} className="btn-gold mt-5">
            <Compass size={17} aria-hidden="true" />
            {tr('Mở lịch trình', 'Open itinerary')}
          </Link>
        </div>
      </div>
    </CityCover>
  )
}

function MiniTrip({ trip }: { trip: Trip }) {
  const { tr, locale, language } = useTr()
  return (
    <Link to={`/app/trips/${trip.id}`} className="panel group flex items-center gap-4 p-3.5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-gold">
      <CityCover city={trip.city} className="size-16 shrink-0 rounded-xl" overlay="from-night/30 to-transparent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-semibold text-ink">{tripTitle(trip, language)}</p>
        <p className="mt-0.5 text-xs text-ink/55">
          {formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })} · {trip.days.length} {tr('ngày', 'day(s)')} · {formatVnd(tripSpend(trip), true)}
        </p>
        <div className="mt-1.5">
          <SolverBadge status={trip.solver.status} />
        </div>
      </div>
      <ArrowRight size={18} className="shrink-0 text-ink/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-lapis" aria-hidden="true" />
    </Link>
  )
}
