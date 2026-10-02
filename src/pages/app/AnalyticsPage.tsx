import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Activity, BrainCircuit, Download, Radio, Route, Table2, Users, Wand2 } from 'lucide-react'
import type { AnalyticsReport, DailyPoint } from '../../api/analytics'
import { useAnalytics } from '../../api/queries'
import { CountUp } from '../../components/motion/CountUp'
import { PageHeader } from '../../components/PageHeader'
import { Skeleton } from '../../components/ui/primitives'
import { disruptionMeta } from '../../domain/replan'
import { cityById } from '../../domain/pois'
import { useTr } from '../../hooks/useTr'

/* Landing-palette hues, checked with the dataviz validator against the panel surface (#fbf8f0):
   categorical  #0f9a80 (jade) · #d95a2b (terracotta)   (all checks pass, CVD ΔE 12, normal ΔE 26)
   ordinal      #6fbfac → #0d4638   (one hue, monotone lightness, light end 2.0:1) */
const SERIES = { trips: '#0f9a80', replans: '#d95a2b' } as const
const RAMP = ['#6fbfac', '#45a48e', '#2a8671', '#186553', '#0d4638'] as const
const GRID = 'var(--chart-grid, rgba(23,63,53,0.12))'

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function Card({ title, subtitle, actions, children, className = '' }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="h-display text-lg text-forest">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink/55">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

/* ───────── KPI tile ───────── */

function Kpi({ icon: Icon, label, value, format, note }: { icon: typeof Users; label: string; value: number; format: (v: number) => string; note: string }) {
  return (
    <div className="panel flex items-start gap-3.5 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lapis/10 text-lapis" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink/55">{label}</p>
        <p className="h-display tabular text-[2rem] leading-tight text-forest">
          <CountUp value={value} format={format} />
        </p>
        <p className="text-[0.7rem] text-ink/45">{note}</p>
      </div>
    </div>
  )
}

/* ───────── line chart: two series, one axis ───────── */

function LineChart({ data, labels }: { data: DailyPoint[]; labels: { trips: string; replans: string; date: (iso: string) => string } }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const h = 250
  const m = { top: 14, right: 78, bottom: 26, left: 38 }
  const iw = width - m.left - m.right
  const ih = h - m.top - m.bottom
  const max = Math.ceil(Math.max(...data.map((d) => Math.max(d.trips, d.replans))) / 20) * 20
  const x = (i: number) => m.left + (i / (data.length - 1)) * iw
  const y = (v: number) => m.top + ih - (v / max) * ih
  const line = (key: 'trips' | 'replans') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join('')
  const area = `${line('trips')}L${x(data.length - 1)} ${y(0)}L${x(0)} ${y(0)}Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t))
  const lastIdx = data.length - 1
  const active = hover ?? lastIdx

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={h}
        role="img"
        aria-label={`${labels.trips} / ${labels.replans}`}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const ratio = (event.clientX - rect.left - m.left) / iw
          setHover(Math.min(lastIdx, Math.max(0, Math.round(ratio * lastIdx))))
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={m.left - 8} y={y(t) + 4} textAnchor="end" className="fill-ink/50 text-[10px]">
              {t}
            </text>
          </g>
        ))}
        {[0, 7, 14, 21, lastIdx].map((i) => (
          <text key={i} x={x(i)} y={h - 6} textAnchor={i === 0 ? 'start' : i === lastIdx ? 'end' : 'middle'} className="fill-ink/50 text-[10px]">
            {labels.date(data[i].date)}
          </text>
        ))}
        <path d={area} fill={SERIES.trips} fillOpacity="0.1" />
        <motion.path d={line('trips')} fill="none" stroke={SERIES.trips} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: 'easeOut' }} />
        <motion.path d={line('replans')} fill="none" stroke={SERIES.replans} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: 0.15, ease: 'easeOut' }} />

        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + ih} stroke="var(--chart-cursor, rgba(23,63,53,0.35))" />}
        {([['trips', SERIES.trips], ['replans', SERIES.replans]] as const).map(([key, color]) => (
          <g key={key}>
            <circle cx={x(active)} cy={y(data[active][key])} r="5" fill={color} style={{ stroke: 'var(--chart-dot-edge, #fbf8f0)' }} strokeWidth="2" />
            {hover === null && (
              <text x={x(lastIdx) + 12} y={y(data[lastIdx][key]) + 4} className="fill-ink text-[11px] font-semibold">
                {key === 'trips' ? labels.trips : labels.replans}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-night px-3 py-2 text-xs text-paper shadow-xl"
          style={{ left: Math.min(width - 150, Math.max(0, x(hover) - 70)), top: 0 }}
          role="status"
        >
          <p className="font-bold">{labels.date(data[hover].date)}</p>
          <p className="tabular mt-1 flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: SERIES.trips }} />{labels.trips}: {data[hover].trips}</p>
          <p className="tabular flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: SERIES.replans }} />{labels.replans}: {data[hover].replans}</p>
        </div>
      )}
    </div>
  )
}

/* ───────── horizontal bars (single series = single colour) ───────── */

function HBars({ rows, format = (v: number) => v.toLocaleString() }: { rows: { label: string; value: number; sub?: string }[]; format?: (v: number) => string }) {
  const max = Math.max(...rows.map((row) => row.value))
  return (
    <ul className="space-y-2.5">
      {rows.map((row, index) => (
        <li key={row.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm" title={row.sub}>
          <span className="truncate text-[0.82rem] text-ink/75">{row.label}</span>
          <span className="h-5 rounded-r-[4px] bg-forest/6">
            <motion.span className="block h-full rounded-r-[4px]" style={{ background: SERIES.trips, maxWidth: '100%' }} initial={{ width: 0 }} animate={{ width: `${(row.value / max) * 100}%` }} transition={{ delay: 0.1 + index * 0.05, duration: 0.7, ease: 'easeOut' }} />
          </span>
          <span className="tabular w-14 text-right text-[0.82rem] font-semibold text-ink">{format(row.value)}</span>
        </li>
      ))}
    </ul>
  )
}

/* ───────── funnel: ordered stages use the ordinal ramp ───────── */

function Funnel({ steps }: { steps: { label: string; count: number }[] }) {
  const top = steps[0].count
  return (
    <ol className="space-y-1.5">
      {steps.map((step, index) => (
        <li key={step.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-[0.82rem] text-ink/75">{step.label}</span>
          <span className="h-7 rounded-[4px] bg-forest/6">
            <motion.span className="block h-full rounded-[4px]" style={{ background: RAMP[index] }} initial={{ width: 0 }} animate={{ width: `${(step.count / top) * 100}%` }} transition={{ delay: 0.1 + index * 0.08, duration: 0.7, ease: 'easeOut' }} />
          </span>
          <span className="tabular w-24 text-right text-[0.82rem] font-semibold text-ink">
            {step.count.toLocaleString()} <span className="font-normal text-ink/45">{Math.round((step.count / top) * 100)}%</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

/* ───────── heatmap: one hue, light to dark ───────── */

function Heatmap({ heat, days, hourLabel }: { heat: number[][]; days: string[]; hourLabel: string }) {
  const [tip, setTip] = useState<{ d: number; h: number } | null>(null)
  const max = Math.max(...heat.flat())
  const step = (v: number) => RAMP[Math.min(4, Math.floor((v / max) * 5))]
  return (
    <div className="relative">
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr))' }} role="img" aria-label={hourLabel}>
        {heat.map((row, d) => (
          <div key={d} className="contents">
            <span className="pr-2 text-[0.68rem] leading-5 text-ink/55">{days[d]}</span>
            {row.map((value, hour) => (
              <button
                key={hour}
                type="button"
                aria-label={`${days[d]} ${hour}:00 — ${value}`}
                onPointerEnter={() => setTip({ d, h: hour })}
                onPointerLeave={() => setTip(null)}
                onFocus={() => setTip({ d, h: hour })}
                onBlur={() => setTip(null)}
                className="h-5 rounded-[2px] outline-offset-1 transition-transform hover:scale-125 focus-visible:scale-125"
                style={{ background: step(value) }}
              />
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, hour) => (
          <span key={hour} className="text-center text-[0.58rem] text-ink/45">
            {hour % 6 === 0 ? hour : ''}
          </span>
        ))}
      </div>
      {tip && (
        <p className="tabular pointer-events-none absolute -top-2 right-0 rounded-md bg-night px-2.5 py-1 text-xs text-paper shadow-lg" role="status">
          {days[tip.d]} {String(tip.h).padStart(2, '0')}:00 · {heat[tip.d][tip.h]}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2 text-[0.68rem] text-ink/55">
        <span>0</span>
        <span className="flex gap-[2px]">
          {RAMP.map((color) => (
            <span key={color} className="h-2.5 w-7 rounded-[2px]" style={{ background: color }} />
          ))}
        </span>
        <span className="tabular">{max}</span>
      </div>
    </div>
  )
}

/* ───────── page ───────── */

export function AnalyticsPage() {
  const { tr, language, locale } = useTr()
  const vi = language === 'vi'
  const query = useAnalytics()
  const [table, setTable] = useState(false)
  const data = query.data

  const dateLabel = useMemo(() => (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' }), [locale])
  const days = vi ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const exportCsv = (report: AnalyticsReport) => {
    const rows = ['date,trips,replans,users', ...report.daily.map((d) => `${d.date},${d.trips},${d.replans},${d.users}`)]
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'journie-daily.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        title={tr('Phân tích & vận hành', 'Analytics & operations')}
        subtitle={tr('Dữ liệu tổng hợp 30 ngày gần nhất: chuyến đi, thời lượng, tần suất tương tác và lý do khách chỉnh lịch. Đây là nguồn để tinh chỉnh λ và trọng số chấm điểm.', 'The last 30 days: trips, duration, interaction frequency and why travelers change plans. It feeds the tuning of λ and the scoring weights.')}
        actions={
          data && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => exportCsv(data)}>
              <Download size={15} aria-hidden="true" /> {tr('Xuất CSV', 'Export CSV')}
            </button>
          )
        }
      />

      {!data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
          <Skeleton className="h-72 md:col-span-2 xl:col-span-4" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={Route} label={tr('Lịch trình đã tạo', 'Itineraries created')} value={data.totals.trips} format={(v) => Math.round(v).toLocaleString(locale)} note={tr('30 ngày gần nhất', 'last 30 days')} />
            <Kpi icon={Users} label={tr('Người dùng', 'Users')} value={data.totals.users} format={(v) => Math.round(v).toLocaleString(locale)} note={`${data.totals.searches.toLocaleString(locale)} ${tr('lượt tìm kiếm', 'searches')}`} />
            <Kpi icon={Activity} label={tr('Điều chỉnh mỗi chuyến', 'Replans per trip')} value={data.totals.replansPerTrip} format={(v) => v.toFixed(2)} note={`${tr('trung bình', 'avg')} ${data.totals.avgDays} ${tr('ngày', 'days')} · ${data.totals.avgStops} ${tr('điểm', 'stops')}`} />
            <Kpi icon={Wand2} label={tr('Tỷ lệ chấp nhận gợi ý', 'Suggestion acceptance')} value={data.totals.acceptRate} format={(v) => `${Math.round(v)}%`} note={`${tr('giải trung bình', 'solver avg')} ${data.totals.avgSolveMs} ms`} />
          </div>

          <Card
            title={tr('Chuyến đi và lần điều chỉnh mỗi ngày', 'Trips and replans per day')}
            subtitle={tr('Một trục, hai chuỗi: lịch trình được tạo và số lần Di đề xuất điều chỉnh.', 'One axis, two series: itineraries created and replans Di suggested.')}
            actions={
              <button type="button" aria-pressed={table} className="inline-flex items-center gap-1.5 text-xs font-semibold text-lapis hover:underline" onClick={() => setTable((v) => !v)}>
                <Table2 size={14} aria-hidden="true" /> {table ? tr('Xem biểu đồ', 'Show chart') : tr('Xem dạng bảng', 'Show as table')}
              </button>
            }
          >
            <div className="mb-3 flex gap-5 text-xs text-ink/70" aria-hidden={table}>
              {[['trips', tr('Lịch trình', 'Itineraries')], ['replans', tr('Điều chỉnh', 'Replans')]].map(([key, label]) => (
                <span key={key} className="inline-flex items-center gap-2">
                  <span className="h-0.5 w-4 rounded" style={{ background: SERIES[key as 'trips' | 'replans'] }} />
                  {label}
                </span>
              ))}
            </div>
            {table ? (
              <div className="max-h-72 overflow-auto">
                <table className="tabular w-full text-left text-sm">
                  <caption className="sr-only">{tr('Dữ liệu theo ngày', 'Daily data')}</caption>
                  <thead className="sticky top-0 bg-paper text-xs text-ink/55">
                    <tr>
                      <th className="py-2 pr-4 font-semibold">{tr('Ngày', 'Date')}</th>
                      <th className="py-2 pr-4 font-semibold">{tr('Lịch trình', 'Itineraries')}</th>
                      <th className="py-2 pr-4 font-semibold">{tr('Điều chỉnh', 'Replans')}</th>
                      <th className="py-2 font-semibold">{tr('Người dùng', 'Users')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((row) => (
                      <tr key={row.date} className="border-t border-forest/8">
                        <td className="py-1.5 pr-4">{dateLabel(row.date)}</td>
                        <td className="py-1.5 pr-4">{row.trips}</td>
                        <td className="py-1.5 pr-4">{row.replans}</td>
                        <td className="py-1.5">{row.users}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <LineChart data={data.daily} labels={{ trips: tr('Lịch trình', 'Itineraries'), replans: tr('Điều chỉnh', 'Replans'), date: dateLabel }} />
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title={tr('Giờ cao điểm tương tác', 'When travelers interact')} subtitle={tr('Số tương tác theo thứ và giờ. Màu càng đậm càng nhiều.', 'Interactions by weekday and hour. Darker means more.')}>
              <Heatmap heat={data.heat} days={days} hourLabel={tr('Bản đồ nhiệt tương tác theo giờ', 'Interaction heatmap by hour')} />
            </Card>
            <Card title={tr('Hành trình của người dùng', 'Traveler funnel')} subtitle={tr('Từ lúc ghé thăm đến khi hoàn thành chuyến đi.', 'From first visit to a finished trip.')}>
              <Funnel
                steps={data.funnel.map((step) => ({
                  label: { visit: tr('Ghé thăm', 'Visited'), generated: tr('Tạo lịch', 'Generated'), edited: tr('Chỉnh sửa', 'Edited'), started: tr('Bắt đầu đi', 'Started'), completed: tr('Hoàn thành', 'Completed') }[step.key],
                  count: step.count,
                }))}
              />
            </Card>
          </div>

          <Card
            title={tr('Tối ưu bằng học máy: vì sao khách đổi lịch', 'Machine-learning loop: why travelers change plans')}
            subtitle={tr('Lý do điều chỉnh, tỷ lệ chấp nhận và λ trung bình. Dữ liệu này dùng để hiệu chỉnh λ cho lần sinh lịch sau.', 'Replan reasons, acceptance and average λ. It recalibrates λ for future itineraries.')}
            actions={<BrainCircuit size={20} className="text-lapis" aria-hidden="true" />}
          >
            <div className="overflow-x-auto">
              <table className="tabular w-full min-w-[34rem] text-left text-sm">
                <caption className="sr-only">{tr('Lý do điều chỉnh', 'Replan reasons')}</caption>
                <thead className="text-xs text-ink/55">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">{tr('Lý do', 'Reason')}</th>
                    <th className="py-2 pr-4 font-semibold">{tr('Đề xuất', 'Suggested')}</th>
                    <th className="py-2 pr-4 font-semibold">{tr('Chấp nhận', 'Accepted')}</th>
                    <th className="py-2 pr-4 font-semibold">λ</th>
                    <th className="py-2 font-semibold">{tr('Khuyến nghị', 'Recommendation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reasons.map((row) => {
                    const rate = Math.round((row.accepted / row.count) * 100)
                    return (
                      <tr key={row.kind} className="border-t border-forest/8">
                        <td className="py-3 pr-4 font-semibold text-ink">{vi ? disruptionMeta[row.kind].vi : disruptionMeta[row.kind].en}</td>
                        <td className="py-3 pr-4">{row.count}</td>
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-24 overflow-hidden rounded-full bg-forest/10">
                              <span className="block h-full rounded-full" style={{ width: `${rate}%`, background: SERIES.trips }} />
                            </span>
                            {rate}%
                          </span>
                        </td>
                        <td className="py-3 pr-4">{row.lambda.toFixed(1)}</td>
                        <td className="py-3 text-[0.82rem] text-ink/65">
                          {rate < 65 ? tr('Giảm λ: khách muốn đổi nhiều hơn', 'Lower λ: travelers want bigger changes') : rate > 75 ? tr('Giữ λ: phương án đang hợp', 'Keep λ: options fit well') : tr('Theo dõi thêm', 'Keep watching')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card title={tr('Điểm đến phổ biến', 'Top destinations')}>
              <HBars rows={data.cities.slice(0, 6).map((c) => ({ label: vi ? cityById[c.city].name : cityById[c.city].nameEn, value: c.trips }))} />
            </Card>
            <Card title={tr('Phân bố λ được chọn', 'Chosen λ distribution')} subtitle={tr('λ nhỏ nghiêng về trải nghiệm, lớn nghiêng về ổn định.', 'Small λ favours experience, large favours stability.')}>
              <HBars rows={data.lambdaBins.map((bin) => ({ label: `${bin.from.toFixed(1)}–${bin.to.toFixed(1)}`, value: bin.count }))} />
            </Card>
            <Card title={tr('Trạng thái bộ giải', 'Solver outcomes')} subtitle={tr('FEASIBLE: thỏa ràng buộc, chưa chứng minh tối ưu.', 'FEASIBLE: constraints met, optimality not proven.')}>
              <HBars rows={data.statuses.map((s) => ({ label: s.key, value: s.count }))} />
            </Card>
          </div>

          <Card title={tr('Hoạt động trực tiếp trong phiên này', 'Live activity in this session')} actions={<Radio size={18} className="text-lapis" aria-hidden="true" />}>
            {data.live.length === 0 ? (
              <p className="text-sm text-ink/55">{tr('Chưa có sự kiện nào. Hãy tạo lịch trình hoặc thử một sự cố ở chế độ đang đi bằng tài khoản Lữ khách; chúng sẽ xuất hiện ở đây.', 'No events yet. Create an itinerary or trigger a disruption in live mode as a Traveler; they appear here.')}</p>
            ) : (
              <ul className="divide-y divide-forest/8">
                {data.live.map((event, index) => (
                  <li key={event.t + index} className="tabular flex items-center gap-3 py-2 text-sm">
                    <span className="w-16 text-xs text-ink/45">{new Date(event.t).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-semibold text-ink">{event.type.replace(/_/g, ' ')}</span>
                    <span className="text-ink/55">{[event.city && cityById[event.city].name, event.reason, event.lambda !== undefined && `λ ${event.lambda}`, event.detail].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
