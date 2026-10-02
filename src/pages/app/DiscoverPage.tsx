import { useDeferredValue, useMemo } from 'react'
import { motion } from 'motion/react'
import { Clock, Heart, List, Map as MapIcon, MapPinned, Search, SlidersHorizontal, X } from 'lucide-react'
import { searchPois, tierOf, type PriceTier, type SearchHit } from '../../api/places'
import { readProfile } from '../../api/profile'
import { track } from '../../api/analytics'
import { useProfile, useSaveProfile } from '../../api/queries'
import { StarRating } from '../../components/art/Khatam'
import { RouteMap } from '../../components/map/RouteMap'
import { PageHeader } from '../../components/PageHeader'
import { PoiSheet } from '../../components/place/PoiSheet'
import { CategoryGlyph, CategoryName, EmptyState } from '../../components/ui/primitives'
import { categories, categoryIds } from '../../domain/categories'
import { cities } from '../../domain/pois'
import { fmtTime, formatVnd } from '../../domain/time'
import type { CategoryId, CityId } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'

const SUGGESTIONS: [string, string][] = [
  ['cà phê gần Chùa Cầu', 'coffee near Chùa Cầu'],
  ['ăn sáng', 'breakfast'],
  ['hoàng hôn', 'sunset'],
  ['thiên nhiên', 'nature'],
  ['chợ đêm', 'night market'],
]

const nowMinutes = () => {
  const date = new Date()
  return date.getHours() * 60 + date.getMinutes()
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function DiscoverPage() {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const user = useAuthStore((state) => state.user)!
  const { discover, setDiscover, resetDiscover, openPoi } = useUiStore()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const saveProfile = useSaveProfile()

  // Typing stays instant while the (cheap) filtering work trails behind.
  const deferredQuery = useDeferredValue(discover.query)
  const hits = useMemo(
    () => searchPois({ ...discover, query: deferredQuery }),
    [discover, deferredQuery],
  )
  const anchor = hits.find((hit) => hit.anchor)?.anchor
  const filtersActive = discover.cities.length + discover.categories.length + discover.prices.length > 0 || discover.minRating > 0 || discover.indoorOnly

  const priceTiers: { id: PriceTier; label: string }[] = [
    { id: 'free', label: tr('Miễn phí', 'Free') },
    { id: 'low', label: '< 100k' },
    { id: 'mid', label: '100–300k' },
    { id: 'high', label: '> 300k' },
  ]

  const toggleSaved = (id: string) => {
    const saved = profile.saved.includes(id)
    saveProfile.mutate({ ...profile, saved: saved ? profile.saved.filter((p) => p !== id) : [...profile.saved, id] })
  }

  return (
    <>
      <PageHeader
        title={user.role === 'admin' ? tr('Dữ liệu điểm đến', 'Places data') : tr('Khám phá', 'Discover')}
        subtitle={tr('Tìm theo từ khóa, loại hình hoặc khu vực. Thử gõ “cà phê gần Chùa Cầu” để tìm quanh một địa điểm.', 'Search by keyword, type or area. Try “coffee near Chùa Cầu” to search around a place.')}
      />

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          if (discover.query.trim()) track({ type: 'search', detail: discover.query.trim() })
        }}
        className="relative"
      >
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lapis" aria-hidden="true" />
        <input
          value={discover.query}
          onChange={(event) => setDiscover({ query: event.target.value })}
          aria-label={tr('Tìm địa điểm', 'Search places')}
          placeholder={tr('Tìm quán cà phê, bảo tàng, bãi biển…', 'Search cafés, museums, beaches…')}
          className="h-14 w-full rounded-2xl border border-forest/20 bg-white pl-12 pr-12 text-base shadow-[0_10px_28px_-20px_rgba(19,26,77,0.6)] outline-none transition-[border-color,box-shadow] focus:border-lapis focus:shadow-[0_0_0_4px_rgba(37,57,155,0.12)]"
        />
        {discover.query && (
          <button type="button" onClick={() => setDiscover({ query: '' })} className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-ink/45 hover:text-ink" aria-label={tr('Xóa từ khóa', 'Clear search')}>
            <X size={18} />
          </button>
        )}
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink/50">{tr('Thử:', 'Try:')}</span>
        {SUGGESTIONS.map(([v, e]) => (
          <button key={v} type="button" className="chip !min-h-8 !text-xs" onClick={() => setDiscover({ query: tr(v, e) })}>
            {tr(v, e)}
          </button>
        ))}
      </div>

      <section className="panel mt-6 space-y-4 p-4 sm:p-5" aria-label={tr('Bộ lọc', 'Filters')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <SlidersHorizontal size={16} className="text-lapis" aria-hidden="true" /> {tr('Bộ lọc', 'Filters')}
          </p>
          <div className="flex items-center gap-3">
            {filtersActive && (
              <button type="button" onClick={() => resetDiscover()} className="text-xs font-semibold text-lapis hover:underline">
                {tr('Xóa bộ lọc', 'Clear filters')}
              </button>
            )}
            <div role="group" aria-label={tr('Chế độ xem', 'View')} className="inline-flex rounded-lg bg-forest/6 p-0.5">
              {(['list', 'map'] as const).map((view) => (
                <button key={view} type="button" aria-pressed={discover.view === view} onClick={() => setDiscover({ view })} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${discover.view === view ? 'bg-lapis text-paper' : 'text-ink/60 hover:text-ink'}`}>
                  {view === 'list' ? <List size={14} aria-hidden="true" /> : <MapIcon size={14} aria-hidden="true" />}
                  {view === 'list' ? tr('Danh sách', 'List') : tr('Bản đồ', 'Map')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <FilterRow label={tr('Khu vực', 'Area')}>
          {cities.map((city) => (
            <button key={city.id} type="button" aria-pressed={discover.cities.includes(city.id)} className={`chip ${discover.cities.includes(city.id) ? 'chip-on' : ''}`} onClick={() => setDiscover({ cities: toggle<CityId>(discover.cities, city.id) })}>
              {vi ? city.name : city.nameEn}
            </button>
          ))}
        </FilterRow>
        <FilterRow label={tr('Loại hình', 'Type')}>
          {categoryIds.map((cat) => (
            <button key={cat} type="button" aria-pressed={discover.categories.includes(cat)} className={`chip ${discover.categories.includes(cat) ? 'chip-on' : ''}`} onClick={() => setDiscover({ categories: toggle<CategoryId>(discover.categories, cat) })}>
              <span className="size-2 rounded-full" style={{ background: categories[cat].color }} aria-hidden="true" />
              {tr(categories[cat].vi, categories[cat].en)}
            </button>
          ))}
        </FilterRow>
        <FilterRow label={tr('Mức giá', 'Price')}>
          {priceTiers.map((tier) => (
            <button key={tier.id} type="button" aria-pressed={discover.prices.includes(tier.id)} className={`chip ${discover.prices.includes(tier.id) ? 'chip-on' : ''}`} onClick={() => setDiscover({ prices: toggle<PriceTier>(discover.prices, tier.id) })}>
              {tier.label}
            </button>
          ))}
        </FilterRow>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-forest/10 pt-4">
          <label className="flex items-center gap-3 text-sm text-ink/75">
            <span className="font-semibold">{tr('Đánh giá từ', 'Rating from')}</span>
            <input type="range" className="range !w-32" min={0} max={4.5} step={0.5} value={discover.minRating} style={{ ['--fill' as string]: `${(discover.minRating / 4.5) * 100}%` }} onChange={(event) => setDiscover({ minRating: Number(event.target.value) })} />
            <span className="tabular w-8 font-bold text-forest">{discover.minRating ? `${discover.minRating}★` : tr('Mọi', 'Any')}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink/75">
            <input type="checkbox" className="size-4 accent-[#25399b]" checked={discover.indoorOnly} onChange={(event) => setDiscover({ indoorOnly: event.target.checked })} />
            {tr('Chỉ trong nhà', 'Indoor only')}
          </label>
          <label className="ml-auto flex items-center gap-2 text-sm text-ink/75">
            <span className="font-semibold">{tr('Sắp xếp', 'Sort')}</span>
            <select value={discover.sort} onChange={(event) => setDiscover({ sort: event.target.value as typeof discover.sort })} className="h-9 rounded-lg border border-forest/20 bg-white px-2.5 text-sm outline-none focus:border-lapis">
              <option value="relevance">{tr('Phù hợp nhất', 'Best match')}</option>
              <option value="rating">{tr('Đánh giá cao', 'Top rated')}</option>
              <option value="price">{tr('Giá thấp trước', 'Lowest price')}</option>
              <option value="distance" disabled={!anchor}>
                {tr('Gần nhất', 'Nearest')}
              </option>
            </select>
          </label>
        </div>
      </section>

      <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-2" aria-live="polite">
        <p className="text-sm font-semibold text-ink/70">
          {hits.length} {tr('địa điểm', 'places')}
          {anchor && (
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-lapis/10 px-2.5 py-1 text-xs font-bold text-lapis">
              <MapPinned size={13} aria-hidden="true" /> {tr('Quanh', 'Around')} {anchor.name} · ≤ 4 km
            </span>
          )}
        </p>
      </div>

      {hits.length === 0 ? (
        <EmptyState
          title={tr('Không tìm thấy địa điểm nào', 'No places found')}
          body={tr('Thử bỏ bớt bộ lọc hoặc dùng từ khóa khác, ví dụ “cà phê”, “biển” hay “bảo tàng”.', 'Try removing a filter or another keyword, such as “coffee”, “beach” or “museum”.')}
          action={
            <button type="button" className="btn-ghost" onClick={() => resetDiscover()}>
              {tr('Đặt lại tìm kiếm', 'Reset search')}
            </button>
          }
        />
      ) : discover.view === 'map' ? (
        <div className="panel overflow-hidden">
          <RouteMap
            stops={[]}
            className="h-[34rem] w-full"
            fitKey={hits.map((hit) => hit.poi.id).join()}
            extras={hits.slice(0, 80).map((hit) => ({ id: hit.poi.id, lat: hit.poi.lat, lng: hit.poi.lng, label: hit.poi.name, color: categories[hit.poi.cat].color }))}
            onExtraClick={openPoi}
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {hits.slice(0, 48).map((hit, index) => (
            <PlaceCard key={hit.poi.id} hit={hit} index={index} saved={profile.saved.includes(hit.poi.id)} onToggle={() => toggleSaved(hit.poi.id)} onOpen={() => openPoi(hit.poi.id)} />
          ))}
        </ul>
      )}
      <PoiSheet />
    </>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-semibold text-ink/55">{label}</span>
      {children}
    </div>
  )
}

function PlaceCard({ hit, index, saved, onToggle, onOpen }: { hit: SearchHit; index: number; saved: boolean; onToggle: () => void; onOpen: () => void }) {
  const { tr, language } = useTr()
  const { poi, distanceKm } = hit
  const now = nowMinutes()
  const open = poi.open <= now && now < poi.close
  const color = categories[poi.cat].color

  return (
    <motion.li
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="panel group relative flex overflow-hidden transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-26px_rgba(19,26,77,0.7)]"
    >
      <span className="w-1.5 shrink-0" style={{ background: color }} aria-hidden="true" />
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-col p-4 text-left">
        <span className="flex items-start gap-3">
          <CategoryGlyph cat={poi.cat} size={42} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.97rem] font-semibold text-ink">{poi.name}</span>
            <span className="block truncate text-xs text-ink/55">
              <CategoryName cat={poi.cat} /> · {poi.area}
              {distanceKm !== undefined && ` · ${distanceKm.toFixed(1)} km`}
            </span>
          </span>
        </span>
        <span className="mt-3 line-clamp-2 text-[0.85rem] leading-relaxed text-ink/70">{poi.blurb[language === 'vi' ? 0 : 1]}</span>
        <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4 text-xs text-ink/65">
          <span className="inline-flex items-center gap-1.5">
            <StarRating value={poi.rating} size={12} />
            <span className="tabular font-bold text-ink">{poi.rating.toFixed(1)}</span>
          </span>
          <span className="tabular font-semibold text-ink/80">{poi.cost ? formatVnd(poi.cost, true) : tr('Miễn phí', 'Free')}</span>
          <span className={`inline-flex items-center gap-1 font-semibold ${open ? 'text-[#0b7f75]' : 'text-ink/45'}`}>
            <Clock size={12} aria-hidden="true" />
            {open ? tr('Đang mở', 'Open now') : `${fmtTime(poi.open)}–${fmtTime(poi.close)}`}
          </span>
          <span className="rounded-full bg-forest/7 px-2 py-0.5 text-[0.65rem] font-semibold">{{ free: tr('Miễn phí', 'Free'), low: '$', mid: '$$', high: '$$$' }[tierOf(poi.cost)]}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={saved}
        aria-label={saved ? tr('Bỏ yêu thích', 'Remove favourite') : tr('Yêu thích', 'Favourite')}
        className={`absolute right-2 top-2 grid size-10 place-items-center transition-colors ${saved ? 'text-pomegranate' : 'text-ink/30 hover:text-pomegranate'}`}
      >
        <motion.span animate={saved ? { scale: [1, 1.4, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </motion.span>
      </button>
    </motion.li>
  )
}
