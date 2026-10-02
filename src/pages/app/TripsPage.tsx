import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowUpRight, CalendarDays, Navigation, Sparkles } from 'lucide-react'
import { useTrips } from '../../api/queries'
import { CityCover } from '../../components/CityCover'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, Skeleton, SolverBadge } from '../../components/ui/primitives'
import { cityById } from '../../domain/pois'
import { tripSpend, tripStopCount } from '../../domain/planner'
import { addDays, formatDate, formatVnd } from '../../domain/time'
import type { Trip, TripStatus } from '../../domain/types'
import { useTr } from '../../hooks/useTr'

type Filter = 'all' | TripStatus

export function TripsPage() {
  const { tr } = useTr()
  const trips = useTrips()
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(() => {
    const data = trips.data ?? []
    return { all: data.length, live: data.filter((t) => t.status === 'live').length, upcoming: data.filter((t) => t.status === 'upcoming').length, completed: data.filter((t) => t.status === 'completed').length, draft: 0 }
  }, [trips.data])

  const visible = (trips.data ?? []).filter((trip) => filter === 'all' || trip.status === filter)
  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: tr('Tất cả', 'All') },
    { id: 'live', label: tr('Đang đi', 'Live') },
    { id: 'upcoming', label: tr('Sắp tới', 'Upcoming') },
    { id: 'completed', label: tr('Đã xong', 'Done') },
  ]

  return (
    <>
      <PageHeader
        title={tr('Chuyến đi của tôi', 'My trips')}
        subtitle={tr('Mở một lịch trình để chỉnh sửa, hoặc bắt đầu đi và để Jinnie theo dõi giúp bạn.', 'Open an itinerary to edit it, or start travelling and let Jinnie keep watch.')}
        actions={
          <Link to="/app/plan" className="btn-gold btn-sm">
            <Sparkles size={15} aria-hidden="true" /> {tr('Ước chuyến mới', 'New wish')}
          </Link>
        }
      />

      <div role="tablist" aria-label={tr('Lọc chuyến đi', 'Filter trips')} className="mb-6 inline-flex rounded-xl bg-forest/6 p-1">
        {tabs.map((tab) => (
          <button key={tab.id} role="tab" aria-selected={filter === tab.id} onClick={() => setFilter(tab.id)} className={`relative rounded-lg px-4 py-2 text-[0.82rem] font-semibold transition-colors ${filter === tab.id ? 'text-paper' : 'text-ink/65 hover:text-ink'}`}>
            {filter === tab.id && <motion.span layoutId="trips-tab" className="absolute inset-0 rounded-lg bg-lapis" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative">
              {tab.label} <span className="tabular opacity-60">{counts[tab.id]}</span>
            </span>
          </button>
        ))}
      </div>

      {trips.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? tr('Chưa có chuyến đi nào', 'No trips yet') : tr('Không có chuyến nào ở mục này', 'Nothing in this tab')}
          body={tr('Hãy kể điều ước của bạn, Jinnie sẽ biến nó thành lịch trình chi tiết.', 'Tell Jinnie your wish and it becomes a detailed itinerary.')}
          action={
            <Link to="/app/plan" className="btn-gold">
              <Sparkles size={17} aria-hidden="true" /> {tr('Ước chuyến đầu tiên', 'Make a wish')}
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((trip, index) => (
            <motion.li key={trip.id} layout initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <TripCard trip={trip} />
            </motion.li>
          ))}
        </ul>
      )}
    </>
  )
}

function TripCard({ trip }: { trip: Trip }) {
  const { tr, locale, language } = useTr()
  const city = cityById[trip.city]
  const status = {
    live: { label: tr('Đang đi', 'Live'), cls: 'bg-firuze text-night' },
    upcoming: { label: tr('Sắp tới', 'Upcoming'), cls: 'bg-paper/95 text-night' },
    completed: { label: tr('Đã xong', 'Done'), cls: 'bg-night/70 text-paper' },
    draft: { label: tr('Nháp', 'Draft'), cls: 'bg-sun text-night' },
  }[trip.status]

  return (
    <article className="panel group overflow-hidden transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_28px_44px_-26px_rgba(19,26,77,0.7)]">
      <Link to={`/app/trips/${trip.id}`} className="block" aria-label={trip.title}>
        <CityCover city={trip.city} className="h-44" overlay="from-night/80 via-night/10 to-transparent">
          <span className={`absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${status.cls}`}>
            {trip.status === 'live' && <span className="pulse-dot size-1.5 rounded-full bg-night" aria-hidden="true" />}
            {status.label}
          </span>
          <ArrowUpRight size={20} className="absolute right-3.5 top-3.5 text-paper/80 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          <span className="absolute inset-x-4 bottom-3 text-paper">
            <span className="h-display block text-[1.35rem] leading-tight">{trip.title}</span>
            <span className="text-xs text-paper/75">{language === 'vi' ? city.name : city.nameEn}</span>
          </span>
        </CityCover>
      </Link>
      <div className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-[0.8rem] text-ink/65">
          <CalendarDays size={15} className="text-lapis" aria-hidden="true" />
          {formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })}
          {trip.days.length > 1 && ` – ${formatDate(addDays(trip.startDate, trip.days.length - 1), locale, { day: 'numeric', month: 'short' })}`}
        </p>
        <div className="flex items-center justify-between text-xs text-ink/60">
          <span className="tabular">
            {tripStopCount(trip)} {tr('điểm', 'stops')} · {formatVnd(tripSpend(trip), true)}
          </span>
          <SolverBadge status={trip.solver.status} />
        </div>
        {trip.status === 'live' && (
          <Link to={`/app/trips/${trip.id}/live`} className="btn-gold btn-sm w-full">
            <Navigation size={15} aria-hidden="true" /> {tr('Tiếp tục chuyến đi', 'Resume trip')}
          </Link>
        )}
      </div>
    </article>
  )
}
