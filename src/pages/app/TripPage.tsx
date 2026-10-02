import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowRight, Check, Loader2, MapPin, Navigation, Pencil, Plus, Search, Sparkles, Trash2, Undo2, Wand2, X } from 'lucide-react'
import { adjustItinerary } from '../../api/planner'
import { readProfile } from '../../api/profile'
import { searchPois } from '../../api/places'
import { track } from '../../api/analytics'
import { useDeleteTrip, useProfile, useSaveTrip, useTrip } from '../../api/queries'
import { RouteMap } from '../../components/map/RouteMap'
import { PoiSheet } from '../../components/place/PoiSheet'
import { DayTabs, TripStats } from '../../components/trip/parts'
import { describeTrip } from '../../components/trip/explain'
import { Timeline } from '../../components/trip/Timeline'
import { CategoryGlyph, EmptyState, Skeleton, SolverBadge } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { PageHeader } from '../../components/PageHeader'
import { addStop, changeDuration, diffDay, removeStop, reorderDay, toggleLock, usedPoiIds } from '../../domain/edit'
import { cityById, poiById } from '../../domain/pois'
import { violationText } from '../../domain/violation'
import { retimeDay, tripCost } from '../../domain/solver'
import { addDays, fmtMinutes, fmtTime, formatDate, formatVnd } from '../../domain/time'
import type { Stop, Trip } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'

const ADJUST_IDEAS: [string, string][] = [
  ['Bớt đi bộ, ưu tiên xe máy', 'Less walking, prefer a motorbike'],
  ['Thêm quán cà phê', 'Add a café'],
  ['Nhịp chậm hơn', 'A slower pace'],
  ['Không ăn hải sản', 'No seafood'],
  ['Ưu tiên văn hóa và bảo tàng', 'More culture and museums'],
]

export function TripPage() {
  const { id } = useParams()
  const { tr, language, locale } = useTr()
  const vi = language === 'vi'
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)!
  const tripQuery = useTrip(id)
  const save = useSaveTrip()
  const remove = useDeleteTrip()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const { activeDay, setActiveDay, activeUid, setActiveUid, openPoi } = useUiStore()

  const [undo, setUndo] = useState<Trip[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [proposal, setProposal] = useState<(Trip & { extraNote?: string }) | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [adjustText, setAdjustText] = useState('')
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => setActiveDay(0), [id, setActiveDay])

  const trip = tripQuery.data
  const dayIndex = Math.min(activeDay, Math.max(0, (trip?.days.length ?? 1) - 1))
  const day = trip?.days[dayIndex]

  const adjust = useMutation({
    mutationFn: (text: string) => adjustItinerary(trip!, text, profile),
    onSuccess: (next) => setProposal(next),
    onError: () => toast('danger', tr('Chưa điều chỉnh được', 'Could not adjust the plan')),
  })

  const live = useMemo(
    () => (trip && day ? retimeDay(day.stops, { city: trip.city, dayStart: trip.dayStart, dayEnd: trip.dayEnd, transport: trip.transport }) : null),
    [trip, day],
  )

  if (tripQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-[34rem]" />
          <Skeleton className="h-[34rem]" />
        </div>
      </div>
    )
  }

  if (!trip || !day) {
    return (
      <EmptyState
        title={tr('Không tìm thấy lịch trình', 'Itinerary not found')}
        body={tr('Lịch trình này có thể đã bị xóa hoặc không thuộc tài khoản của bạn.', 'It may have been deleted or belongs to another account.')}
        action={
          <Link to="/app/trips" className="btn-gold">
            {tr('Về danh sách chuyến đi', 'Back to my trips')}
          </Link>
        }
      />
    )
  }

  const commit = (next: Trip, kind: string) => {
    setUndo((stack) => [...stack.slice(-9), trip])
    save.mutate(next)
    track({ type: 'trip_edited', city: trip.city, detail: kind })
  }

  /** Validate-then-apply, exactly the manual editing flow in the report. */
  const apply = (result: ReturnType<typeof reorderDay>, kind: string): boolean => {
    if (!result.ok) {
      toast('warning', tr('Chỉnh sửa không hợp lệ, đã hoàn lại', 'Edit not valid, so it was undone'), violationText(result.violations[0], vi))
      return false
    }
    commit(result.trip, kind)
    return true
  }

  const undoLast = () => {
    const previous = undo[undo.length - 1]
    if (!previous) return
    setUndo((stack) => stack.slice(0, -1))
    save.mutate(previous)
    toast('info', tr('Đã hoàn tác', 'Undone'))
  }

  const move = (uid: string, direction: -1 | 1) => {
    const order = [...day.stops]
    const index = order.findIndex((stop) => stop.uid === uid)
    const target = index + direction
    if (target < 0 || target >= order.length) return
    ;[order[index], order[target]] = [order[target], order[index]]
    apply(reorderDay(trip, dayIndex, order), 'reorder')
  }

  const startTrip = () => {
    save.mutate({ ...trip, status: 'live' })
    track({ type: 'trip_started', city: trip.city })
    navigate(`/app/trips/${trip.id}/live`)
  }

  const renameBlur = (value: string) => {
    const name = value.trim()
    if (name && name !== trip.title) commit({ ...trip, title: name }, 'rename')
  }

  const city = cityById[trip.city]
  const endDate = addDays(trip.startDate, trip.days.length - 1)

  return (
    <>
      <PageHeader
        kicker={
          <>
            <MapPin size={14} aria-hidden="true" /> {vi ? city.name : city.nameEn} · {formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })}
            {trip.days.length > 1 && ` – ${formatDate(endDate, locale, { day: 'numeric', month: 'short' })}`}
          </>
        }
        title={trip.title}
        titleNode={<EditableTitle value={trip.title} onSave={renameBlur} label={tr('Đổi tên lịch trình', 'Rename itinerary')} />}
        subtitle={trip.request}
        actions={
          <>
            <SolverBadge status={trip.solver.status} />
            <button type="button" className="btn-ghost btn-sm" onClick={undoLast} disabled={!undo.length} aria-label={tr('Hoàn tác', 'Undo')}>
              <Undo2 size={15} aria-hidden="true" />
              <span className="hidden sm:inline">{tr('Hoàn tác', 'Undo')}</span>
            </button>
            <button type="button" className="btn-ghost btn-sm !text-pomegranate" onClick={() => setConfirmDelete(true)} aria-label={tr('Xóa lịch trình', 'Delete itinerary')}>
              <Trash2 size={15} aria-hidden="true" />
            </button>
            {trip.status === 'live' ? (
              <Link to={`/app/trips/${trip.id}/live`} className="btn-gold btn-sm">
                <Navigation size={15} aria-hidden="true" /> {tr('Mở chế độ đang đi', 'Open live mode')}
              </Link>
            ) : trip.status !== 'completed' ? (
              <button type="button" className="btn-gold btn-sm" onClick={startTrip}>
                <Navigation size={15} aria-hidden="true" /> {tr('Bắt đầu chuyến đi', 'Start trip')}
              </button>
            ) : null}
          </>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
        <section className="panel p-4 sm:p-5" aria-label={tr('Lịch trình theo ngày', 'Day by day itinerary')}>
          <DayTabs trip={trip} value={dayIndex} onChange={setActiveDay} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-lapis/6 px-4 py-2.5 text-[0.8rem] text-ink/70">
            <span>
              {tr('Khung giờ', 'Day window')}: <strong className="tabular text-ink">{fmtTime(trip.dayStart)}–{fmtTime(trip.dayEnd)}</strong>
            </span>
            <span className="tabular">
              {day.stops.length} {tr('điểm', 'stops')} · {fmtMinutes(day.stops.reduce((s, stop) => s + stop.travelMin, 0), vi)} {tr('di chuyển', 'travel')}
            </span>
          </div>

          {live && live.violations.length > 0 && (
            <div role="alert" className="mt-3 border-l-4 border-pomegranate bg-pomegranate/8 px-4 py-3 text-sm text-pomegranate">
              <p className="font-bold">{tr('Lịch có điểm không còn hợp lệ', 'Some stops are no longer valid')}</p>
              <ul className="mt-1 list-disc pl-5">
                {live.violations.map((violation) => (
                  <li key={violation.uid + violation.kind}>{vi ? violation.detail : violation.detailEn}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <Timeline
              stops={day.stops}
              activeUid={activeUid ?? hover}
              violations={live?.violations}
              onSelect={(uid) => {
                setActiveUid(uid)
                const stop = day.stops.find((entry) => entry.uid === uid)
                if (stop) openPoi(stop.poiId)
              }}
              onHover={setHover}
              onCommit={(order) => apply(reorderDay(trip, dayIndex, order), 'reorder')}
              onMove={move}
              onDuration={(uid, delta) => apply(changeDuration(trip, dayIndex, uid, delta), 'duration')}
              onLock={(uid) => commit(toggleLock(trip, dayIndex, uid), 'lock')}
              onRemove={(uid) => apply(removeStop(trip, dayIndex, uid), 'remove')}
            />
          </div>

          <button type="button" onClick={() => setAddOpen(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-lapis/30 py-3.5 text-sm font-semibold text-lapis transition-colors hover:border-lapis hover:bg-lapis/5">
            <Plus size={17} aria-hidden="true" /> {tr('Thêm địa điểm vào ngày này', 'Add a place to this day')}
          </button>
          <p className="mt-3 text-center text-[0.72rem] text-ink/45">{tr('Kéo biểu tượng ⋮⋮ để đổi thứ tự, hoặc dùng Alt + mũi tên.', 'Drag the ⋮⋮ grip to reorder, or use Alt + arrow keys.')}</p>
        </section>

        <div className="space-y-5 xl:sticky xl:top-6">
          <div className="panel overflow-hidden">
            <RouteMap stops={day.stops} activeUid={activeUid ?? hover} onSelect={(uid) => { setActiveUid(uid) }} className="h-[21rem] w-full" />
          </div>

          <section className="panel-night p-5" aria-labelledby="adjust-title">
            <h2 id="adjust-title" className="h-display flex items-center gap-2 text-xl text-paper">
              <Wand2 size={19} className="text-gold" aria-hidden="true" /> {tr('Nhờ Jinnie điều chỉnh', 'Ask Jinnie to adjust')}
            </h2>
            <p className="mt-1 text-sm text-paper/60">{tr('Nói thêm yêu cầu mới, Jinnie dựng lại lịch rồi cho bạn xem trước khi áp dụng.', 'Add a new request. Jinnie rebuilds the plan and shows you before applying.')}</p>
            <label htmlFor="adjust-text" className="sr-only">
              {tr('Yêu cầu mới', 'New request')}
            </label>
            <textarea
              id="adjust-text"
              rows={2}
              value={adjustText}
              onChange={(event) => setAdjustText(event.target.value)}
              placeholder={tr('Ví dụ: bớt đi bộ và thêm một quán cà phê view đẹp', 'e.g. less walking and add a café with a view')}
              className="mt-3 w-full resize-none rounded-xl border border-gold/30 bg-night/50 px-3.5 py-2.5 font-display italic text-paper caret-gold outline-none placeholder:text-paper/35 focus:border-gold"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ADJUST_IDEAS.map(([v, e]) => (
                <button key={v} type="button" onClick={() => setAdjustText((current) => `${current ? `${current}, ` : ''}${tr(v, e).toLowerCase()}`)} className="rounded-full border border-paper/20 px-2.5 py-1 text-[0.72rem] font-medium text-paper/75 transition-colors hover:border-gold hover:text-gold">
                  + {tr(v, e)}
                </button>
              ))}
            </div>
            <button type="button" className="btn-gold mt-4 w-full" disabled={adjustText.trim().length < 4 || adjust.isPending} onClick={() => adjust.mutate(adjustText)}>
              {adjust.isPending ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}
              {adjust.isPending ? tr('Đang dựng lại lịch…', 'Rebuilding…') : tr('Xem phương án mới', 'Preview the new plan')}
            </button>
          </section>

          <section className="panel p-5">
            <h2 className="h-display text-lg text-forest">{tr('Tổng quan', 'Overview')}</h2>
            <div className="mt-4">
              <TripStats trip={trip} />
            </div>
            <div className="mt-4 space-y-2 border-t border-forest/10 pt-4 text-[0.85rem] leading-relaxed text-ink/70">
              {describeTrip(trip, vi).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <p className="tabular mt-3 text-[0.7rem] text-ink/40">
              {trip.solver.model} · {trip.solver.nodes.toLocaleString(locale)} {tr('trạng thái', 'states')} · {trip.solver.ms} ms · v{trip.version}
            </p>
          </section>
        </div>
      </div>

      <AddPlaceSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        trip={trip}
        dayIndex={dayIndex}
        onAdd={(poiId) => {
          const ok = apply(addStop(trip, dayIndex, poiId), 'add')
          if (ok) {
            toast('success', tr('Đã thêm vào lịch trình', 'Added'), poiById[poiId].name)
            setAddOpen(false)
          }
        }}
      />

      <ProposalSheet
        proposal={proposal}
        trip={trip}
        onClose={() => setProposal(null)}
        onAccept={() => {
          if (!proposal) return
          const { extraNote: _note, ...next } = proposal
          commit({ ...next, status: trip.status }, 'auto-adjust')
          setProposal(null)
          setAdjustText('')
          toast('success', tr('Đã áp dụng lịch trình mới', 'New itinerary applied'))
        }}
      />

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        placement="center"
        width="max-w-md"
        title={tr('Xóa lịch trình này?', 'Delete this itinerary?')}
        description={tr('Hành động này không thể hoàn tác.', 'This cannot be undone.')}
        footer={
          <div className="flex justify-end gap-2.5">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
              {tr('Giữ lại', 'Keep it')}
            </button>
            <button
              type="button"
              className="btn-night btn-sm !bg-pomegranate"
              onClick={() =>
                remove.mutate(trip.id, {
                  onSuccess: () => {
                    toast('info', tr('Đã xóa lịch trình', 'Itinerary deleted'))
                    navigate('/app/trips', { replace: true })
                  },
                })
              }
            >
              <Trash2 size={15} aria-hidden="true" /> {tr('Xóa', 'Delete')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-ink/70">{trip.title}</p>
      </Sheet>

      <PoiSheet />
    </>
  )
}

/* ───────── add a place ───────── */

function AddPlaceSheet({ open, onClose, trip, dayIndex, onAdd }: { open: boolean; onClose: () => void; trip: Trip; dayIndex: number; onAdd: (poiId: string) => void }) {
  const { tr, language } = useTr()
  const [query, setQuery] = useState('')
  const used = usedPoiIds(trip)
  const hits = searchPois({ query, cities: [trip.city], categories: [], prices: [], minRating: 0, indoorOnly: false, sort: 'relevance' })
    .filter((hit) => !used.has(hit.poi.id))
    .slice(0, 12)

  return (
    <Sheet open={open} onClose={onClose} title={tr(`Thêm vào Ngày ${dayIndex + 1}`, `Add to Day ${dayIndex + 1}`)} description={tr('Jinnie kiểm tra giờ mở cửa và thời gian di chuyển trước khi cho thêm.', 'Jinnie checks opening hours and travel time before it lets you add.')}>
      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr('Tìm theo tên, loại hoặc từ khóa…', 'Search by name, type or keyword…')} aria-label={tr('Tìm địa điểm', 'Search places')} className="h-12 w-full rounded-xl border border-forest/20 bg-white pl-10 pr-3 text-sm outline-none focus:border-lapis" />
      </div>
      <ul className="mt-4 space-y-2">
        {hits.length === 0 && <li className="py-8 text-center text-sm text-ink/55">{tr('Không còn địa điểm phù hợp.', 'No matching places left.')}</li>}
        {hits.map(({ poi }) => {
          const test = addStop(trip, dayIndex, poi.id)
          return (
            <li key={poi.id} className="panel flex items-center gap-3 p-3">
              <CategoryGlyph cat={poi.cat} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{poi.name}</p>
                <p className="tabular text-xs text-ink/55">
                  {fmtTime(poi.open)}–{fmtTime(poi.close)} · {poi.cost ? formatVnd(poi.cost, true) : tr('Miễn phí', 'Free')} · ★ {poi.rating.toFixed(1)}
                </p>
                {!test.ok && <p className="mt-1 text-xs font-semibold text-pomegranate">{violationText(test.violations[0], language === 'vi')}</p>}
              </div>
              <button type="button" className="btn-ghost btn-sm shrink-0" disabled={!test.ok} onClick={() => onAdd(poi.id)}>
                <Plus size={14} aria-hidden="true" /> {tr('Thêm', 'Add')}
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}

/* ───────── review the rebuilt plan ───────── */

function ProposalSheet({ proposal, trip, onClose, onAccept }: { proposal: Trip | null; trip: Trip; onClose: () => void; onAccept: () => void }) {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  if (!proposal) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const before = tripCost(trip.days)
  const after = tripCost(proposal.days)
  const count = (t: Trip) => t.days.reduce((n, d) => n + d.stops.length, 0)
  const travel = (t: Trip) => t.days.reduce((n, d) => n + d.stops.reduce((m, s) => m + s.travelMin, 0), 0)
  const delta = (a: number, b: number, unit = '') => `${b - a > 0 ? '+' : ''}${Math.round(b - a)}${unit}`

  return (
    <Sheet
      open
      onClose={onClose}
      width="max-w-2xl"
      title={tr('Phương án mới của Jinnie', "Jinnie's new plan")}
      description={tr('So sánh với lịch hiện tại. Chưa có gì thay đổi cho đến khi bạn áp dụng.', 'Compared with your current plan. Nothing changes until you apply it.')}
      footer={
        <div className="flex justify-end gap-2.5">
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
            <X size={15} aria-hidden="true" /> {tr('Bỏ qua', 'Discard')}
          </button>
          <button type="button" className="btn-gold btn-sm" onClick={onAccept}>
            <Check size={15} aria-hidden="true" /> {tr('Áp dụng lịch mới', 'Apply new plan')}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: tr('Số điểm', 'Stops'), value: delta(count(trip), count(proposal)) },
          { label: tr('Di chuyển (phút)', 'Travel (min)'), value: delta(travel(trip), travel(proposal)) },
          { label: tr('Chi phí', 'Cost'), value: `${after - before > 0 ? '+' : ''}${formatVnd(after - before, true)}` },
        ].map((item) => (
          <div key={item.label} className="panel p-3">
            <p className="h-display text-2xl text-forest tabular">{item.value}</p>
            <p className="text-[0.7rem] text-ink/55">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {proposal.days.map((day) => {
          const old = trip.days[day.index]?.stops ?? []
          const diff = diffDay(old, day.stops)
          return (
            <section key={day.index} aria-label={tr(`Ngày ${day.index + 1}`, `Day ${day.index + 1}`)}>
              <h3 className="text-sm font-bold text-ink">
                {tr('Ngày', 'Day')} {day.index + 1} <span className="ml-2 font-normal text-ink/50">+{diff.added.length} / −{diff.removed.length}</span>
              </h3>
              <ul className="mt-2 space-y-1.5">
                {diff.removed.map((stop) => (
                  <li key={stop.uid} className="flex items-center gap-2 rounded-lg bg-pomegranate/8 px-3 py-2 text-sm text-pomegranate line-through decoration-pomegranate/60">
                    <X size={14} aria-hidden="true" /> {poiById[stop.poiId].name}
                  </li>
                ))}
                {day.stops.map((stop) => {
                  const isNew = diff.added.includes(stop)
                  return (
                    <motion.li key={stop.uid} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isNew ? 'bg-firuze/15 font-semibold text-[#0b7f75]' : 'bg-white/70 text-ink/80'}`}>
                      {isNew ? <Plus size={14} aria-hidden="true" /> : <ArrowRight size={14} className="text-ink/30" aria-hidden="true" />}
                      <span className="tabular w-11 shrink-0 text-xs text-ink/50">{fmtTime(stop.start)}</span>
                      <span className="min-w-0 flex-1 truncate">{poiById[stop.poiId].name}</span>
                      {isNew && <span className="rounded-full bg-firuze px-2 py-0.5 text-[0.65rem] font-bold text-white">{tr('Mới', 'New')}</span>}
                    </motion.li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
      <p className="mt-5 text-xs text-ink/50">{vi ? 'Giữ nguyên các điểm bạn đã khóa.' : 'Stops you locked are always kept.'}</p>
    </Sheet>
  )
}

export type { Stop }

function EditableTitle({ value, onSave, label }: { value: string; onSave: (value: string) => void; label: string }) {
  return (
    <span className="group relative flex min-w-0 items-center">
      <input
        key={value}
        defaultValue={value}
        aria-label={label}
        onBlur={(event) => onSave(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
        className="h-display w-full min-w-[12rem] max-w-[46rem] text-ellipsis border-b max-sm:text-[1.7rem] border-transparent bg-transparent outline-none transition-colors hover:border-forest/25 focus:border-gold"
      />
      <Pencil size={16} className="ml-2 shrink-0 text-ink/30 transition-opacity group-focus-within:opacity-0 group-hover:text-lapis" aria-hidden="true" />
    </span>
  )
}
