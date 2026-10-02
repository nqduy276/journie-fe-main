import { useDeferredValue, useId, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Heart, List, Map as MapIcon, MapPinned, Search, X } from 'lucide-react'
import { searchPois, tierOf, type PriceTier, type SearchHit } from '../../api/places'
import { readProfile } from '../../api/profile'
import { track } from '../../api/analytics'
import { useProfile, useSaveProfile } from '../../api/queries'
import { CategoryIcon, SkyIcon, WeatherIcon } from '../../components/icons'
import { RouteMap } from '../../components/map/RouteMap'
import { PageHeader } from '../../components/PageHeader'
import { CityArt } from '../../components/place/art/PlaceArt'
import { PlaceImage } from '../../components/place/PlaceImage'
import { PoiSheet } from '../../components/place/PoiSheet'
import { CategoryName, EmptyState } from '../../components/ui/primitives'
import { HeartBurst } from '../../components/ui/HeartBurst'
import { StarRating } from '../../components/ui/Stars'
import { cheer } from '../../lib/cheer'
import { categories, categoryIds } from '../../domain/categories'
import { cityImage } from '../../domain/cityMedia'
import { cities } from '../../domain/pois'
import { fmtTime, formatVnd } from '../../domain/time'
import type { CategoryId, City, CityId } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { useSky } from '../../store/weatherStore'

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

const SPRING = { type: 'spring', stiffness: 420, damping: 22 } as const

export function DiscoverPage() {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const user = useAuthStore((state) => state.user)!
  const sky = useSky()
  const { discover, setDiscover, resetDiscover, openPoi } = useUiStore()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const saveProfile = useSaveProfile()

  // Typing stays instant while the (cheap) filtering work trails behind.
  const deferredQuery = useDeferredValue(discover.query)
  const hits = useMemo(() => searchPois({ ...discover, query: deferredQuery }), [discover, deferredQuery])
  const anchor = hits.find((hit) => hit.anchor)?.anchor
  const filtersActive = discover.cities.length + discover.categories.length + discover.prices.length > 0 || discover.minRating > 0 || discover.indoorOnly
  const wet = (sky.weather === 'rain' || sky.weather === 'storm') && !discover.indoorOnly

  const toggleSaved = (id: string) => {
    const saved = profile.saved.includes(id)
    if (!saved) cheer()
    saveProfile.mutate({ ...profile, saved: saved ? profile.saved.filter((p) => p !== id) : [...profile.saved, id] })
  }

  return (
    <>
      <PageHeader
        title={user.role === 'admin' ? tr('Dữ liệu điểm đến', 'Places data') : tr('Khám phá', 'Discover')}
        subtitle={tr('Lật từng tấm bưu thiếp. Thử gõ “cà phê gần Chùa Cầu” để tìm quanh một địa điểm.', 'Flip through the postcards. Try “coffee near Chùa Cầu” to search around a place.')}
      />

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          if (discover.query.trim()) track({ type: 'search', detail: discover.query.trim() })
        }}
        className="search-ticket relative"
      >
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-terracotta" aria-hidden="true" />
        <input
          value={discover.query}
          onChange={(event) => setDiscover({ query: event.target.value })}
          aria-label={tr('Tìm địa điểm', 'Search places')}
          placeholder={tr('Tìm quán cà phê, bảo tàng, bãi biển…', 'Search cafés, museums, beaches…')}
          className="h-14 w-full border border-forest/30 bg-white/80 pl-12 pr-12 font-display text-[1.05rem] italic outline-none transition-[border-color,box-shadow] placeholder:text-ink/40 focus:border-terracotta focus:shadow-[0_0_0_4px_rgba(217,103,69,0.14)]"
        />
        {discover.query && (
          <button type="button" onClick={() => setDiscover({ query: '' })} className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-ink/45 hover:text-ink" aria-label={tr('Xóa từ khóa', 'Clear search')}>
            <X size={18} />
          </button>
        )}
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink/50">{tr('Thử:', 'Try:')}</span>
        {wet && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING} type="button" className="chip !min-h-8 !border-jade !bg-jade/12 !text-xs !text-jade-ink" onClick={() => setDiscover({ indoorOnly: true })}>
            <SkyIcon phase={sky.phase} weather="rain" size={20} />
            {tr('Đang mưa: chỉ xem điểm trong nhà', 'Raining: show indoor places only')}
          </motion.button>
        )}
        {SUGGESTIONS.map(([v, e]) => (
          <button key={v} type="button" className="chip !min-h-8 !text-xs" onClick={() => setDiscover({ query: tr(v, e) })}>
            {tr(v, e)}
          </button>
        ))}
      </div>

      <section className="panel mt-6 p-4 sm:p-5" aria-label={tr('Bộ lọc', 'Filters')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="h-display text-lg text-forest">{tr('Chọn điểm dừng cho tấm bưu thiếp', 'Pick your postcard')}</p>
          <div className="flex items-center gap-3">
            {filtersActive && (
              <button type="button" onClick={() => resetDiscover()} className="text-xs font-semibold text-terracotta hover:underline">
                {tr('Xóa bộ lọc', 'Clear filters')}
              </button>
            )}
            <div role="group" aria-label={tr('Chế độ xem', 'View')} className="inline-flex bg-forest/6 p-0.5">
              {(['list', 'map'] as const).map((view) => (
                <button key={view} type="button" aria-pressed={discover.view === view} onClick={() => setDiscover({ view })} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${discover.view === view ? 'bg-forest text-paper' : 'text-ink/60 hover:text-ink'}`}>
                  {view === 'list' ? <List size={14} aria-hidden="true" /> : <MapIcon size={14} aria-hidden="true" />}
                  {view === 'list' ? tr('Bưu thiếp', 'Postcards') : tr('Bản đồ', 'Map')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <FilterRow label={tr('Đi đâu', 'Where')}>
          <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pt-1">
            {cities.map((city) => (
              <li key={city.id} className="shrink-0">
                <CityStamp city={city} on={discover.cities.includes(city.id)} label={vi ? city.name : city.nameEn} onClick={() => setDiscover({ cities: toggle<CityId>(discover.cities, city.id) })} />
              </li>
            ))}
          </ul>
        </FilterRow>

        <FilterRow label={tr('Làm gì', 'What')}>
          <ul className="flex flex-wrap gap-2">
            {categoryIds.map((cat) => {
              const on = discover.categories.includes(cat)
              return (
                <li key={cat}>
                  <motion.button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDiscover({ categories: toggle<CategoryId>(discover.categories, cat) })}
                    whileHover={{ y: -3, rotate: -2 }}
                    whileTap={{ scale: 0.93 }}
                    transition={SPRING}
                    className={`flex items-center gap-1.5 border py-1 pl-1.5 pr-3 text-[0.8rem] font-semibold transition-colors ${on ? 'border-forest bg-forest text-paper' : 'border-forest/20 bg-white/70 text-ink/75 hover:border-terracotta'}`}
                  >
                    <motion.span animate={on ? { scale: [1, 1.3, 1], rotate: [0, -12, 0] } : { scale: 1 }} transition={{ duration: 0.45 }} className="block">
                      <CategoryIcon cat={cat} size={30} />
                    </motion.span>
                    {tr(categories[cat].vi, categories[cat].en)}
                  </motion.button>
                </li>
              )
            })}
          </ul>
        </FilterRow>

        <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-dashed border-forest/20 pt-5 md:grid-cols-[auto_auto_1fr] md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold text-ink/55">{tr('Túi tiền', 'Spend')}</p>
            <ul className="flex gap-2.5">
              {(
                [
                  ['free', '0', tr('Miễn phí', 'Free')],
                  ['low', '₫', '<100k'],
                  ['mid', '₫₫', '100–300k'],
                  ['high', '₫₫₫', '>300k'],
                ] as [PriceTier, string, string][]
              ).map(([tier, mark, hint]) => (
                <li key={tier}>
                  <Coin on={discover.prices.includes(tier)} mark={mark} hint={hint} onClick={() => setDiscover({ prices: toggle<PriceTier>(discover.prices, tier) })} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-ink/55">{tr('Đánh giá từ', 'Rated at least')}</p>
            <div className="flex gap-1.5">
              {[3.5, 4, 4.5].map((value) => {
                const on = discover.minRating === value
                return (
                  <button key={value} type="button" aria-pressed={on} onClick={() => setDiscover({ minRating: on ? 0 : value })} className={`chip !min-h-9 ${on ? 'chip-on' : ''}`}>
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.6 9.4l6.5-.8z" fill="#f0b94b" stroke="#173f35" strokeWidth="1.6" strokeLinejoin="round" />
                    </svg>
                    {value}+
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
            <button type="button" role="switch" aria-checked={discover.indoorOnly} onClick={() => setDiscover({ indoorOnly: !discover.indoorOnly })} className={`flex items-center gap-2 border px-3 py-1.5 text-[0.8rem] font-semibold transition-colors ${discover.indoorOnly ? 'border-jade bg-jade/12 text-jade-ink' : 'border-forest/20 text-ink/70 hover:border-terracotta'}`}>
              <WeatherIcon kind="rain" size={24} />
              {tr('Trốn mưa', 'Rain-proof')}
            </button>
            <SortTabs
              value={discover.sort}
              onChange={(sort) => setDiscover({ sort })}
              options={[
                { value: 'relevance', label: tr('Hợp nhất', 'Best match') },
                { value: 'rating', label: tr('Đánh giá', 'Top rated') },
                { value: 'price', label: tr('Giá thấp', 'Lowest price') },
                { value: 'distance', label: tr('Gần nhất', 'Nearest'), disabled: !anchor },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-2" aria-live="polite">
        <p className="text-sm font-semibold text-ink/70">
          {hits.length} {tr('tấm bưu thiếp', 'postcards')}
          {anchor && (
            <span className="ml-2 inline-flex items-center gap-1.5 bg-forest/8 px-2.5 py-1 text-xs font-bold text-forest">
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
        <ul className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {hits.slice(0, 48).map((hit, index) => (
            <Postcard key={hit.poi.id} hit={hit} index={index} saved={profile.saved.includes(hit.poi.id)} onToggle={() => toggleSaved(hit.poi.id)} onOpen={() => openPoi(hit.poi.id)} />
          ))}
        </ul>
      )}
      <PoiSheet />
    </>
  )
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-4 grid items-start gap-x-4 gap-y-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
      <span className="pt-2 text-xs font-semibold text-ink/55">{label}</span>
      {children}
    </div>
  )
}

/** A city as a passport stamp: round photo, ring that inks in when chosen. */
function CityStamp({ city, on, label, onClick }: { city: City; on: boolean; label: string; onClick: () => void }) {
  const src = cityImage[city.id]
  return (
    <motion.button type="button" aria-pressed={on} onClick={onClick} whileHover={{ y: -4, rotate: -3 }} whileTap={{ scale: 0.92 }} transition={SPRING} className="group flex w-[4.6rem] flex-col items-center gap-1.5">
      <span className={`relative grid size-14 place-items-center overflow-hidden rounded-full border-2 transition-[border-color,box-shadow] duration-300 ${on ? 'border-terracotta shadow-[0_0_0_3px_rgba(217,103,69,0.25)]' : 'border-forest/25 group-hover:border-forest/60'}`} style={{ background: city.tint }}>
        {src ? (
          <img src={src} alt="" loading="lazy" decoding="async" className={`size-full object-cover transition-all duration-500 ${on ? 'scale-110' : 'saturate-[0.65] group-hover:saturate-100'}`} />
        ) : (
          <CityArt city={city.id} className="size-full" />
        )}
        {on && (
          <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={SPRING} className="absolute inset-0 grid place-items-center bg-terracotta/55 text-paper" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </motion.span>
        )}
      </span>
      <span className={`text-center text-[0.7rem] font-semibold leading-tight transition-colors ${on ? 'text-terracotta' : 'text-ink/70'}`}>{label}</span>
    </motion.button>
  )
}

/** Price as a coin that flips when picked. */
function Coin({ on, mark, hint, onClick }: { on: boolean; mark: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="group flex w-[3.9rem] flex-col items-center gap-1" aria-label={`${mark} ${hint}`}>
      <motion.span
        animate={{ rotateY: on ? 360 : 0, y: on ? -3 : 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14 }}
        className={`grid size-11 place-items-center rounded-full border-2 text-[0.8rem] font-bold transition-colors ${on ? 'border-forest bg-sun text-forest shadow-[0_6px_0_-2px_rgba(23,63,53,0.35)]' : 'border-forest/30 bg-paper text-ink/60 group-hover:border-terracotta'}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {mark}
      </motion.span>
      <span className="text-[0.64rem] font-medium text-ink/55">{hint}</span>
    </button>
  )
}

function SortTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: { value: T; label: string; disabled?: boolean }[] }) {
  const id = useId()
  const { tr } = useTr()
  return (
    <div role="radiogroup" aria-label={tr('Sắp xếp', 'Sort')} className="flex flex-wrap gap-x-4 gap-y-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button key={option.value} type="button" role="radio" aria-checked={active} disabled={option.disabled} onClick={() => onChange(option.value)} className={`relative pb-1 text-[0.8rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${active ? 'text-forest' : 'text-ink/55 hover:text-ink'}`}>
            {option.label}
            {active && <motion.span layoutId={`sort-${id}`} className="absolute inset-x-0 bottom-0 h-0.5 bg-terracotta" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
          </button>
        )
      })}
    </div>
  )
}

/** A circular postmark: city name running round the rim, category sticker in the middle. */
function Postmark({ city, cat }: { city: string; cat: CategoryId }) {
  const id = useId()
  const { tr } = useTr()
  return (
    <svg viewBox="0 0 80 80" className="postmark" aria-hidden="true">
      <defs>
        <path id={id} d="M40 40m-29 0a29 29 0 1 1 58 0a29 29 0 1 1 -58 0" />
      </defs>
      <circle cx="40" cy="40" r="37" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 3.2" />
      <circle cx="40" cy="40" r="22" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text fontSize="8.4" fontWeight="700" letterSpacing="1.9" fill="currentColor">
        <textPath href={`#${id}`}>{`${city.toUpperCase()} • ${tr('VIỆT NAM', 'VIETNAM')} • `}</textPath>
      </text>
      <foreignObject x="24" y="24" width="32" height="32">
        <div className="size-full">
          <CategoryIcon cat={cat} size={32} />
        </div>
      </foreignObject>
    </svg>
  )
}

function Postcard({ hit, index, saved, onToggle, onOpen }: { hit: SearchHit; index: number; saved: boolean; onToggle: () => void; onOpen: () => void }) {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const { poi, distanceKm } = hit
  const now = nowMinutes()
  const open = poi.open <= now && now < poi.close
  const color = categories[poi.cat].color
  const city = cities.find((item) => item.id === poi.city)!
  const tier = tierOf(poi.cost)
  const [burst, setBurst] = useState(0)

  return (
    <motion.li
      initial={{ opacity: 0, y: 22, rotate: index % 2 ? 0.8 : -0.8 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.045, ease: [0.22, 1, 0.36, 1] }}
      className="postcard group relative"
      style={{ ['--pc' as string]: color }}
    >
      <button type="button" onClick={onOpen} className="flex h-full w-full flex-col text-left">
        <span className="postcard-art relative block h-36 overflow-hidden">
          <span className="postcard-scene absolute inset-0 block">
            <PlaceImage poi={poi} />
          </span>
          <svg viewBox="0 0 320 128" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
            <path className="postcard-route" d="M-6 112C54 52 96 118 150 78S244 30 330 70" fill="none" stroke="#fffaf0" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 9" />
          </svg>
          <span className="postcard-icon absolute bottom-2 left-3 grid size-14 place-items-center rounded-full border-2 border-[#173f35] bg-[#fbf5e6] text-[#173f35] shadow-[3px_3px_0_rgba(23,63,53,0.25)]">
            <CategoryIcon cat={poi.cat} size={42} />
          </span>
          <span className="absolute right-2 top-2 rounded-full bg-[#fbf5e6]/88 text-[#173f35]/85 shadow-[0_1px_6px_rgba(13,40,34,0.25)]">
            <Postmark city={vi ? city.name : city.nameEn} cat={poi.cat} />
          </span>
        </span>

        <span className="flex flex-1 flex-col p-4 pt-3.5">
          <span className="h-display block text-[1.18rem] leading-tight text-forest">{poi.name}</span>
          <span className="mt-1 block text-xs font-medium text-ink/55">
            <CategoryName cat={poi.cat} /> · {poi.area}
            {distanceKm !== undefined && ` · ${distanceKm.toFixed(1)} km`}
          </span>
          <span className="mt-2.5 line-clamp-2 text-[0.85rem] leading-relaxed text-ink/70">{poi.blurb[vi ? 0 : 1]}</span>

          <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-forest/25 pt-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <StarRating value={poi.rating} size={13} />
              <span className="tabular font-bold text-ink">{poi.rating.toFixed(1)}</span>
            </span>
            <span className="tabular font-semibold text-ink/80">{poi.cost ? formatVnd(poi.cost, true) : tr('Miễn phí', 'Free')}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-[0.66rem] font-bold tracking-wider">
              {tier !== 'free' && <span className="text-sun-ink">{{ low: '₫', mid: '₫₫', high: '₫₫₫' }[tier]}</span>}
              <span className={`border px-1.5 py-0.5 ${open ? 'border-jade-ink/60 text-jade-ink' : 'border-ink/20 text-ink/45'}`}>{open ? tr('ĐANG MỞ', 'OPEN') : `${fmtTime(poi.open)}–${fmtTime(poi.close)}`}</span>
            </span>
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (!saved) setBurst((count) => count + 1)
          onToggle()
        }}
        aria-pressed={saved}
        aria-label={saved ? tr('Bỏ yêu thích', 'Remove favourite') : tr('Yêu thích', 'Favourite')}
        className={`absolute left-2 top-2 grid size-10 place-items-center rounded-full bg-paper/85 backdrop-blur-sm transition-colors ${saved ? 'text-terracotta' : 'text-ink/40 hover:text-terracotta'}`}
      >
        <motion.span animate={saved ? { scale: [1, 1.5, 1], rotate: [0, -14, 0] } : { scale: 1 }} transition={{ duration: 0.4 }}>
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </motion.span>
        {burst > 0 && <HeartBurst key={burst} />}
      </button>
    </motion.li>
  )
}
