import { useEffect, useState } from 'react'
import { Reorder, useDragControls, motion } from 'motion/react'
import { AlertTriangle, Bike, CarTaxiFront, Check, ChevronDown, ChevronUp, Footprints, GripVertical, Lock, LockOpen, Minus, Plus, Trash2, Hourglass } from 'lucide-react'
import { poiById } from '../../domain/pois'
import { fmtMinutes, fmtTime, formatVnd } from '../../domain/time'
import type { Stop, TravelMode, Violation } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { CategoryGlyph, CategoryName } from '../ui/primitives'

const MODE_ICON: Record<TravelMode, typeof Bike> = { walk: Footprints, bike: Bike, taxi: CarTaxiFront }

type Actions = {
  onSelect?: (uid: string) => void
  onHover?: (uid: string | null) => void
  /** Return false to reject the new order; the stop springs back. */
  onCommit?: (stops: Stop[]) => boolean | void
  onMove?: (uid: string, direction: -1 | 1) => void
  onDuration?: (uid: string, delta: number) => void
  onLock?: (uid: string) => void
  onRemove?: (uid: string) => void
}

type Props = Actions & {
  stops: Stop[]
  readOnly?: boolean
  activeUid?: string | null
  violations?: Violation[]
  /** Live mode: stops that ended before `nowMinutes` are marked done, the one running is highlighted. */
  nowMinutes?: number
}

function Leg({ stop }: { stop: Stop }) {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const Icon = MODE_ICON[stop.mode]
  if (!stop.travelMin && !stop.travelKm) return null
  return (
    <div className="flex items-center gap-2 py-1.5 pl-[4.6rem] text-[0.72rem] font-medium text-ink/55 sm:pl-[5.4rem]">
      <span className="grid size-6 place-items-center rounded-full bg-lapis/10 text-lapis">
        <Icon size={13} aria-hidden="true" />
      </span>
      <span className="tabular">
        {fmtMinutes(stop.travelMin, vi)} · {stop.travelKm} km
        {stop.travelCost > 0 && ` · ${formatVnd(stop.travelCost, true)}`}
      </span>
      {stop.wait > 0 && (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-sun/20 px-2 py-0.5 text-[#8a5a00]">
          <Hourglass size={11} aria-hidden="true" />
          {tr(`Chờ mở cửa ${stop.wait} phút`, `Wait ${stop.wait} min for opening`)}
        </span>
      )}
    </div>
  )
}

type RowProps = Omit<Actions, 'onCommit'> & {
  onCommit?: () => void
  stop: Stop
  index: number
  total: number
  readOnly?: boolean
  active: boolean
  violation?: Violation
  state?: 'done' | 'now' | 'next'
}

function StopRow({ stop, index, total, readOnly, active, violation, state, onSelect, onHover, onMove, onDuration, onLock, onRemove, onCommit }: RowProps) {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const controls = useDragControls()
  const poi = poiById[stop.poiId]

  const body = (
    <div
      className={`group relative flex gap-3 sm:gap-4 ${state === 'done' ? 'opacity-55' : ''}`}
      onMouseEnter={() => onHover?.(stop.uid)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="w-[3.7rem] shrink-0 pt-3 text-right sm:w-[4.4rem]">
        <p className="tabular text-[0.95rem] font-bold leading-none text-forest">{fmtTime(stop.start)}</p>
        <p className="tabular mt-1 text-[0.7rem] text-ink/45">{fmtTime(stop.end)}</p>
      </div>

      <div className="relative flex w-8 shrink-0 justify-center">
        <span className="timeline-rail absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2" aria-hidden="true" />
        <span
          className={`relative z-10 mt-3 grid size-8 place-items-center rounded-full border-2 text-xs font-bold ${
            state === 'done' ? 'border-firuze bg-firuze text-white' : state === 'now' ? 'border-gold bg-gold text-night' : 'border-lapis bg-paper text-lapis'
          }`}
        >
          {state === 'done' ? <Check size={15} /> : index + 1}
          {state === 'now' && <span className="pulse-dot absolute inset-0 rounded-full text-gold" aria-hidden="true" />}
        </span>
      </div>

      <div
        className={`min-w-0 flex-1 rounded-xl border bg-white/70 p-3 transition-[border-color,box-shadow,background-color] duration-300 ${
          violation ? 'border-pomegranate/60 bg-pomegranate/5' : active || state === 'now' ? 'border-gold bg-gold/10 shadow-[0_10px_26px_-16px_rgba(240,185,75,0.9)]' : 'border-forest/12 hover:border-lapis/40'
        }`}
      >
        <div className="flex items-start gap-3">
          <CategoryGlyph cat={poi.cat} size={38} />
          <button type="button" onClick={() => onSelect?.(stop.uid)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-[0.95rem] font-semibold text-ink">{poi.name}</p>
            <p className="truncate text-xs text-ink/55">
              <CategoryName cat={poi.cat} /> · {poi.area}
            </p>
          </button>
          {!readOnly && (
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => onLock?.(stop.uid)}
                className={`grid size-9 place-items-center transition-colors ${stop.locked ? 'text-lapis' : 'text-ink/35 hover:text-ink'}`}
                aria-pressed={stop.locked}
                aria-label={stop.locked ? tr('Bỏ khóa điểm này', 'Unlock this stop') : tr('Khóa: điểm bắt buộc phải giữ', 'Lock: this stop must stay')}
                title={stop.locked ? tr('Điểm bắt buộc', 'Mandatory stop') : tr('Khóa điểm này', 'Lock this stop')}
              >
                {stop.locked ? <Lock size={16} /> : <LockOpen size={16} />}
              </button>
              <button type="button" onClick={() => onRemove?.(stop.uid)} className="grid size-9 place-items-center text-ink/35 transition-colors hover:text-pomegranate" aria-label={tr('Xóa điểm này', 'Remove this stop')}>
                <Trash2 size={16} />
              </button>
              <span
                onPointerDown={(event) => {
                  event.preventDefault()
                  controls.start(event)
                }}
                className="grid size-9 cursor-grab touch-none place-items-center text-ink/35 transition-colors hover:text-lapis active:cursor-grabbing"
                aria-hidden="true"
              >
                <GripVertical size={18} />
              </span>
            </div>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink/65">
          {readOnly ? (
            <span className="tabular">{fmtMinutes(stop.visit, vi)}</span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-forest/15 bg-white">
              <button type="button" className="grid size-7 place-items-center text-ink/50 hover:text-lapis disabled:opacity-30" disabled={stop.visit <= 15} onClick={() => onDuration?.(stop.uid, -15)} aria-label={tr('Bớt 15 phút', '15 minutes less')}>
                <Minus size={13} />
              </button>
              <span className="tabular min-w-[4.5rem] text-center font-semibold text-ink">{fmtMinutes(stop.visit, vi)}</span>
              <button type="button" className="grid size-7 place-items-center text-ink/50 hover:text-lapis" onClick={() => onDuration?.(stop.uid, 15)} aria-label={tr('Thêm 15 phút', '15 minutes more')}>
                <Plus size={13} />
              </button>
            </span>
          )}
          <span className="tabular font-semibold text-ink/80">{poi.cost ? formatVnd(poi.cost) : tr('Miễn phí', 'Free')}</span>
          <span className="tabular">
            {fmtTime(poi.open)}–{fmtTime(poi.close)}
          </span>
          {!poi.indoor && <span className="rounded-full bg-firuze/12 px-2 py-0.5 text-[0.68rem] font-semibold text-[#0b7f75]">{tr('Ngoài trời', 'Outdoor')}</span>}
          {stop.locked && <span className="rounded-full bg-lapis/10 px-2 py-0.5 text-[0.68rem] font-semibold text-lapis">{tr('Bắt buộc', 'Must visit')}</span>}
        </div>

        {violation && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-pomegranate" role="alert">
            <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden="true" />
            {violation.detail}
          </p>
        )}

        {!readOnly && (
          <div className="mt-2 flex gap-1 sm:hidden">
            <button type="button" disabled={index === 0} onClick={() => onMove?.(stop.uid, -1)} className="inline-flex items-center gap-1 rounded-full border border-forest/15 px-2.5 py-1 text-[0.7rem] font-semibold disabled:opacity-30">
              <ChevronUp size={13} /> {tr('Lên', 'Up')}
            </button>
            <button type="button" disabled={index === total - 1} onClick={() => onMove?.(stop.uid, 1)} className="inline-flex items-center gap-1 rounded-full border border-forest/15 px-2.5 py-1 text-[0.7rem] font-semibold disabled:opacity-30">
              <ChevronDown size={13} /> {tr('Xuống', 'Down')}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (readOnly) return <li>{body}</li>

  return (
    <Reorder.Item
      value={stop}
      dragListener={false}
      dragControls={controls}
      onDragEnd={() => onCommit?.()}
      className="relative list-none"
      whileDrag={{ scale: 1.015, boxShadow: '0 22px 40px -18px rgba(19,26,77,0.55)', zIndex: 20 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      onKeyDown={(event) => {
        if (event.altKey && event.key === 'ArrowUp') {
          event.preventDefault()
          onMove?.(stop.uid, -1)
        }
        if (event.altKey && event.key === 'ArrowDown') {
          event.preventDefault()
          onMove?.(stop.uid, 1)
        }
      }}
    >
      {body}
    </Reorder.Item>
  )
}

/**
 * A day as a vertical timeline. Editable timelines reorder by dragging the grip (or the Up/Down
 * buttons / Alt+Arrow on touch and keyboard); the parent validates the new order against the hard
 * constraints and either commits it or springs the stop back.
 */
export function Timeline({ stops, readOnly, activeUid, violations = [], nowMinutes, ...actions }: Props) {
  const { tr } = useTr()
  const [order, setOrder] = useState(stops)

  useEffect(() => setOrder(stops), [stops])

  const commit = () => {
    if (order.every((stop, index) => stop.uid === stops[index]?.uid)) return
    if (actions.onCommit?.(order) === false) setOrder(stops)
  }

  const violationFor = (uid: string) => violations.find((violation) => violation.uid === uid)
  const stateFor = (stop: Stop): RowProps['state'] =>
    nowMinutes === undefined ? undefined : stop.end <= nowMinutes ? 'done' : stop.start <= nowMinutes ? 'now' : 'next'

  if (!order.length) {
    return (
      <div className="rounded-xl border border-dashed border-forest/25 bg-white/50 px-5 py-10 text-center text-sm text-ink/55">
        {tr('Ngày này chưa có điểm nào.', 'No stops on this day yet.')}
      </div>
    )
  }

  const rows = order.map((stop, index) => (
    <div key={stop.uid}>
      {index > 0 && <Leg stop={stop} />}
      <StopRow
        stop={stop}
        index={index}
        total={order.length}
        readOnly={readOnly}
        active={activeUid === stop.uid}
        violation={violationFor(stop.uid)}
        state={stateFor(stop)}
        {...actions}
        onCommit={commit}
      />
    </div>
  ))

  if (readOnly) return <ol className="m-0 list-none p-0">{rows.map((row, i) => <motion.div key={order[i].uid} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.45 }}>{row}</motion.div>)}</ol>

  return (
    <Reorder.Group axis="y" values={order} onReorder={setOrder} className="m-0 list-none p-0">
      {order.map((stop, index) => (
        <div key={stop.uid}>
          {index > 0 && <Leg stop={stop} />}
          <StopRow
            stop={stop}
            index={index}
            total={order.length}
            active={activeUid === stop.uid}
            violation={violationFor(stop.uid)}
            state={stateFor(stop)}
            {...actions}
            onCommit={commit}
          />
        </div>
      ))}
    </Reorder.Group>
  )
}
