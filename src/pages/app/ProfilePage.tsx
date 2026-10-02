import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Bell, Check, Heart, RotateCcw, Save } from 'lucide-react'
import { goalOptions, readProfile, type Profile } from '../../api/profile'
import { useProfile, useSaveProfile } from '../../api/queries'
import { Khatam } from '../../components/art/Khatam'
import { PageHeader } from '../../components/PageHeader'
import { PoiSheet } from '../../components/place/PoiSheet'
import { CategoryGlyph, Segmented, Switch } from '../../components/ui/primitives'
import { categories, categoryIds, dietaryTags } from '../../domain/categories'
import { poiById } from '../../domain/pois'
import { formatVnd } from '../../domain/time'
import type { CategoryId } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'

/** Eight-axis radar of the traveler's taste. The polygon morphs as the sliders move. */
function TasteRadar({ interests }: { interests: Profile['interests'] }) {
  const { tr } = useTr()
  const size = 300
  const c = size / 2
  const r = 104
  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / categoryIds.length - Math.PI / 2
    return [c + Math.cos(angle) * r * value, c + Math.sin(angle) * r * value] as const
  }
  const path = categoryIds
    .map((cat, index) => {
      const [x, y] = point(index, 0.08 + (interests[cat] ?? 0.5) * 0.92)
      return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join('') + 'Z'

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[19rem]" role="img" aria-label={tr('Biểu đồ khẩu vị du lịch', 'Travel taste chart')}>
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon key={ring} points={categoryIds.map((_, i) => point(i, ring).join(',')).join(' ')} fill="none" stroke="currentColor" className="text-forest/14" strokeWidth="1" />
      ))}
      {categoryIds.map((cat, i) => {
        const [x, y] = point(i, 1)
        const [lx, ly] = point(i, 1.2)
        return (
          <g key={cat}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="currentColor" className="text-forest/14" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-ink/70 text-[10px] font-semibold">
              {tr(categories[cat].vi, categories[cat].en)}
            </text>
          </g>
        )
      })}
      <motion.path d={path} initial={false} animate={{ d: path }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} fill="#3a57d0" fillOpacity="0.14" stroke="#3a57d0" strokeWidth="2" strokeLinejoin="round" />
      {categoryIds.map((cat, i) => {
        const [x, y] = point(i, 0.08 + (interests[cat] ?? 0.5) * 0.92)
        return <motion.circle key={cat} cx={x} cy={y} r="4.5" fill="#3a57d0" stroke="#fffcf5" strokeWidth="2" initial={false} animate={{ cx: x, cy: y }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} />
      })}
    </svg>
  )
}

export function ProfilePage() {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const user = useAuthStore((state) => state.user)!
  const signIn = useAuthStore((state) => state.signIn)
  const query = useProfile()
  const save = useSaveProfile()
  const openPoi = useUiStore((state) => state.openPoi)

  const stored = query.data ?? readProfile(user.id, user.name)
  const [draft, setDraft] = useState<Profile>(stored)
  const [synced, setSynced] = useState(!!query.data)

  // Adopt the server copy once it arrives, without clobbering edits made while loading.
  if (query.data && !synced) {
    setDraft(query.data)
    setSynced(true)
  }

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(stored), [draft, stored])
  const patch = (next: Partial<Profile>) => setDraft((current) => ({ ...current, ...next }))

  const submit = () => {
    const name = draft.name.trim() || user.name
    save.mutate(
      { ...draft, name },
      {
        onSuccess: () => {
          if (name !== user.name) signIn({ ...user, name })
          toast('success', tr('Đã lưu hồ sơ', 'Profile saved'), tr('Các lịch trình mới sẽ dùng sở thích này.', 'New itineraries will use these tastes.'))
        },
      },
    )
  }

  return (
    <>
      <PageHeader title={tr('Hồ sơ & sở thích', 'Profile & preferences')} subtitle={tr('Những gì bạn chọn ở đây trở thành điểm số ưu tiên (C trong công thức S) và ràng buộc cứng khi Jinnie lập lịch.', 'What you set here becomes the preference score (C in S) and the hard constraints when Jinnie plans.')} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="panel p-5 sm:p-6" aria-labelledby="who">
            <h2 id="who" className="h-display text-xl text-forest">
              {tr('Về bạn', 'About you')}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="p-name" className="mb-1.5 block text-[0.8rem] font-semibold text-ink/75">
                  {tr('Tên hiển thị', 'Display name')}
                </label>
                <input id="p-name" value={draft.name} onChange={(event) => patch({ name: event.target.value })} className="h-11 w-full rounded-xl border border-forest/20 bg-white px-3 text-sm outline-none focus:border-lapis" />
              </div>
              <div>
                <label htmlFor="p-email" className="mb-1.5 block text-[0.8rem] font-semibold text-ink/75">
                  Email
                </label>
                <input id="p-email" value={user.email} readOnly className="h-11 w-full rounded-xl border border-forest/10 bg-forest/5 px-3 text-sm text-ink/60" />
              </div>
            </div>
            <fieldset className="mt-5">
              <legend className="mb-2 text-[0.8rem] font-semibold text-ink/75">{tr('Mục tiêu chuyến đi', 'Trip goals')}</legend>
              <div className="flex flex-wrap gap-2">
                {goalOptions.map((goal) => {
                  const on = draft.goals.includes(goal.id)
                  return (
                    <button key={goal.id} type="button" aria-pressed={on} className={`chip ${on ? 'chip-on' : ''}`} onClick={() => patch({ goals: on ? draft.goals.filter((g) => g !== goal.id) : [...draft.goals, goal.id] })}>
                      {on && <Check size={13} aria-hidden="true" />}
                      {vi ? goal.vi : goal.en}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="taste">
            <div className="flex items-center justify-between gap-3">
              <h2 id="taste" className="h-display text-xl text-forest">
                {tr('Khẩu vị du lịch', 'Travel taste')}
              </h2>
              <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-lapis hover:underline" onClick={() => patch({ interests: {} })}>
                <RotateCcw size={13} aria-hidden="true" /> {tr('Đặt lại', 'Reset')}
              </button>
            </div>
            <div className="mt-4 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ul className="space-y-3">
                {categoryIds.map((cat) => {
                  const value = draft.interests[cat] ?? 0.5
                  return (
                    <li key={cat} className="flex items-center gap-3">
                      <CategoryGlyph cat={cat} size={30} />
                      <label htmlFor={`i-${cat}`} className="w-20 shrink-0 text-[0.8rem] font-semibold text-ink/80">
                        {tr(categories[cat].vi, categories[cat].en)}
                      </label>
                      <input id={`i-${cat}`} type="range" className="range" min={0} max={100} value={Math.round(value * 100)} style={{ ['--fill' as string]: `${value * 100}%` }} onChange={(event) => patch({ interests: { ...draft.interests, [cat as CategoryId]: Number(event.target.value) / 100 } })} />
                      <span className="tabular w-8 text-right text-xs font-bold text-forest">{Math.round(value * 100)}</span>
                    </li>
                  )
                })}
              </ul>
              <TasteRadar interests={draft.interests} />
            </div>
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="style">
            <h2 id="style" className="h-display text-xl text-forest">
              {tr('Phong cách đi', 'Travel style')}
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[0.8rem] font-semibold text-ink/75">{tr('Nhịp độ mặc định', 'Default pace')}</p>
                <Segmented label="p-pace" value={draft.pace} onChange={(pace) => patch({ pace })} options={[{ value: 'slow', label: tr('Chậm', 'Slow') }, { value: 'balanced', label: tr('Vừa', 'Balanced') }, { value: 'fast', label: tr('Nhanh', 'Fast') }]} />
              </div>
              <div>
                <p className="mb-2 text-[0.8rem] font-semibold text-ink/75">{tr('Di chuyển', 'Getting around')}</p>
                <Segmented label="p-transport" value={draft.transport} onChange={(transport) => patch({ transport })} options={[{ value: 'walk', label: tr('Đi bộ', 'Walk') }, { value: 'bike', label: tr('Xe máy', 'Bike') }, { value: 'taxi', label: 'Taxi' }]} />
              </div>
            </div>
            <div className="mt-6">
              <div className="mb-1 flex items-baseline justify-between">
                <label htmlFor="p-budget" className="text-[0.8rem] font-semibold text-ink/75">
                  {tr('Ngân sách mỗi ngày', 'Daily budget')}
                </label>
                <span className="tabular text-sm font-bold text-forest">{formatVnd(draft.budgetPerDay)}</span>
              </div>
              <input id="p-budget" type="range" className="range" min={300_000} max={3_000_000} step={50_000} value={draft.budgetPerDay} style={{ ['--fill' as string]: `${((draft.budgetPerDay - 300_000) / 2_700_000) * 100}%` }} onChange={(event) => patch({ budgetPerDay: Number(event.target.value) })} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel p-5 sm:p-6" aria-labelledby="diet">
            <h2 id="diet" className="h-display text-xl text-forest">
              {tr('Ăn uống & dị ứng', 'Food & allergies')}
            </h2>
            <p className="mt-1 text-sm text-ink/60">{tr('Đây là ràng buộc cứng: địa điểm có các thành phần này sẽ không bao giờ được xếp.', 'These are hard constraints: places with these ingredients are never scheduled.')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {dietaryTags.map((tag) => {
                const on = draft.dietary.includes(tag.id)
                return (
                  <button key={tag.id} type="button" aria-pressed={on} className={`chip ${on ? '!border-pomegranate !bg-pomegranate !text-white' : ''}`} onClick={() => patch({ dietary: on ? draft.dietary.filter((d) => d !== tag.id) : [...draft.dietary, tag.id] })}>
                    {on ? tr('Tránh', 'Avoid') : '+'} {vi ? tag.vi : tag.en}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="alerts">
            <h2 id="alerts" className="h-display flex items-center gap-2 text-xl text-forest">
              <Bell size={18} className="text-lapis" aria-hidden="true" /> {tr('Cảnh báo khi đang đi', 'Alerts while travelling')}
            </h2>
            <ul className="mt-3 divide-y divide-forest/10">
              {(
                [
                  ['traffic', tr('Kẹt xe trên tuyến', 'Traffic on your route'), tr('Báo khi di chuyển chậm hơn dự kiến', 'When travel runs slower than planned')],
                  ['weather', tr('Thời tiết xấu', 'Bad weather'), tr('Mưa lớn hoặc dông ảnh hưởng điểm ngoài trời', 'Heavy rain affecting outdoor stops')],
                  ['closure', tr('Điểm đóng cửa', 'Venue closures'), tr('Khi một điểm trong lịch đóng đột xuất', 'When a stop closes unexpectedly')],
                  ['delay', tr('Trễ lịch', 'Running late'), tr('Khi bạn chậm so với khung giờ', 'When you fall behind schedule')],
                ] as const
              ).map(([key, title, hint]) => (
                <li key={key} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="text-xs text-ink/55">{hint}</p>
                  </div>
                  <Switch checked={draft.alerts[key]} onChange={(value) => patch({ alerts: { ...draft.alerts, [key]: value } })} label={title} />
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="saved">
            <h2 id="saved" className="h-display flex items-center gap-2 text-xl text-forest">
              <Heart size={18} className="text-pomegranate" aria-hidden="true" /> {tr('Địa điểm đã lưu', 'Saved places')}
            </h2>
            {draft.saved.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">{tr('Chạm trái tim ở trang Khám phá để lưu địa điểm bạn thích.', 'Tap the heart in Discover to save places you like.')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {draft.saved.map((id) => {
                  const poi = poiById[id]
                  if (!poi) return null
                  return (
                    <li key={id}>
                      <button type="button" onClick={() => openPoi(id)} className="flex w-full items-center gap-3 rounded-xl border border-forest/10 bg-white/70 p-2.5 text-left transition-colors hover:border-lapis/40">
                        <CategoryGlyph cat={poi.cat} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{poi.name}</span>
                          <span className="block truncate text-xs text-ink/50">{poi.area}</span>
                        </span>
                        <Khatam size={12} className="text-gold" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ y: dirty ? 0 : 120, opacity: dirty ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 lg:bottom-6 lg:pl-[17.5rem]"
        aria-hidden={!dirty}
      >
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-night px-4 py-3 text-paper shadow-[0_24px_50px_-18px_rgba(9,13,43,0.9)] ring-1 ring-gold/30">
          <span className="text-sm font-medium">{tr('Bạn có thay đổi chưa lưu', 'You have unsaved changes')}</span>
          <button type="button" className="btn-ghost btn-sm !border-paper/25 !text-paper" tabIndex={dirty ? 0 : -1} onClick={() => setDraft(stored)}>
            {tr('Hoàn lại', 'Revert')}
          </button>
          <button type="button" className="btn-gold btn-sm" tabIndex={dirty ? 0 : -1} onClick={submit} disabled={save.isPending}>
            <Save size={15} aria-hidden="true" /> {tr('Lưu thay đổi', 'Save changes')}
          </button>
        </div>
      </motion.div>
      <PoiSheet />
    </>
  )
}
