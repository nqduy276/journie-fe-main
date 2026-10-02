import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, CloudSun, Heart, Loader2, Lock, Minus, Plus, Save, Sparkles, Wand2 } from 'lucide-react'
import { analyzeRequest, generateItinerary, topPicks, type PlanReport } from '../../api/planner'
import { readProfile } from '../../api/profile'
import { track } from '../../api/analytics'
import { useCreateTrip, useProfile } from '../../api/queries'
import { Khatam } from '../../components/art/Khatam'
import { GenieAvatar } from '../../components/auth/GenieAvatar'
import { CityCover } from '../../components/CityCover'
import { RouteMap } from '../../components/map/RouteMap'
import { DayTabs, TripStats } from '../../components/trip/parts'
import { describeTrip } from '../../components/trip/explain'
import { Timeline } from '../../components/trip/Timeline'
import { Segmented, SolverBadge } from '../../components/ui/primitives'
import { PageHeader } from '../../components/PageHeader'
import { weatherFor } from '../../domain/conditions'
import { explainPoi } from '../../domain/scoring'
import { cities, cityById, poiById } from '../../domain/pois'
import { retimeDay, tripCost } from '../../domain/solver'
import { formatVnd, todayIso } from '../../domain/time'
import type { Intent } from '../../domain/nlp'
import type { CityId, Pace, TransportPref } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'

type Phase = 'compose' | 'review' | 'generating' | 'result'

type Params = { city?: CityId; days: number; startDate: string; budget: number; pace: Pace; transport: TransportPref }

const EXAMPLES: [string, string][] = [
  ['Ba ngày ở Hội An, đi thật chậm, ăn nhiều món địa phương, ngân sách 4 triệu.', 'Three slow days in Hoi An, lots of local food, budget 4 million.'],
  ['Cuối tuần ở Đà Lạt, săn mây, cà phê view đẹp, không ăn thịt bò.', 'A weekend in Da Lat: clouds, coffee with a view, no beef.'],
  ['Một ngày Sài Gòn: bảo tàng, cà phê, ăn phở, đi xe máy, về trước 21h.', 'One day in Saigon: museums, coffee, pho, by motorbike, back before 9pm.'],
  ['Hai ngày Ninh Bình, thích thiên nhiên và chụp ảnh, dị ứng hải sản.', 'Two days in Ninh Binh, nature and photos, seafood allergy.'],
  ['Phú Quốc 3 ngày nhịp nhanh, biển và hoàng hôn, tối đa 6 triệu.', 'Phu Quoc, 3 fast days, beaches and sunsets, at most 6 million.'],
]

const STAGES = [
  { vi: 'Đọc lời ước (LLM)', en: 'Reading your wish (LLM)' },
  { vi: 'Thu thập thời tiết, giao thông, địa điểm', en: 'Gathering weather, traffic and places' },
  { vi: 'Chấm điểm từng địa điểm', en: 'Scoring each place' },
  { vi: 'Chọn và sắp xếp (CP-SAT)', en: 'Selecting and sequencing (CP-SAT)' },
  { vi: 'Tối ưu tuyến đường (OSRM)', en: 'Optimising the route (OSRM)' },
  { vi: 'Gán khung giờ và dựng lịch', en: 'Assigning time slots' },
] as const

export function PlanPage() {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const user = useAuthStore((state) => state.user)!
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const createTrip = useCreateTrip()

  const [phase, setPhase] = useState<Phase>('compose')
  const [text, setText] = useState('')
  const [intent, setIntent] = useState<Intent | null>(null)
  const [params, setParams] = useState<Params>({ days: 2, startDate: todayIso(), budget: 2_000_000, pace: profile.pace, transport: profile.transport })
  const [report, setReport] = useState<PlanReport | null>(null)
  const [stage, setStage] = useState(0)
  const [dayIndex, setDayIndex] = useState(0)
  const [title, setTitle] = useState('')
  const [activeUid, setActiveUid] = useState<string | null>(null)
  const autoRan = useRef(false)

  const analyze = useMutation({
    mutationFn: analyzeRequest,
    onSuccess: (result) => {
      setIntent(result)
      setParams((current) => ({
        city: result.city,
        days: result.days ?? current.days,
        startDate: current.startDate,
        budget: result.budget ?? profile.budgetPerDay * (result.days ?? current.days),
        pace: result.pace ?? profile.pace,
        transport: result.transport ?? profile.transport,
      }))
      setPhase('review')
    },
    onError: () => toast('danger', tr('Chưa đọc được lời ước', 'Could not read your wish'), tr('Thử lại sau giây lát.', 'Please try again in a moment.')),
  })

  const generate = useMutation({
    mutationFn: () => generateItinerary({ text, userId: user.id, profile, overrides: params }, intent!),
    onError: () => {
      toast('danger', tr('Không dựng được lịch trình', 'Could not build the itinerary'))
      setPhase('review')
    },
  })

  // A wish typed on the dashboard arrives in router state and starts analysis immediately.
  useEffect(() => {
    const wish = (location.state as { wish?: string } | null)?.wish
    if (wish && !autoRan.current) {
      autoRan.current = true
      setText(wish)
      analyze.mutate(wish)
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reveal pipeline stages one by one; finish once the solver has answered.
  useEffect(() => {
    if (phase !== 'generating') return
    const timer = window.setInterval(() => setStage((value) => Math.min(STAGES.length, value + 1)), 760)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase === 'generating' && stage >= STAGES.length && generate.isSuccess) {
      const timer = window.setTimeout(() => {
        setReport(generate.data)
        setTitle(generate.data.trip.title)
        setDayIndex(0)
        setPhase('result')
      }, 450)
      return () => window.clearTimeout(timer)
    }
  }, [phase, stage, generate.isSuccess, generate.data])

  const start = () => {
    setStage(0)
    setPhase('generating')
    generate.mutate()
  }

  const reset = () => {
    setPhase('compose')
    setReport(null)
    setIntent(null)
    generate.reset()
    analyze.reset()
  }

  const save = () => {
    if (!report) return
    const trip = { ...report.trip, title: title.trim() || report.trip.title }
    createTrip.mutate(trip, {
      onSuccess: () => {
        track({ type: 'trip_created', city: trip.city })
        toast('success', tr('Đã lưu lịch trình', 'Itinerary saved'), tr('Bạn có thể kéo thả để chỉnh sửa.', 'Drag and drop to fine-tune it.'))
        navigate(`/app/trips/${trip.id}`)
      },
      onError: () => toast('danger', tr('Chưa lưu được', 'Could not save')),
    })
  }

  return (
    <>
      <PageHeader
        title={phase === 'result' ? tr('Lịch trình của bạn đã sẵn sàng', 'Your itinerary is ready') : tr('Ước một chuyến đi', 'Wish for a trip')}
        subtitle={
          phase === 'result'
            ? tr('Xem lại, đổi tên và lưu để bắt đầu chỉnh sửa.', 'Review it, rename it and save to start editing.')
            : tr('Kể bằng lời của bạn: đi đâu, mấy ngày, thích gì, ngân sách. Jinnie lo phần còn lại.', 'Say it your way: where, how long, what you like, your budget. Jinnie does the rest.')
        }
        actions={
          phase !== 'compose' && (
            <button type="button" className="btn-ghost btn-sm" onClick={phase === 'review' ? reset : () => (phase === 'result' ? reset() : undefined)} disabled={phase === 'generating'}>
              <ArrowLeft size={15} aria-hidden="true" />
              {tr('Ước lại', 'Wish again')}
            </button>
          )
        }
      />

      <AnimatePresence mode="wait" initial={false}>
        {phase === 'compose' && (
          <motion.div key="compose" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <Composer text={text} setText={setText} busy={analyze.isPending} onSubmit={() => text.trim().length > 6 && analyze.mutate(text)} />
          </motion.div>
        )}
        {phase === 'review' && intent && (
          <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <Review text={text} intent={intent} params={params} setParams={setParams} onGenerate={start} />
          </motion.div>
        )}
        {phase === 'generating' && (
          <motion.div key="generating" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Pipeline stage={stage} report={generate.data} params={params} intent={intent} />
          </motion.div>
        )}
        {phase === 'result' && report && (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Result
              report={report}
              title={title}
              setTitle={setTitle}
              dayIndex={dayIndex}
              setDayIndex={setDayIndex}
              activeUid={activeUid}
              setActiveUid={setActiveUid}
              onSave={save}
              saving={createTrip.isPending}
              vi={vi}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ───────── 1. compose ───────── */

function Composer({ text, setText, busy, onSubmit }: { text: string; setText: (value: string) => void; busy: boolean; onSubmit: () => void }) {
  const { tr } = useTr()
  const ready = text.trim().length > 6
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="panel-night p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="hidden w-24 shrink-0 sm:block">
            <GenieAvatar mood={busy ? 'thinking' : text ? 'watching' : 'idle'} className="aspect-[360/470] w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="wish" className="h-display text-[1.45rem] text-paper">
              {tr('Điều ước du lịch của bạn là gì?', 'What is your travel wish?')}
            </label>
            <p className="mt-1 text-sm text-paper/60">{tr('Càng cụ thể, kế hoạch càng hợp bạn. Dị ứng và giờ giấc sẽ được coi là ràng buộc cứng.', 'The more specific, the better the fit. Allergies and times become hard constraints.')}</p>
          </div>
        </div>
        <textarea
          id="wish"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') onSubmit()
          }}
          rows={5}
          maxLength={600}
          placeholder={tr('Ví dụ: Ba ngày ở Hội An, đi thật chậm, ăn nhiều món địa phương, ngân sách 4 triệu…', 'e.g. Three slow days in Hoi An, lots of local food, budget 4 million…')}
          className="mt-5 w-full resize-none rounded-xl border border-gold/30 bg-night/50 px-4 py-3.5 font-display text-[1.08rem] italic leading-relaxed text-paper caret-gold outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-paper/35 focus:border-gold focus:shadow-[0_0_0_4px_rgba(246,203,90,0.15)]"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="tabular text-xs text-paper/45">{text.length}/600 · Ctrl + Enter</p>
          <button type="button" className="btn-gold" onClick={onSubmit} disabled={!ready || busy}>
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Wand2 size={18} aria-hidden="true" />}
            {busy ? tr('Jinnie đang đọc…', 'Jinnie is reading…') : tr('Gửi điều ước', 'Send my wish')}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-ink/70">{tr('Cần ý tưởng? Chạm để thử:', 'Need ideas? Tap to try one:')}</p>
        {EXAMPLES.map(([vi, en], index) => (
          <motion.button
            key={vi}
            type="button"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + index * 0.07, duration: 0.5 }}
            whileHover={{ x: 4 }}
            onClick={() => setText(tr(vi, en))}
            className="panel block w-full px-4 py-3 text-left font-display text-[0.98rem] italic leading-snug text-ink/80 transition-colors hover:border-gold hover:bg-gold/8"
          >
            <Heart size={13} className="mr-2 inline text-pomegranate" aria-hidden="true" />
            {tr(vi, en)}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/* ───────── 2. review what Jinnie understood ───────── */

function Review({ text, intent, params, setParams, onGenerate }: { text: string; intent: Intent; params: Params; setParams: (value: Params) => void; onGenerate: () => void }) {
  const { tr, language, locale } = useTr()
  const vi = language === 'vi'
  const set = <K extends keyof Params>(key: K, value: Params[K]) => setParams({ ...params, [key]: value })
  const weather = params.city ? weatherFor(params.city, params.startDate) : null
  const needsCity = !params.city

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="panel p-5 sm:p-6" aria-labelledby="understood">
          <h2 id="understood" className="h-display text-xl text-forest">
            {tr('Jinnie đã hiểu thế này', 'Here is what Jinnie understood')}
          </h2>
          <p className="mt-2 border-l-2 border-gold pl-3 font-display text-[0.98rem] italic leading-relaxed text-ink/70">“{text}”</p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={tr('Yêu cầu đã trích xuất', 'Extracted requirements')}>
            {intent.chips.length === 0 && <li className="text-sm text-ink/55">{tr('Chưa bắt được chi tiết nào. Hãy chỉnh các thông số bên dưới.', 'Nothing specific found. Set the details below.')}</li>}
            {intent.chips.map((chip, index) => (
              <motion.li
                key={`${chip.field}-${chip.vi}`}
                initial={{ opacity: 0, scale: 0.7, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22, delay: index * 0.07 }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold ${
                  chip.kind === 'hard' ? 'bg-lapis text-paper' : 'border border-gold bg-gold/15 text-[#7a4f00]'
                }`}
              >
                {chip.kind === 'hard' ? <Lock size={12} aria-hidden="true" /> : <Heart size={12} aria-hidden="true" />}
                {vi ? chip.vi : chip.en}
              </motion.li>
            ))}
          </ul>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.72rem] text-ink/55">
            <span className="inline-flex items-center gap-1.5">
              <Lock size={11} aria-hidden="true" /> {tr('Ràng buộc cứng: luôn được giữ', 'Hard constraint: always kept')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart size={11} aria-hidden="true" /> {tr('Ưu tiên mềm: cân nhắc khi tối ưu', 'Soft preference: weighed during optimisation')}
            </span>
          </p>
        </section>

        <section className="panel p-5 sm:p-6" aria-labelledby="params">
          <h2 id="params" className="h-display text-xl text-forest">
            {tr('Chỉnh lại nếu cần', 'Adjust if needed')}
          </h2>

          <fieldset className="mt-4">
            <legend className="mb-2 text-[0.8rem] font-semibold text-ink/75">
              {tr('Điểm đến', 'Destination')}
              {needsCity && <span className="ml-2 font-bold text-pomegranate">{tr('Chọn một nơi để tiếp tục', 'Pick one to continue')}</span>}
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {cities.map((city) => {
                const active = params.city === city.id
                return (
                  <button
                    key={city.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set('city', city.id)}
                    className={`relative overflow-hidden rounded-xl text-left transition-transform duration-300 active:scale-95 ${active ? 'ring-[3px] ring-gold ring-offset-2 ring-offset-paper' : 'opacity-85 hover:opacity-100'}`}
                  >
                    <CityCover city={city.id} className="h-16 w-full">
                      <span className="absolute inset-x-2.5 bottom-1.5 flex items-center justify-between text-[0.8rem] font-bold text-white">
                        {vi ? city.name : city.nameEn}
                        {active && <Check size={15} className="text-gold" />}
                      </span>
                    </CityCover>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[0.8rem] font-semibold text-ink/75">{tr('Số ngày', 'Days')}</p>
              <div className="inline-flex items-center rounded-xl border border-forest/15 bg-white">
                <button type="button" className="grid size-11 place-items-center text-ink/55 hover:text-lapis disabled:opacity-30" disabled={params.days <= 1} onClick={() => set('days', params.days - 1)} aria-label={tr('Bớt một ngày', 'One day less')}>
                  <Minus size={16} />
                </button>
                <span className="tabular w-16 text-center text-lg font-bold text-forest" aria-live="polite">
                  {params.days}
                </span>
                <button type="button" className="grid size-11 place-items-center text-ink/55 hover:text-lapis disabled:opacity-30" disabled={params.days >= 7} onClick={() => set('days', params.days + 1)} aria-label={tr('Thêm một ngày', 'One day more')}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="start-date" className="mb-2 block text-[0.8rem] font-semibold text-ink/75">
                {tr('Ngày khởi hành', 'Start date')}
              </label>
              <input id="start-date" type="date" min={todayIso()} value={params.startDate} onChange={(event) => set('startDate', event.target.value || todayIso())} className="h-11 w-full rounded-xl border border-forest/15 bg-white px-3 text-sm outline-none focus:border-lapis" />
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1 flex items-baseline justify-between">
              <label htmlFor="budget" className="text-[0.8rem] font-semibold text-ink/75">
                {tr('Ngân sách cả chuyến', 'Total budget')}
              </label>
              <span className="tabular text-sm font-bold text-forest">
                {formatVnd(params.budget)} <span className="font-normal text-ink/50">· ~{formatVnd(Math.round(params.budget / params.days), true)}/{tr('ngày', 'day')}</span>
              </span>
            </div>
            <input
              id="budget"
              type="range"
              className="range"
              min={500_000}
              max={15_000_000}
              step={100_000}
              value={params.budget}
              style={{ ['--fill' as string]: `${((params.budget - 500_000) / 14_500_000) * 100}%` }}
              onChange={(event) => set('budget', Number(event.target.value))}
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[0.8rem] font-semibold text-ink/75">{tr('Nhịp độ', 'Pace')}</p>
              <Segmented
                label="pace"
                value={params.pace}
                onChange={(value) => set('pace', value)}
                options={[
                  { value: 'slow', label: tr('Chậm', 'Slow') },
                  { value: 'balanced', label: tr('Vừa', 'Balanced') },
                  { value: 'fast', label: tr('Nhanh', 'Fast') },
                ]}
              />
              <p className="mt-1.5 text-[0.7rem] text-ink/50">
                {tr('Tối đa', 'Up to')} {{ slow: 4, balanced: 6, fast: 8 }[params.pace]} {tr('điểm mỗi ngày', 'stops a day')}
              </p>
            </div>
            <div>
              <p className="mb-2 text-[0.8rem] font-semibold text-ink/75">{tr('Di chuyển', 'Getting around')}</p>
              <Segmented
                label="transport"
                value={params.transport}
                onChange={(value) => set('transport', value)}
                options={[
                  { value: 'walk', label: tr('Đi bộ', 'Walk') },
                  { value: 'bike', label: tr('Xe máy', 'Bike') },
                  { value: 'taxi', label: 'Taxi' },
                ]}
              />
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="panel-night p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-gold">
            <CloudSun size={17} aria-hidden="true" /> {tr('Dữ liệu thời gian thực', 'Real-time data')}
          </p>
          {weather && params.city ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-end gap-3">
                <span className="h-display text-5xl text-paper">{weather.tempC}°</span>
                <span className="pb-1.5 text-sm text-paper/70">
                  {vi ? cityById[params.city].name : cityById[params.city].nameEn} ·{' '}
                  {new Date(`${params.startDate}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="text-sm text-paper/80">{weather.note[vi ? 0 : 1]}</p>
              <p className="tabular text-xs text-paper/55">
                {tr('Khả năng mưa', 'Chance of rain')}: {weather.rainChance}%
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-paper/60">{tr('Chọn điểm đến để xem thời tiết và giao thông.', 'Pick a destination to see weather and traffic.')}</p>
          )}
        </div>
        <button type="button" className="btn-gold w-full" onClick={onGenerate} disabled={needsCity}>
          <Sparkles size={18} aria-hidden="true" />
          {tr('Tạo lịch trình', 'Build my itinerary')}
        </button>
        <p className="text-center text-xs text-ink/50">{tr('Bước tiếp theo mất vài giây.', 'The next step takes a few seconds.')}</p>
      </aside>
    </div>
  )
}

/* ───────── 3. pipeline ───────── */

function Pipeline({ stage, report, params, intent }: { stage: number; report?: PlanReport; params: Params; intent: Intent | null }) {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const details = [
    tr(`${intent?.chips.length ?? 0} yêu cầu: ${intent?.chips.filter((chip) => chip.kind === 'hard').length ?? 0} cứng, ${intent?.chips.filter((chip) => chip.kind === 'soft').length ?? 0} mềm`, `${intent?.chips.length ?? 0} requirements: ${intent?.chips.filter((chip) => chip.kind === 'hard').length ?? 0} hard, ${intent?.chips.filter((chip) => chip.kind === 'soft').length ?? 0} soft`),
    report ? `${report.weather.tempC}°C · ${tr('mưa', 'rain')} ${report.weather.rainChance}% · ${report.considered} ${tr('địa điểm', 'places')}` : '…',
    report ? tr(`Công thức S = αC + βR + γP + δB + εG, loại ${report.excluded} điểm`, `S = αC + βR + γP + δB + εG, ${report.excluded} excluded`) : '…',
    report ? `${report.trip.solver.status} · ${report.trip.solver.nodes.toLocaleString(vi ? 'vi-VN' : 'en-US')} ${tr('trạng thái', 'states')} · ${report.trip.solver.ms} ms` : '…',
    tr('Ước lượng quãng đường bằng bảng OSRM', 'Travel times from the OSRM table'),
    report ? tr(`${report.trip.days.reduce((n, day) => n + day.stops.length, 0)} điểm, ${params.days} ngày`, `${report.trip.days.reduce((n, day) => n + day.stops.length, 0)} stops over ${params.days} day(s)`) : '…',
  ]

  return (
    <div className="panel-night mx-auto max-w-3xl p-6 sm:p-9">
      <div className="flex items-center gap-5">
        <div className="w-24 shrink-0">
          <GenieAvatar mood="thinking" className="aspect-[360/470] w-full" />
        </div>
        <div>
          <h2 className="h-display text-[1.6rem] text-paper">{tr('Jinnie đang xoa đèn…', 'Jinnie is rubbing the lamp…')}</h2>
          <p className="mt-1 text-sm text-paper/60">{tr('Mỗi bước dưới đây là một phần thật của quy trình lập lịch.', 'Each step below is a real part of the planning pipeline.')}</p>
        </div>
      </div>

      <ol className="mt-7 space-y-1">
        {STAGES.map((item, index) => {
          const done = stage > index
          const active = stage === index
          return (
            <li key={item.en} className="relative flex gap-4 pb-5 last:pb-0">
              {index < STAGES.length - 1 && <span className="absolute left-[1.15rem] top-10 h-[calc(100%-2.2rem)] w-px bg-paper/15" aria-hidden="true" />}
              <span className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full border transition-colors duration-500 ${done ? 'border-firuze bg-firuze text-night' : active ? 'border-gold bg-gold/15 text-gold' : 'border-paper/20 text-paper/30'}`}>
                {done ? <Check size={18} /> : active ? <Khatam size={18} className="!animate-[spin-slow_2.4s_linear_infinite]" /> : <span className="text-xs font-bold">{index + 1}</span>}
              </span>
              <div className="min-w-0 pt-1.5">
                <p className={`text-[0.95rem] font-semibold transition-colors ${done || active ? 'text-paper' : 'text-paper/40'}`}>{vi ? item.vi : item.en}</p>
                <AnimatePresence>
                  {done && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="tabular mt-0.5 overflow-hidden text-[0.8rem] text-firuze">
                      {details[index]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-paper/10" role="progressbar" aria-valuemin={0} aria-valuemax={STAGES.length} aria-valuenow={stage}>
        <motion.div className="h-full bg-gradient-to-r from-firuze via-gold to-pomegranate" animate={{ width: `${(stage / STAGES.length) * 100}%` }} transition={{ ease: 'easeOut', duration: 0.6 }} />
      </div>
    </div>
  )
}

/* ───────── 4. result ───────── */

type ResultProps = {
  report: PlanReport
  title: string
  setTitle: (value: string) => void
  dayIndex: number
  setDayIndex: (value: number) => void
  activeUid: string | null
  setActiveUid: (value: string | null) => void
  onSave: () => void
  saving: boolean
  vi: boolean
}

function Result({ report, title, setTitle, dayIndex, setDayIndex, activeUid, setActiveUid, onSave, saving, vi }: ResultProps) {
  const { tr } = useTr()
  const { trip } = report
  const day = trip.days[dayIndex]
  const picks = topPicks(trip, 4)
  const checks = [
    { ok: trip.days.every((d) => retimeDay(d.stops, { city: trip.city, dayStart: trip.dayStart, dayEnd: trip.dayEnd, transport: trip.transport }).violations.length === 0), label: tr('Mọi điểm nằm trong giờ mở cửa', 'Every stop within opening hours') },
    { ok: trip.days.every((d) => (d.stops[d.stops.length - 1]?.end ?? 0) <= trip.dayEnd), label: tr('Kết thúc trước giờ đã đặt', 'Day ends on time') },
    { ok: tripCost(trip.days) <= trip.budget, label: tr('Chi phí trong ngân sách', 'Cost within budget') },
    { ok: trip.mustInclude.every((id) => trip.days.some((d) => d.stops.some((s) => s.poiId === id))), label: tr('Có đủ điểm bắt buộc', 'Mandatory stops included') },
    { ok: trip.days.every((d) => d.stops.every((s) => !poiById[s.poiId].tags.some((tag) => trip.avoidTags.includes(tag)))), label: tr('Không có điểm bạn cần tránh', 'Nothing you asked to avoid') },
  ]

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <div className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="trip-title" className="sr-only">
                {tr('Tên lịch trình', 'Itinerary name')}
              </label>
              <input id="trip-title" value={title} onChange={(event) => setTitle(event.target.value)} className="h-display w-full border-b border-transparent bg-transparent text-2xl text-forest outline-none transition-colors hover:border-forest/20 focus:border-gold" />
              <p className="mt-1 text-xs text-ink/50">
                {vi ? cityById[trip.city].name : cityById[trip.city].nameEn} · {trip.days.length} {tr('ngày', 'day(s)')}
              </p>
            </div>
            <SolverBadge status={trip.solver.status} />
          </div>
          <div className="mt-5">
            <TripStats trip={trip} />
          </div>
          <button type="button" className="btn-gold mt-5 w-full" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
            {tr('Lưu & bắt đầu chỉnh sửa', 'Save and start editing')}
          </button>
        </div>

        <div className="panel p-5">
          <h2 className="h-display text-lg text-forest">{tr('Vì sao là những điểm này?', 'Why these places?')}</h2>
          <div className="mt-2 space-y-2 text-[0.9rem] leading-relaxed text-ink/75">
            {describeTrip(trip, vi).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {picks.map(({ poi, parts }) => (
              <li key={poi.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{poi.name}</span>
                <span className="flex shrink-0 gap-1.5">
                  {explainPoi(parts, poi, trip.rainy).map((reason) => (
                    <span key={reason.key} className="rounded-full bg-lapis/10 px-2 py-0.5 text-[0.68rem] font-semibold text-lapis">
                      {{ match: tr('Hợp gu', 'Fits taste'), rating: tr('Đánh giá cao', 'Top rated'), budget: tr('Vừa túi tiền', 'In budget'), central: tr('Gần trung tâm', 'Central'), popular: tr('Nổi tiếng', 'Popular'), indoor: tr('Trong nhà', 'Indoor') }[reason.key]}
                    </span>
                  ))}
                  <span className="tabular w-9 text-right text-xs font-bold text-forest">{Math.round(parts.score * 100)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-5">
          <h2 className="h-display text-lg text-forest">{tr('Ràng buộc đã được kiểm tra', 'Constraints verified')}</h2>
          <ul className="mt-3 space-y-2">
            {checks.map((check) => (
              <li key={check.label} className="flex items-center gap-2.5 text-sm text-ink/80">
                <span className={`grid size-5 place-items-center rounded-full ${check.ok ? 'bg-firuze text-white' : 'bg-pomegranate text-white'}`}>
                  <Check size={12} strokeWidth={3} />
                </span>
                {check.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel p-4 sm:p-5">
          <DayTabs trip={trip} value={dayIndex} onChange={setDayIndex} />
          <div className="mt-4">
            <Timeline stops={day.stops} readOnly activeUid={activeUid} onSelect={setActiveUid} />
          </div>
        </div>
        <div className="panel overflow-hidden xl:sticky xl:top-6">
          <RouteMap stops={day.stops} activeUid={activeUid} onSelect={setActiveUid} className="h-[22rem] w-full" />
        </div>
      </div>
    </div>
  )
}
