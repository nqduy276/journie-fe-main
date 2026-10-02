import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, Heart, Save } from 'lucide-react'
import { readProfile, type Profile } from '../../api/profile'
import { useProfile, useSaveProfile } from '../../api/queries'
import { CategoryIcon } from '../../components/icons'
import { DiAvatar } from '../../components/mascot/DiAvatar'
import { PageHeader } from '../../components/PageHeader'
import { PoiSheet } from '../../components/place/PoiSheet'
import { CategoryGlyph, Segmented, Switch } from '../../components/ui/primitives'
import { categories, categoryIds, dietaryTags } from '../../domain/categories'
import { extractIntent } from '../../domain/nlp'
import { poiById } from '../../domain/pois'
import { formatVnd } from '../../domain/time'
import type { CategoryId } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'

const PICKED = 0.7

const pickedFrom = (interests: Profile['interests']) => categoryIds.filter((cat) => (interests[cat] ?? 0) >= PICKED)

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

  const about = draft.about ?? ''
  // What Di understood from the free text, shown live so nothing is a surprise after saving.
  const heard = useMemo(() => extractIntent(about), [about])
  const picked = pickedFrom(draft.interests)
  const effective = useMemo(() => [...new Set([...picked, ...(Object.keys(heard.interests) as CategoryId[])])], [picked, heard.interests])
  const avoided = useMemo(() => [...new Set([...draft.dietary, ...heard.avoidTags])], [draft.dietary, heard.avoidTags])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(stored), [draft, stored])
  const patch = (next: Partial<Profile>) => setDraft((current) => ({ ...current, ...next }))

  const toggleCat = (cat: CategoryId) => {
    const next = { ...draft.interests }
    if ((next[cat] ?? 0) >= PICKED) delete next[cat]
    else next[cat] = 0.9
    patch({ interests: next })
  }

  const alertsOn = Object.values(draft.alerts).every(Boolean)

  const submit = () => {
    const name = draft.name.trim() || user.name
    // Words typed in "about" become real weights and avoid-tags, so Di's plans follow them.
    const interests = { ...draft.interests }
    for (const cat of Object.keys(heard.interests) as CategoryId[]) interests[cat] = Math.max(interests[cat] ?? 0, 0.9)
    const dietary = [...new Set([...draft.dietary, ...heard.avoidTags])]
    save.mutate(
      { ...draft, name, about: about.trim(), interests, dietary },
      {
        onSuccess: (_data, saved) => {
          setDraft(saved)
          if (name !== user.name) signIn({ ...user, name })
          toast('success', tr('Đã lưu hồ sơ', 'Profile saved'), tr('Di sẽ nhớ và dùng cho lịch trình mới.', 'Di will remember this for new itineraries.'))
        },
      },
    )
  }

  return (
    <>
      <PageHeader title={tr('Hồ sơ của bạn', 'Your profile')} subtitle={tr('Chỉ cần vài ý chính. Phần còn lại Di tự đoán, và bạn luôn chỉnh lại được trong từng chuyến đi.', 'Just a few key ideas. Di guesses the rest, and you can always tweak it per trip.')} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-6">
          <section className="panel p-5 sm:p-6" aria-labelledby="who">
            <label htmlFor="p-name" className="block text-[0.8rem] font-semibold text-ink/75">
              {tr('Di nên gọi bạn là gì?', 'What should Di call you?')}
            </label>
            <input id="p-name" value={draft.name} onChange={(event) => patch({ name: event.target.value })} className="mt-1.5 h-11 w-full max-w-sm border border-forest/25 bg-white px-3 text-sm outline-none transition-colors focus:border-terracotta" />
            <p id="who" className="mt-1.5 text-xs text-ink/50">{user.email}</p>
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="taste">
            <h2 id="taste" className="h-display text-xl text-forest">
              {tr('Bạn thích đi kiểu nào?', 'What kind of traveler are you?')}
            </h2>
            <p className="mt-1 text-sm text-ink/60">{tr('Chạm vào những thứ bạn mê, chọn bao nhiêu cũng được.', 'Tap what you love, as many as you like.')}</p>
            <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {categoryIds.map((cat) => {
                const on = (draft.interests[cat] ?? 0) >= PICKED
                return (
                  <li key={cat}>
                    <motion.button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleCat(cat)}
                      whileTap={{ scale: 0.94 }}
                      whileHover={{ y: -3, rotate: on ? 0 : -1.5 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                      className={`relative flex w-full flex-col items-center gap-1.5 border px-2 py-3.5 text-[0.8rem] font-semibold transition-colors ${on ? 'border-forest bg-forest text-paper' : 'border-forest/20 bg-white/70 text-ink/75 hover:border-terracotta'}`}
                    >
                      <motion.span animate={{ scale: on ? [1, 1.28, 1] : 1, rotate: on ? [0, -10, 0] : 0 }} transition={{ duration: 0.45 }} className="block">
                        <CategoryIcon cat={cat} size={38} />
                      </motion.span>
                      {tr(categories[cat].vi, categories[cat].en)}
                      {on && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-1.5 top-1.5 size-2 rounded-full bg-sun" aria-hidden="true" />
                      )}
                    </motion.button>
                  </li>
                )
              })}
            </ul>

            <label htmlFor="p-about" className="mt-6 block text-[0.8rem] font-semibold text-ink/75">
              {tr('Hoặc kể bằng lời của bạn (không bắt buộc)', 'Or say it in your own words (optional)')}
            </label>
            <textarea
              id="p-about"
              rows={3}
              maxLength={280}
              value={about}
              onChange={(event) => patch({ about: event.target.value })}
              placeholder={tr('Mình thích ăn đường phố, quán cà phê có view, không thích chen chúc và không ăn hải sản…', 'I love street food and cafés with a view, I hate crowds and I do not eat seafood…')}
              className="mt-1.5 w-full resize-none border border-forest/25 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-ink/35 focus:border-terracotta"
            />

            <div className="mt-4 flex min-h-8 flex-wrap items-center gap-2" aria-live="polite">
              <span className="text-xs font-semibold text-ink/55">{tr('Di hiểu là:', 'Di understood:')}</span>
              <AnimatePresence initial={false}>
                {effective.map((cat) => (
                  <motion.span key={cat} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ type: 'spring', stiffness: 420, damping: 24 }} className="inline-flex items-center gap-1.5 border border-forest/20 bg-white py-0.5 pl-1 pr-2.5 text-xs font-semibold text-forest">
                    <CategoryIcon cat={cat} size={20} />
                    {tr(categories[cat].vi, categories[cat].en)}
                  </motion.span>
                ))}
                {avoided.map((tag) => {
                  const info = dietaryTags.find((item) => item.id === tag)
                  return (
                    <motion.span key={tag} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} className="inline-flex items-center gap-1 border border-pomegranate/40 bg-pomegranate/8 px-2.5 py-1 text-xs font-semibold text-pomegranate">
                      {tr('Tránh', 'Avoid')} {info ? (vi ? info.vi : info.en) : tag}
                    </motion.span>
                  )
                })}
              </AnimatePresence>
              {effective.length === 0 && avoided.length === 0 && <span className="text-xs text-ink/45">{tr('chưa có gì, cứ để Di gợi ý đa dạng', 'nothing yet, Di will mix it up')}</span>}
            </div>
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="style">
            <h2 id="style" className="h-display text-xl text-forest">
              {tr('Nhịp đi & ngân sách', 'Pace & budget')}
            </h2>
            <div className="mt-4 max-w-md">
              <Segmented label="p-pace" value={draft.pace} onChange={(pace) => patch({ pace })} options={[{ value: 'slow', label: tr('Thong thả', 'Slow') }, { value: 'balanced', label: tr('Vừa phải', 'Balanced') }, { value: 'fast', label: tr('Nhiều điểm', 'Packed') }]} />
            </div>
            <div className="mt-6 max-w-md">
              <div className="mb-1 flex items-baseline justify-between">
                <label htmlFor="p-budget" className="text-[0.8rem] font-semibold text-ink/75">
                  {tr('Ngân sách mỗi ngày', 'Daily budget')}
                </label>
                <span className="tabular text-sm font-bold text-forest">{formatVnd(draft.budgetPerDay)}</span>
              </div>
              <input id="p-budget" type="range" className="range" min={300_000} max={3_000_000} step={50_000} value={draft.budgetPerDay} style={{ ['--fill' as string]: `${((draft.budgetPerDay - 300_000) / 2_700_000) * 100}%` }} onChange={(event) => patch({ budgetPerDay: Number(event.target.value) })} />
            </div>

            <div className="mt-6">
              <p className="mb-2 text-[0.8rem] font-semibold text-ink/75">{tr('Món nào bạn không ăn được?', 'Anything you cannot eat?')}</p>
              <div className="flex flex-wrap gap-2">
                {dietaryTags.map((tag) => {
                  const on = draft.dietary.includes(tag.id)
                  return (
                    <button key={tag.id} type="button" aria-pressed={on} className={`chip ${on ? '!border-pomegranate !bg-pomegranate !text-white' : ''}`} onClick={() => patch({ dietary: on ? draft.dietary.filter((d) => d !== tag.id) : [...draft.dietary, tag.id] })}>
                      {vi ? tag.vi : tag.en}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8">
          <section className="panel-night p-5 text-center">
            <DiAvatar mood={dirty ? 'wave' : 'idle'} trail={false} className="mx-auto aspect-[300/340] w-32" />
            <p className="h-display mt-2 text-lg text-paper">{tr('Di ghi nhớ giúp bạn', 'Di is taking notes')}</p>
            <p className="mt-1 text-[0.82rem] leading-relaxed text-paper/70">{tr('Càng ít càng tốt. Chọn vài thứ bạn mê là Di biết cách xếp lịch.', 'Less is more. Pick a few loves and Di knows how to plan.')}</p>
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <Bell size={18} className="mt-0.5 shrink-0 text-terracotta" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-ink">{tr('Báo khi cần đổi kế hoạch', 'Tell me when plans must change')}</p>
                  <p className="text-xs leading-snug text-ink/55">{tr('Mưa lớn, kẹt xe, điểm đóng cửa hay trễ giờ.', 'Heavy rain, traffic, closures or running late.')}</p>
                </div>
              </div>
              <Switch checked={alertsOn} onChange={(value) => patch({ alerts: { traffic: value, weather: value, closure: value, delay: value } })} label={tr('Báo khi cần đổi kế hoạch', 'Tell me when plans must change')} />
            </div>
          </section>

          <section className="panel p-5" aria-labelledby="saved">
            <h2 id="saved" className="h-display flex items-center gap-2 text-lg text-forest">
              <Heart size={17} className="text-terracotta" aria-hidden="true" /> {tr('Nơi bạn đã lưu', 'Saved places')}
            </h2>
            {draft.saved.length === 0 ? (
              <p className="mt-2 text-sm text-ink/55">{tr('Thả tim ở trang Khám phá để lưu nơi bạn thích.', 'Tap the heart in Discover to save places you like.')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {draft.saved.map((id) => {
                  const poi = poiById[id]
                  if (!poi) return null
                  return (
                    <li key={id}>
                      <button type="button" onClick={() => openPoi(id)} className="flex w-full items-center gap-3 border border-forest/12 bg-white/70 p-2 text-left transition-colors hover:border-terracotta">
                        <CategoryGlyph cat={poi.cat} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{poi.name}</span>
                          <span className="block truncate text-xs text-ink/50">{poi.area}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <motion.div
        initial={false}
        animate={{ y: dirty ? 0 : 120, opacity: dirty ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 lg:bottom-6 lg:pl-[17.5rem]"
        aria-hidden={!dirty}
      >
        <div className="pointer-events-auto flex items-center gap-3 border border-sun/40 bg-night px-4 py-3 text-paper shadow-[0_24px_50px_-18px_rgba(13,40,34,0.9)]">
          <span className="text-sm font-medium">{tr('Bạn có thay đổi chưa lưu', 'You have unsaved changes')}</span>
          <button type="button" className="btn-ghost btn-sm !border-paper/25 !text-paper" tabIndex={dirty ? 0 : -1} onClick={() => setDraft(stored)}>
            {tr('Hoàn lại', 'Revert')}
          </button>
          <button type="button" className="btn-gold btn-sm" tabIndex={dirty ? 0 : -1} onClick={submit} disabled={save.isPending}>
            <Save size={15} aria-hidden="true" /> {tr('Lưu', 'Save')}
          </button>
        </div>
      </motion.div>
      <PoiSheet />
    </>
  )
}
