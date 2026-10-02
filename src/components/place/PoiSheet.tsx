import { useState } from 'react'
import { motion } from 'motion/react'
import { Clock, ExternalLink, Heart, MapPin, Plus, Tag, Wallet } from 'lucide-react'
import { ratingHistogram } from '../../api/places'
import { readProfile, type Profile } from '../../api/profile'
import { useProfile, useReviews, useSaveProfile, useSaveTrip, useTrips } from '../../api/queries'
import { track } from '../../api/analytics'
import { addStop } from '../../domain/edit'
import { poiById } from '../../domain/pois'
import { violationText } from '../../domain/violation'
import { fmtTime, formatVnd } from '../../domain/time'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'
import { StarRating } from '../art/Khatam'
import { CategoryGlyph, CategoryName, Skeleton } from '../ui/primitives'
import { Sheet } from '../ui/Sheet'

/** Venue details, reviews and "add to trip". Shared by Discover, the editor and the live view. */
export function PoiSheet() {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const user = useAuthStore((state) => state.user)!
  const id = useUiStore((state) => state.poiSheet)
  const openPoi = useUiStore((state) => state.openPoi)
  const poi = id ? poiById[id] : null
  const reviews = useReviews(id)
  const trips = useTrips()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const saveProfile = useSaveProfile()
  const saveTrip = useSaveTrip()
  const [tripId, setTripId] = useState<string>('')

  const candidates = (trips.data ?? []).filter((trip) => poi && trip.city === poi.city && trip.status !== 'completed')
  const selectedTrip = candidates.find((trip) => trip.id === tripId) ?? candidates[0]
  const saved = !!poi && profile.saved.includes(poi.id)

  const toggleSaved = () => {
    if (!poi) return
    const next: Profile = { ...profile, saved: saved ? profile.saved.filter((p) => p !== poi.id) : [...profile.saved, poi.id] }
    saveProfile.mutate(next)
    toast('info', saved ? tr('Đã bỏ khỏi danh sách yêu thích', 'Removed from favourites') : tr('Đã lưu vào yêu thích', 'Saved to favourites'))
  }

  const addToTrip = (dayIndex: number) => {
    if (!poi || !selectedTrip) return
    const result = addStop(selectedTrip, dayIndex, poi.id)
    if (!result.ok) {
      toast('warning', tr('Chưa thêm được', 'Could not add it'), violationText(result.violations[0], vi))
      return
    }
    saveTrip.mutate(result.trip)
    track({ type: 'trip_edited', city: poi.city, detail: 'add-from-sheet' })
    toast('success', tr('Đã thêm vào lịch trình', 'Added to itinerary'), `${poi.name} → ${tr('Ngày', 'Day')} ${dayIndex + 1}`)
    openPoi(null)
  }

  return (
    <Sheet open={!!poi} onClose={() => openPoi(null)} title={poi?.name ?? ''} description={poi?.area}>
      {poi && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <CategoryGlyph cat={poi.cat} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                <CategoryName cat={poi.cat} />
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-ink/60">
                <StarRating value={poi.rating} />
                <span className="tabular font-bold text-ink">{poi.rating.toFixed(1)}</span>
              </div>
            </div>
            <button type="button" onClick={toggleSaved} className={`grid size-11 place-items-center rounded-full border transition-colors ${saved ? 'border-pomegranate bg-pomegranate/10 text-pomegranate' : 'border-forest/20 text-ink/50 hover:text-pomegranate'}`} aria-pressed={saved} aria-label={saved ? tr('Bỏ yêu thích', 'Remove favourite') : tr('Yêu thích', 'Favourite')}>
              <motion.span animate={saved ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>
                <Heart size={20} fill={saved ? 'currentColor' : 'none'} />
              </motion.span>
            </button>
          </div>

          <p className="font-display text-[1.05rem] italic leading-relaxed text-ink/80">{poi.blurb[vi ? 0 : 1]}</p>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="panel flex items-start gap-2.5 p-3">
              <Clock size={16} className="mt-0.5 text-lapis" aria-hidden="true" />
              <div>
                <dt className="text-[0.7rem] text-ink/50">{tr('Giờ mở cửa', 'Opening hours')}</dt>
                <dd className="tabular font-semibold">{fmtTime(poi.open)} – {fmtTime(poi.close)}</dd>
              </div>
            </div>
            <div className="panel flex items-start gap-2.5 p-3">
              <Wallet size={16} className="mt-0.5 text-lapis" aria-hidden="true" />
              <div>
                <dt className="text-[0.7rem] text-ink/50">{tr('Chi phí', 'Cost')}</dt>
                <dd className="tabular font-semibold">{poi.cost ? formatVnd(poi.cost) : tr('Miễn phí', 'Free')}</dd>
              </div>
            </div>
            <div className="panel flex items-start gap-2.5 p-3">
              <Clock size={16} className="mt-0.5 text-lapis" aria-hidden="true" />
              <div>
                <dt className="text-[0.7rem] text-ink/50">{tr('Thời gian nên dành', 'Suggested time')}</dt>
                <dd className="tabular font-semibold">{poi.visit} {tr('phút', 'min')}</dd>
              </div>
            </div>
            <div className="panel flex items-start gap-2.5 p-3">
              <MapPin size={16} className="mt-0.5 text-lapis" aria-hidden="true" />
              <div>
                <dt className="text-[0.7rem] text-ink/50">{tr('Không gian', 'Setting')}</dt>
                <dd className="font-semibold">{poi.indoor ? tr('Trong nhà', 'Indoor') : tr('Ngoài trời', 'Outdoor')}</dd>
              </div>
            </div>
          </dl>

          <div className="flex flex-wrap gap-1.5" aria-label={tr('Dịch vụ và đặc điểm', 'Services and features')}>
            {poi.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-lapis/8 px-2.5 py-1 text-[0.72rem] font-semibold text-lapis">
                <Tag size={11} aria-hidden="true" /> {tag.replace(/-/g, ' ')}
              </span>
            ))}
          </div>

          <a href={poi.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-lapis hover:underline">
            <ExternalLink size={15} aria-hidden="true" /> {tr('Xem trên bản đồ', 'Open on the map')}
          </a>

          <section aria-labelledby="reviews-title">
            <h3 id="reviews-title" className="h-display text-lg text-forest">
              {tr('Đánh giá', 'Reviews')}
            </h3>
            <div className="mt-3 flex items-center gap-5">
              <div className="text-center">
                <p className="h-display text-4xl text-forest">{poi.rating.toFixed(1)}</p>
                <StarRating value={poi.rating} size={11} />
              </div>
              <ul className="flex-1 space-y-1" aria-hidden="true">
                {ratingHistogram(poi).map((share, index) => (
                  <li key={index} className="flex items-center gap-2 text-[0.68rem] text-ink/50">
                    <span className="w-2">{5 - index}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-forest/10">
                      <motion.span className="block h-full rounded-full bg-sun" initial={{ width: 0 }} animate={{ width: `${share * 100}%` }} transition={{ delay: 0.1 + index * 0.06, duration: 0.6 }} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="mt-4 divide-y divide-forest/10">
              {reviews.isLoading && [0, 1, 2].map((i) => <li key={i} className="py-3"><Skeleton className="h-12" /></li>)}
              {reviews.data?.map((review) => (
                <li key={review.id} className="py-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-ink">{review.author}</span>
                    <span className="text-ink/45">{tr(`${review.daysAgo} ngày trước`, `${review.daysAgo} days ago`)}</span>
                  </div>
                  <div className="mt-1"><StarRating value={review.rating} size={11} /></div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/75">{vi ? review.vi : review.en}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-4" aria-labelledby="add-title">
            <h3 id="add-title" className="text-sm font-bold text-ink">
              {tr('Thêm vào lịch trình', 'Add to an itinerary')}
            </h3>
            {candidates.length === 0 ? (
              <p className="mt-1.5 text-sm text-ink/60">{tr('Bạn chưa có chuyến nào ở thành phố này. Hãy tạo lịch trình trước.', 'You have no trip in this city yet. Create one first.')}</p>
            ) : (
              <>
                <label className="mt-2 block text-xs font-semibold text-ink/60" htmlFor="trip-pick">
                  {tr('Chuyến đi', 'Trip')}
                </label>
                <select id="trip-pick" value={selectedTrip?.id} onChange={(event) => setTripId(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-forest/20 bg-white px-3 text-sm outline-none focus:border-lapis">
                  {candidates.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.title}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTrip?.days.map((day) => (
                    <button key={day.index} type="button" className="btn-ghost btn-sm" onClick={() => addToTrip(day.index)}>
                      <Plus size={14} aria-hidden="true" /> {tr('Ngày', 'Day')} {day.index + 1}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </Sheet>
  )
}
