import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowLeft, Check, Flag, Navigation, Pause, Play, Radar, Siren, Timer, TrafficCone, Store, Zap } from 'lucide-react'
import { track } from '../../api/analytics'
import { useSaveTrip, useTrip } from '../../api/queries'
import { WeatherIcon } from '../../components/icons'
import { RouteMap } from '../../components/map/RouteMap'
import { PoiSheet } from '../../components/place/PoiSheet'
import { Timeline } from '../../components/trip/Timeline'
import { EmptyState, Segmented, Skeleton, Switch } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { PageHeader } from '../../components/PageHeader'
import { congestionAt, weatherFor } from '../../domain/conditions'
import { applyReplan, disruptionMeta, LAMBDAS, replanDay, type ReplanOption } from '../../domain/replan'
import { cityById, poiById } from '../../domain/pois'
import { addDays, fmtMinutes, fmtTime, formatVnd, todayIso } from '../../domain/time'
import type { Disruption, Stop, Trip } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useNotificationStore } from '../../store/notificationStore'
import { useWeatherStore } from '../../store/weatherStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'

/** Speed of the demo clock in simulated minutes per real second. */
const SPEEDS = [
  { id: '1x', rate: 1 / 60, label: '×1' },
  { id: '60x', rate: 1, label: '×60' },
  { id: '300x', rate: 5, label: '×300' },
] as const

type Place = { lat: number; lng: number }

function locate(stops: Stop[], now: number): { me: Place | null; phase: 'before' | 'visiting' | 'travelling' | 'waiting' | 'after'; index: number; progress: number } {
  if (!stops.length) return { me: null, phase: 'before', index: 0, progress: 0 }
  const first = poiById[stops[0].poiId]
  if (now < stops[0].start) return { me: first, phase: 'before', index: 0, progress: 0 }
  for (let i = 0; i < stops.length; i += 1) {
    const stop = stops[i]
    const poi = poiById[stop.poiId]
    if (now >= stop.start && now < stop.end) return { me: poi, phase: 'visiting', index: i, progress: (now - stop.start) / Math.max(1, stop.end - stop.start) }
    const prev = stops[i - 1]
    if (prev && now >= prev.end && now < stop.start) {
      const from = poiById[prev.poiId]
      const frac = Math.min(1, (now - prev.end) / Math.max(1, stop.travelMin))
      const waiting = frac >= 1
      return {
        me: { lat: from.lat + (poi.lat - from.lat) * frac, lng: from.lng + (poi.lng - from.lng) * frac },
        phase: waiting ? 'waiting' : 'travelling',
        index: i,
        progress: frac,
      }
    }
  }
  const last = poiById[stops[stops.length - 1].poiId]
  return { me: last, phase: 'after', index: stops.length - 1, progress: 1 }
}

type LogLine = { id: number; at: number; text: string; tone: 'ok' | 'warn' }

export function LivePage() {
  const { id } = useParams()
  const { tr, language, locale } = useTr()
  const vi = language === 'vi'
  const tripQuery = useTrip(id)
  const save = useSaveTrip()
  const { activeUid, setActiveUid, openPoi } = useUiStore()
  const pushNote = useNotificationStore((state) => state.push)

  const trip = tripQuery.data
  const dayIndex = useMemo(() => {
    if (!trip) return 0
    const diff = Math.round((new Date(`${todayIso()}T00:00:00`).getTime() - new Date(`${trip.startDate}T00:00:00`).getTime()) / 86_400_000)
    return Math.min(trip.days.length - 1, Math.max(0, diff))
  }, [trip])
  const stops = trip?.days[dayIndex]?.stops

  const [clock, setClock] = useState<number | null>(null)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]['id']>('60x')
  const [auto, setAuto] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const [event, setEvent] = useState<{ disruption: Disruption; at: number } | null>(null)
  const [sheet, setSheet] = useState(false)
  const [lambda, setLambda] = useState(0.9)
  const ticks = useRef(0)
  const lastCheck = useRef(0)
  const logId = useRef(0)

  // The demo clock starts a few minutes before the first stop.
  const startAt = trip && stops?.length ? Math.max(trip.dayStart, stops[0].start - 8) : null
  const now = clock ?? startAt

  const rate = SPEEDS.find((item) => item.id === speed)!.rate
  const blocked = sheet || !!event
  useEffect(() => {
    if (!playing || blocked || startAt === null) return
    const timer = window.setInterval(() => setClock((value) => (value ?? startAt ?? 0) + rate * 0.2), 200)
    return () => window.clearInterval(timer)
  }, [playing, blocked, rate, now === null, startAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const addLog = useCallback((text: string, tone: LogLine['tone'], at: number) => {
    setLog((lines) => [{ id: logId.current++, at, text, tone }, ...lines].slice(0, 6))
  }, [])

  const trigger = useCallback(
    (disruption: Disruption, at: number) => {
      if (!trip) return
      setEvent({ disruption, at })
      // Heavy rain is not just a card: the whole app turns rainy until the traveler decides what to do.
      if (disruption.kind === 'weather') useWeatherStore.getState().setOverride('rain', 5 * 60_000)
      track({ type: 'replan_suggested', city: trip.city, reason: disruption.kind })
      const label = disruptionMeta[disruption.kind]
      pushNote({ kind: disruption.kind, vi: `${label.vi} trong chuyến “${trip.title}”`, en: `${label.en} on “${trip.title}”`, bodyVi: 'Di đề xuất điều chỉnh phần còn lại của ngày.', bodyEn: 'Di suggests adjusting the rest of the day.', to: `/app/trips/${trip.id}/live` })
      addLog(tr(`Phát hiện: ${label.vi}`, `Detected: ${label.en}`), 'warn', at)
    },
    [addLog, pushNote, tr, trip],
  )

  // The condition monitor from the "adapt to external factors" flow: poll every 10 simulated minutes.
  useEffect(() => {
    if (!trip || now === null || blocked) return
    if (now - lastCheck.current < 10) return
    lastCheck.current = now
    ticks.current += 1
    const traffic = congestionAt(trip.city, now)
    const weather = weatherFor(trip.city, addDays(trip.startDate, dayIndex))
    addLog(
      traffic > 1.2
        ? tr(`Giao thông đông (×${traffic.toFixed(1)}), thời tiết ${weather.tempC}°C`, `Traffic heavy (×${traffic.toFixed(1)}), ${weather.tempC}°C`)
        : tr(`Giao thông thông thoáng, ${weather.tempC}°C. Lịch vẫn ổn.`, `Traffic clear, ${weather.tempC}°C. Plan still fine.`),
      'ok',
      now,
    )
    if (auto && ticks.current % 4 === 0 && stops) {
      const upcoming = stops.find((stop) => stop.start > now + 10)
      const kinds: Disruption[] = [{ kind: 'traffic', minutes: 25 }, { kind: 'weather', until: now + 90 }, { kind: 'delay', minutes: 30 }]
      if (upcoming) kinds.push({ kind: 'closure', poiId: upcoming.poiId })
      trigger(kinds[Math.floor(Math.random() * kinds.length)], now)
    }
  }, [now, trip, blocked, auto, stops, dayIndex, addLog, tr, trigger])

  const where = useMemo(() => (stops && now !== null ? locate(stops, now) : null), [stops, now])

  // λ is the traveler's choice: the solver re-runs for the exact value on the slider.
  const result = useMemo(() => {
    if (!trip || !event) return null
    return replanDay(trip, dayIndex, event.at, event.disruption, [{ id: 'custom', lambda }])
  }, [trip, dayIndex, event, lambda])
  const chosen: ReplanOption | null = result?.options[0] ?? null

  if (tripQuery.isLoading) return <Skeleton className="h-[36rem]" />
  if (!trip || !stops || !where || now === null) {
    return (
      <EmptyState
        title={tr('Không mở được chuyến đi', 'Could not open the trip')}
        body={tr('Lịch trình không tồn tại hoặc chưa có điểm nào.', 'The itinerary does not exist or has no stops yet.')}
        action={
          <Link to="/app/trips" className="btn-gold">
            {tr('Về danh sách', 'Back to trips')}
          </Link>
        }
      />
    )
  }

  const city = cityById[trip.city]
  const nextStop = stops[Math.min(stops.length - 1, where.phase === 'visiting' ? where.index + 1 : where.index)]
  const current = where.phase === 'visiting' ? stops[where.index] : null
  const last = stops[stops.length - 1]
  const dayLength = Math.max(1, trip.dayEnd - trip.dayStart)
  const elapsed = Math.min(1, Math.max(0, (now - trip.dayStart) / dayLength))
  const slack = trip.dayEnd - last.end
  const finished = where.phase === 'after'
  const doneCount = stops.filter((stop) => stop.end <= now).length

  const inject = (disruption: Disruption) => trigger(disruption, now)

  const apply = (option: ReplanOption) => {
    if (!result || !event) return
    const next = applyReplan(trip, dayIndex, result.completed, option)
    save.mutate(next)
    track({ type: 'replan_accepted', city: trip.city, reason: event.disruption.kind, lambda: option.lambda })
    toast('success', tr('Đã cập nhật lịch trình', 'Itinerary updated'), tr(`${option.kept.length} điểm giữ lại, ${option.added.length} thêm mới, ${option.dropped.length} bỏ.`, `${option.kept.length} kept, ${option.added.length} added, ${option.dropped.length} dropped.`))
    addLog(tr('Đã áp dụng phương án mới', 'Applied the new plan'), 'ok', now)
    setSheet(false)
    setEvent(null)
    if (event.disruption.kind === 'weather') useWeatherStore.getState().clearOverride()
  }

  const dismiss = () => {
    if (event) track({ type: 'replan_dismissed', city: trip.city, reason: event.disruption.kind })
    setSheet(false)
    setEvent(null)
    if (event?.disruption.kind === 'weather') useWeatherStore.getState().clearOverride()
    addLog(tr('Bạn giữ nguyên lịch cũ', 'You kept the original plan'), 'ok', now)
  }

  const complete = () => {
    save.mutate({ ...trip, status: 'completed' })
    toast('success', tr('Hoàn thành chuyến đi!', 'Trip complete!'), tr('Hẹn gặp lại ở hành trình tiếp theo.', 'See you on the next journey.'))
  }

  return (
    <>
      <PageHeader
        kicker={
          <Link to={`/app/trips/${trip.id}`} className="inline-flex items-center gap-1.5 hover:underline">
            <ArrowLeft size={14} aria-hidden="true" /> {tr('Về lịch trình', 'Back to itinerary')}
          </Link>
        }
        title={trip.title}
        subtitle={tr(`${city.name} · đồng hồ mô phỏng, bạn có thể tua nhanh để xem Di theo dõi chuyến đi.`, `${city.nameEn} · a simulated clock; speed it up to watch Di track the trip.`)}
        actions={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setPlaying((value) => !value)} aria-pressed={playing}>
              {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
              {playing ? tr('Tạm dừng', 'Pause') : tr('Tiếp tục', 'Resume')}
            </button>
            <Segmented label="speed" value={speed} onChange={setSpeed} options={SPEEDS.map((item) => ({ value: item.id, label: item.label }))} />
          </>
        }
      />

      <AnimatePresence>
        {event && !sheet && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-sun/70 bg-gradient-to-r from-sun/25 via-sun/10 to-transparent p-4 shadow-[0_18px_38px_-22px_rgba(240,185,75,0.9)]"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sun text-night">
              <Siren size={22} aria-hidden="true" />
              <span className="pulse-dot absolute size-12 rounded-full text-sun" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">{tr('Di phát hiện: ', 'Di noticed: ')}{vi ? disruptionMeta[event.disruption.kind].vi : disruptionMeta[event.disruption.kind].en}</p>
              <p className="text-sm text-ink/70">{describeDisruption(event.disruption, vi)}</p>
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={dismiss}>
              {tr('Giữ lịch cũ', 'Keep plan')}
            </button>
            <button type="button" className="btn-gold btn-sm" onClick={() => setSheet(true)}>
              <Zap size={15} aria-hidden="true" /> {tr('Xem phương án', 'See options')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-5 xl:sticky xl:top-6">
          <div className="panel relative overflow-hidden">
            <RouteMap stops={stops} me={where.me} activeUid={activeUid ?? stops[where.index]?.uid} onSelect={setActiveUid} className="h-[26rem] w-full" />
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] flex flex-wrap items-end justify-between gap-2">
              <div className="pointer-events-auto rounded-xl bg-night/90 px-4 py-3 text-paper shadow-xl">
                <p className="tabular text-[1.7rem] font-bold leading-none text-gold">{fmtTime(now)}</p>
                <p className="mt-1 text-[0.7rem] text-paper/60">{tr('Giờ mô phỏng', 'Simulated time')}</p>
              </div>
              <div className="pointer-events-auto max-w-[17rem] rounded-xl bg-paper/95 px-4 py-3 shadow-xl">
                <p className="flex items-center gap-1.5 text-[0.7rem] font-bold text-lapis">
                  <Navigation size={12} aria-hidden="true" />
                  {finished ? tr('Đã hoàn thành lịch hôm nay', 'Day complete') : where.phase === 'visiting' ? tr('Đang ở', 'Now at') : where.phase === 'before' ? tr('Sắp xuất phát', 'About to start') : tr('Đang đến', 'Heading to')}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-ink">{poiById[(current ?? nextStop).poiId].name}</p>
                {!finished && where.phase !== 'visiting' && <p className="tabular text-xs text-ink/55">{tr('Dự kiến đến', 'ETA')} {fmtTime(nextStop.start)}</p>}
                {where.phase === 'visiting' && current && <p className="tabular text-xs text-ink/55">{tr('Còn', 'Left')} {fmtMinutes(current.end - now, vi)}</p>}
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <div className="panel flex items-center gap-5 p-5">
              <TimeRing value={elapsed} label={fmtMinutes(Math.max(0, trip.dayEnd - now), vi)} sub={tr('còn lại hôm nay', 'left today')} />
              <dl className="space-y-1.5 text-sm">
                <div>
                  <dt className="text-[0.7rem] text-ink/50">{tr('Đã xong', 'Done')}</dt>
                  <dd className="tabular font-bold">{doneCount}/{stops.length}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] text-ink/50">{tr('Dư thời gian', 'Slack')}</dt>
                  <dd className={`tabular font-bold ${slack < 30 ? 'text-pomegranate' : 'text-jade-ink'}`}>{fmtMinutes(Math.max(0, slack), vi)}</dd>
                </div>
              </dl>
            </div>

            <div className="panel p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Radar size={16} className="text-lapis" aria-hidden="true" /> {tr('Nhật ký theo dõi', 'Monitor log')}
              </h2>
              <ul className="mt-3 space-y-1.5" aria-live="polite">
                {log.length === 0 && <li className="text-xs text-ink/50">{tr('Di sẽ kiểm tra giao thông và thời tiết mỗi 10 phút.', 'Di checks traffic and weather every 10 minutes.')}</li>}
                <AnimatePresence initial={false}>
                  {log.map((line) => (
                    <motion.li key={line.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 text-xs">
                      <span className="tabular w-10 shrink-0 text-ink/45">{fmtTime(line.at)}</span>
                      <span className={line.tone === 'warn' ? 'font-semibold text-sun-ink' : 'text-ink/70'}>{line.text}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-ink">{tr('Thử một sự cố', 'Try a disruption')}</h2>
                <p className="text-xs text-ink/55">{tr('Mô phỏng điều kiện thay đổi giữa chuyến đi.', 'Simulate conditions changing mid-trip.')}</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-ink/70">
                {tr('Tự động', 'Auto')}
                <Switch checked={auto} onChange={setAuto} label={tr('Tự động giả lập sự cố', 'Auto-simulate disruptions')} />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(
                [
                  { icon: TrafficCone, vi: 'Kẹt xe', en: 'Traffic', d: { kind: 'traffic', minutes: 25 } as Disruption },
                  { icon: 'rain', vi: 'Mưa lớn', en: 'Heavy rain', d: { kind: 'weather', until: now + 90 } as Disruption },
                  { icon: Store, vi: 'Đóng cửa', en: 'Closure', d: (stops.find((stop) => stop.start > now) ? { kind: 'closure', poiId: stops.find((stop) => stop.start > now)!.poiId } : null) as Disruption | null },
                  { icon: Timer, vi: 'Trễ 30′', en: 'Late 30′', d: { kind: 'delay', minutes: 30 } as Disruption },
                ] as const
              ).map((item) => (
                <button key={item.vi} type="button" disabled={!item.d || !!event || finished} onClick={() => item.d && inject(item.d)} className="flex flex-col items-center gap-1.5 rounded-xl border border-forest/15 bg-white/70 px-2 py-3 text-xs font-semibold text-ink/80 transition-[border-color,transform,background-color] duration-300 hover:-translate-y-0.5 hover:border-sun hover:bg-sun/10 disabled:opacity-40 disabled:hover:translate-y-0">
                  {item.icon === 'rain' ? <WeatherIcon kind="rain" size={28} /> : <item.icon size={20} className="text-sun-ink" aria-hidden="true" />}
                  {tr(item.vi, item.en)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className="panel p-4 sm:p-5" aria-label={tr('Tiến độ hôm nay', "Today's progress")}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="h-display text-xl text-forest">{tr('Hôm nay', 'Today')}</h2>
            <span className="tabular text-xs text-ink/55">{fmtTime(trip.dayStart)}–{fmtTime(trip.dayEnd)}</span>
          </div>
          <Timeline
            stops={stops}
            readOnly
            nowMinutes={now}
            activeUid={activeUid}
            onSelect={(uid) => {
              setActiveUid(uid)
              const stop = stops.find((entry) => entry.uid === uid)
              if (stop) openPoi(stop.poiId)
            }}
          />
          <AnimatePresence>
            {finished && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl bg-gradient-to-br from-firuze/20 to-gold/20 p-5 text-center">
                <Flag size={26} className="mx-auto text-lapis" aria-hidden="true" />
                <p className="h-display mt-2 text-xl text-forest">{tr('Bạn đã đi hết lịch trình hôm nay!', 'You finished the day’s itinerary!')}</p>
                <p className="mt-1 text-sm text-ink/65">{formatVnd(stops.reduce((s, stop) => s + poiById[stop.poiId].cost + stop.travelCost, 0))} · {stops.length} {tr('điểm', 'stops')}</p>
                {dayIndex === trip.days.length - 1 ? (
                  <button type="button" className="btn-gold mt-4" onClick={complete} disabled={trip.status === 'completed'}>
                    <Check size={17} aria-hidden="true" /> {trip.status === 'completed' ? tr('Đã hoàn thành', 'Completed') : tr('Kết thúc chuyến đi', 'Finish the trip')}
                  </button>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <ReplanSheet
        open={sheet}
        onClose={() => setSheet(false)}
        trip={trip}
        dayIndex={dayIndex}
        event={event}
        result={result}
        chosen={chosen}
        lambda={lambda}
        setLambda={setLambda}
        onApply={apply}
        onDismiss={dismiss}
        locale={locale}
      />
      <PoiSheet />
    </>
  )
}

function describeDisruption(disruption: Disruption, vi: boolean) {
  switch (disruption.kind) {
    case 'traffic':
      return vi ? `Tuyến phía trước chậm khoảng ${disruption.minutes} phút so với dự kiến.` : `The route ahead is about ${disruption.minutes} minutes slower than planned.`
    case 'weather':
      return vi ? `Mưa lớn đến ${fmtTime(disruption.until)}, các điểm ngoài trời không phù hợp.` : `Heavy rain until ${fmtTime(disruption.until)}; outdoor stops are not a good fit.`
    case 'closure':
      return vi ? `${poiById[disruption.poiId].name} đóng cửa đột xuất.` : `${poiById[disruption.poiId].name} has closed unexpectedly.`
    case 'delay':
      return vi ? `Bạn đang trễ ${disruption.minutes} phút so với lịch.` : `You are ${disruption.minutes} minutes behind schedule.`
  }
}

function TimeRing({ value, label, sub }: { value: number; label: string; sub: string }) {
  const size = 112
  const radius = 46
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label} ${sub}`}>
      <svg viewBox="0 0 112 112" className="-rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="currentColor" strokeWidth="9" className="text-forest/10" />
        <motion.circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference * (1 - value) }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4fb8a4" />
            <stop offset="1" stopColor="#f0b94b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="tabular text-[0.95rem] font-bold leading-tight text-forest">{label}</p>
          <p className="text-[0.6rem] text-ink/50">{sub}</p>
        </div>
      </div>
    </div>
  )
}

/* ───────── replanning ───────── */

type ReplanProps = {
  open: boolean
  onClose: () => void
  trip: Trip
  dayIndex: number
  event: { disruption: Disruption; at: number } | null
  result: ReturnType<typeof replanDay> | null
  chosen: ReplanOption | null
  lambda: number
  setLambda: (value: number) => void
  onApply: (option: ReplanOption) => void
  onDismiss: () => void
  locale: string
}

function ReplanSheet({ open, onClose, event, result, chosen, lambda, setLambda, onApply, onDismiss }: ReplanProps) {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  if (!event || !result) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const base = result.baseline
  const presetName = (id: ReplanOption['id']) => ({ keep: tr('Giữ gần như nguyên', 'Keep it close'), balanced: tr('Cân bằng', 'Balanced'), fresh: tr('Trải nghiệm tốt nhất', 'Best experience'), custom: tr('Theo ý bạn', 'Your mix') })[id]
  const names = (ids: string[]) => ids.map((poiId) => poiById[poiId].name)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={tr('Phương án điều chỉnh', 'Replanning options')}
      description={describeDisruption(event.disruption, vi)}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-ghost btn-sm" onClick={onDismiss}>
            {tr('Giữ lịch cũ', 'Keep original')}
          </button>
          <button type="button" className="btn-gold btn-sm" disabled={!chosen} onClick={() => chosen && onApply(chosen)}>
            <Check size={15} aria-hidden="true" /> {tr('Áp dụng phương án này', 'Apply this option')}
          </button>
        </div>
      }
    >
      <div className="rounded-xl border border-pomegranate/30 bg-pomegranate/6 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-pomegranate">
          <AlertTriangle size={16} aria-hidden="true" />
          {base.violations.length ? tr('Nếu giữ nguyên lịch cũ', 'If you keep the original plan') : tr('Lịch cũ vẫn khả thi nhưng có thể trễ', 'The original still works but may run late')}
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink/75">
          {base.violations.map((violation) => (
            <li key={violation.uid + violation.detail}>{vi ? violation.detail : violation.detailEn}</li>
          ))}
          <li className="tabular">
            {tr('Kết thúc lúc', 'Ends at')} {fmtTime(base.endTime)}
          </li>
        </ul>
      </div>

      <section className="mt-6" aria-labelledby="lambda-title">
        <h3 id="lambda-title" className="text-sm font-bold text-ink">
          {tr('Bạn muốn ưu tiên điều gì?', 'What matters more to you?')}
        </h3>
        <div className="mt-2 flex items-center justify-between text-[0.72rem] font-semibold text-ink/55">
          <span>{tr('Trải nghiệm tốt nhất', 'Best experience')}</span>
          <span>{tr('Giữ lịch ổn định', 'Keep things stable')}</span>
        </div>
        <input
          type="range"
          className="range"
          min={0}
          max={3}
          step={0.05}
          value={lambda}
          aria-label="λ"
          style={{ ['--fill' as string]: `${(lambda / 3) * 100}%` }}
          onChange={(inputEvent) => setLambda(Number(inputEvent.target.value))}
        />
        <div className="mt-1 flex flex-wrap gap-2">
          {LAMBDAS.map((preset) => (
            <button key={preset.id} type="button" className={`chip ${Math.abs(lambda - preset.lambda) < 0.03 ? 'chip-on' : ''}`} onClick={() => setLambda(preset.lambda)}>
              {presetName(preset.id)}
            </button>
          ))}
        </div>

        {chosen && (
          <div className="mt-4 rounded-xl bg-midnight p-4 text-paper">
            <p className="tabular font-mono text-[0.78rem] text-paper/60">I′ = argmax [ Utility(I) − λ · ChangeCost(I, I_old) ]</p>
            <p className="tabular mt-2 text-lg font-bold">
              <span className="text-firuze">{chosen.utility.toFixed(0)}</span> − <span className="text-gold">{chosen.lambda.toFixed(2)}</span> × <span className="text-pomegranate">{chosen.changeCost.toFixed(1)}</span> = <span>{chosen.objective.toFixed(1)}</span>
            </p>
            <p className="mt-1 text-xs text-paper/55">{tr(`Kết quả cho λ = ${lambda.toFixed(2)}: λ càng lớn, lịch càng ít bị xáo trộn.`, `Result for λ = ${lambda.toFixed(2)}: the larger λ, the less the plan is disturbed.`)}</p>
          </div>
        )}
      </section>

      {chosen ? (
        <motion.section key={chosen.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6" aria-label={presetName(chosen.id)}>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { v: chosen.kept.length, l: tr('Giữ lại', 'Kept'), c: 'text-lapis' },
              { v: chosen.added.length, l: tr('Thêm mới', 'Added'), c: 'text-jade-ink' },
              { v: chosen.dropped.length, l: tr('Bỏ', 'Dropped'), c: 'text-pomegranate' },
            ].map((item) => (
              <div key={item.l} className="panel p-3">
                <p className={`h-display text-3xl tabular ${item.c}`}>{item.v}</p>
                <p className="text-[0.7rem] text-ink/55">{item.l}</p>
              </div>
            ))}
          </div>
          <ol className="mt-4 space-y-1.5">
            {chosen.dropped.length > 0 && (
              <li className="rounded-lg bg-pomegranate/8 px-3 py-2 text-sm text-pomegranate line-through decoration-pomegranate/60">{names(chosen.dropped).join(', ')}</li>
            )}
            {chosen.stops.map((stop) => {
              const isNew = chosen.added.includes(stop.poiId)
              return (
                <li key={stop.uid} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isNew ? 'bg-firuze/15 font-semibold text-jade-ink' : 'bg-white/70 text-ink/80'}`}>
                  <span className="tabular w-11 shrink-0 text-xs text-ink/50">{fmtTime(stop.start)}</span>
                  <span className="min-w-0 flex-1 truncate">{poiById[stop.poiId].name}</span>
                  {isNew && <span className="rounded-full bg-firuze px-2 py-0.5 text-[0.65rem] font-bold text-white">{tr('Mới', 'New')}</span>}
                  {stop.locked && <span className="rounded-full bg-lapis/10 px-2 py-0.5 text-[0.65rem] font-bold text-lapis">{tr('Bắt buộc', 'Locked')}</span>}
                </li>
              )
            })}
          </ol>
          <p className="tabular mt-3 text-xs text-ink/55">
            {tr('Kết thúc lúc', 'Ends at')} {fmtTime(chosen.endTime)} · {tr('di chuyển', 'travel')} {chosen.travelMin} {tr('phút', 'min')} · {chosen.nodes.toLocaleString(vi ? 'vi-VN' : 'en-US')} {tr('trạng thái đã xét', 'states searched')}
          </p>
        </motion.section>
      ) : (
        <p className="mt-6 rounded-xl bg-sun/15 p-4 text-sm text-ink/75">{tr('Không còn phương án khả thi trong thời gian còn lại. Hãy giữ lịch cũ hoặc bỏ bớt điểm.', 'No feasible option fits the remaining time. Keep the original plan or drop a stop.')}</p>
      )}
    </Sheet>
  )
}
