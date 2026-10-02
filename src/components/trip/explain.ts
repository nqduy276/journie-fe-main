import { categories } from '../../domain/categories'
import { poiById } from '../../domain/pois'
import { tripCost } from '../../domain/solver'
import { formatVnd } from '../../domain/time'
import type { CategoryId, Trip } from '../../domain/types'

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
      ? `Di xếp ${stops.length} điểm vào ${trip.days.length} ngày, nghiêng về ${top.join(' và ')} theo đúng gu bạn nói. Chi phí ước tính ${formatVnd(spend)}, tức ${pct}% ngân sách.`
      : `Di placed ${stops.length} stops across ${trip.days.length} day${trip.days.length > 1 ? 's' : ''}, leaning toward ${top.join(' and ')} as you asked. Estimated cost is ${formatVnd(spend)}, ${pct}% of the budget.`,
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
