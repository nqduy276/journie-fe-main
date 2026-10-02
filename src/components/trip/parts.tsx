import { motion } from 'motion/react'
import { CalendarDays, Clock, Route, Wallet } from 'lucide-react'
import { categories } from '../../domain/categories'
import { poiById } from '../../domain/pois'
import { dayCost, tripCost } from '../../domain/solver'
import { addDays, fmtMinutes, formatDate, formatVnd } from '../../domain/time'
import type { CategoryId, Trip } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { Meter } from '../ui/primitives'

export function DayTabs({ trip, value, onChange }: { trip: Trip; value: number; onChange: (index: number) => void }) {
  const { tr, locale } = useTr()
  return (
    <div role="tablist" aria-label={tr('Chọn ngày', 'Choose a day')} className="flex gap-1.5 overflow-x-auto pb-1">
      {trip.days.map((day) => {
        const active = day.index === value
        return (
          <button
            key={day.index}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(day.index)}
            className={`relative shrink-0 rounded-xl px-4 py-2 text-left transition-colors ${active ? 'text-paper' : 'text-ink/70 hover:bg-lapis/8'}`}
          >
            {active && <motion.span layoutId={`day-tab-${trip.id}`} className="absolute inset-0 rounded-xl bg-lapis" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative block text-[0.8rem] font-bold">{tr(`Ngày ${day.index + 1}`, `Day ${day.index + 1}`)}</span>
            <span className={`relative block text-[0.68rem] ${active ? 'text-paper/70' : 'text-ink/45'}`}>{formatDate(addDays(trip.startDate, day.index), locale, { day: 'numeric', month: 'short' })}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-lapis/10 text-lapis" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-[0.7rem] font-medium text-ink/50">{label}</p>
        <p className="tabular text-[0.95rem] font-bold text-ink">{value}</p>
      </div>
    </div>
  )
}

/** Day and trip totals: stops, time on the road, distance and spend against the budget. */
export function TripStats({ trip, dayIndex }: { trip: Trip; dayIndex?: number }) {
  const { tr, language } = useTr()
  const days = dayIndex === undefined ? trip.days : [trip.days[dayIndex]]
  const stops = days.flatMap((day) => day.stops)
  const travel = stops.reduce((sum, stop) => sum + stop.travelMin, 0)
  const km = stops.reduce((sum, stop) => sum + stop.travelKm, 0)
  const spend = dayIndex === undefined ? tripCost(trip.days) : dayCost(trip.days[dayIndex])
  const budget = dayIndex === undefined ? trip.budget : trip.budget / trip.days.length
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Stat icon={CalendarDays} label={tr('Số điểm', 'Stops')} value={`${stops.length}`} />
        <Stat icon={Clock} label={tr('Di chuyển', 'Travel time')} value={fmtMinutes(travel, language === 'vi')} />
        <Stat icon={Route} label={tr('Quãng đường', 'Distance')} value={`${km.toFixed(1)} km`} />
        <Stat icon={Wallet} label={tr('Chi phí ước tính', 'Estimated cost')} value={formatVnd(spend)} />
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-[0.72rem] font-medium text-ink/55">
          <span>{tr('Ngân sách', 'Budget')}</span>
          <span className="tabular">
            {formatVnd(spend, true)} / {formatVnd(budget, true)}
          </span>
        </div>
        <Meter value={spend} max={budget} label={tr('Chi phí so với ngân sách', 'Spend against budget')} />
      </div>
    </div>
  )
}

/** Plain-language account of the plan, generated from the numbers (the report's "downstream explanation"). */
export function describeTrip(trip: Trip, vi: boolean): string[] {
  const stops = trip.days.flatMap((day) => day.stops)
  const mix = new Map<CategoryId, number>()
  stops.forEach((stop) => mix.set(poiById[stop.poiId].cat, (mix.get(poiById[stop.poiId].cat) ?? 0) + 1))
  const top = [...mix.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([cat]) => categories[cat][vi ? 'vi' : 'en'].toLowerCase())
  const spend = tripCost(trip.days)
  const pct = Math.round((spend / trip.budget) * 100)
  const outdoors = stops.filter((stop) => !poiById[stop.poiId].indoor).length

  const lines = [
    vi
      ? `Jinnie xếp ${stops.length} điểm vào ${trip.days.length} ngày, nghiêng về ${top.join(' và ')} theo đúng gu bạn nói. Chi phí ước tính ${formatVnd(spend)}, tức ${pct}% ngân sách.`
      : `Jinnie placed ${stops.length} stops across ${trip.days.length} day${trip.days.length > 1 ? 's' : ''}, leaning toward ${top.join(' and ')} as you asked. Estimated cost is ${formatVnd(spend)}, ${pct}% of the budget.`,
  ]
  if (trip.rainy) {
    lines.push(
      vi
        ? `Dự báo có mưa nên các điểm trong nhà được ưu tiên; chỉ ${outdoors} điểm ngoài trời được giữ lại.`
        : `Rain is forecast, so indoor places were favoured; only ${outdoors} outdoor stops were kept.`,
    )
  }
  if (trip.avoidTags.length) {
    lines.push(
      vi
        ? `Các điểm có ${trip.avoidTags.join(', ')} đã bị loại để tránh dị ứng hoặc điều bạn không ăn.`
        : `Places involving ${trip.avoidTags.join(', ')} were excluded to respect your dietary limits.`,
    )
  }
  lines.push(
    trip.solver.status === 'OPTIMAL'
      ? vi
        ? `Bộ giải đã xét toàn bộ ${trip.solver.nodes.toLocaleString('vi-VN')} trạng thái và chứng minh đây là lịch tốt nhất trong mô hình.`
        : `The solver searched all ${trip.solver.nodes.toLocaleString('en-US')} states and proved this is the best schedule under the model.`
      : vi
        ? 'Lịch này thỏa mọi ràng buộc cứng (giờ mở cửa, thời gian di chuyển, ngân sách) nhưng chưa được chứng minh là tối ưu tuyệt đối.'
        : 'This schedule meets every hard constraint (opening hours, travel time, budget) but is not proven globally optimal.',
  )
  return lines
}
