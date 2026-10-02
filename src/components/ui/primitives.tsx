import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { categories } from '../../domain/categories'
import { SOLVER_STATUS_LABEL } from '../../domain/solverStatus'
import type { CategoryId, SolverStatus } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { CategoryIcon } from '../icons'
import { DiAvatar } from '../mascot/DiAvatar'

/** A category "sticker": the hand-drawn icon on a tinted paper chip with a hairline edge. */
export function CategoryGlyph({ cat, size = 36 }: { cat: CategoryId; size?: number }) {
  const color = categories[cat].color
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[0.5rem] border"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 13%, #fbf5e6)`, borderColor: `color-mix(in srgb, ${color} 32%, transparent)`, color: '#173f35' }}
      aria-hidden="true"
    >
      <CategoryIcon cat={cat} size={Math.round(size * 0.74)} />
    </span>
  )
}

export function CategoryName({ cat }: { cat: CategoryId }) {
  const { tr } = useTr()
  return <>{tr(categories[cat].vi, categories[cat].en)}</>
}

const STATUS_STYLE: Record<SolverStatus, string> = {
  OPTIMAL: 'bg-firuze/15 text-jade-ink ring-firuze/40',
  FEASIBLE: 'bg-sun/20 text-sun-ink ring-sun/50',
  INFEASIBLE: 'bg-pomegranate/12 text-pomegranate ring-pomegranate/40',
}

/** Solver state, stated plainly (report §5.7): feasible is not the same claim as optimal. */
export function SolverBadge({ status }: { status: SolverStatus }) {
  const { tr } = useTr()
  const meaning: Record<SolverStatus, string> = {
    OPTIMAL: tr('Tối ưu: không có lịch nào tốt hơn theo mô hình', 'Optimal: no better schedule exists under the model'),
    FEASIBLE: tr('Khả thi: thỏa mọi ràng buộc cứng, chưa chắc tối ưu', 'Feasible: meets every hard constraint, not proven optimal'),
    INFEASIBLE: tr('Không khả thi: ràng buộc xung đột', 'Infeasible: constraints conflict'),
  }
  return (
    <span
      title={meaning[status]}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold tracking-wide ring-1 ${STATUS_STYLE[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {tr(...SOLVER_STATUS_LABEL[status])}
    </span>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      <DiAvatar mood="thinking" trail={false} className="aspect-[320/300] w-24" />
      <h3 className="h-display mt-3 text-xl text-forest">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink/60">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; hint?: string }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-[0.4rem] bg-forest/6 p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative rounded-[0.3rem] px-3 py-2 text-[0.8rem] font-semibold transition-colors ${active ? 'text-paper' : 'text-ink/65 hover:text-ink'}`}
          >
            {active && (
              <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-[0.3rem] bg-forest" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
            )}
            <span className="relative block">{option.label}</span>
            {option.hint && <span className="relative block text-[0.65rem] font-normal opacity-70">{option.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${checked ? 'bg-firuze' : 'bg-forest/25'}`}
    >
      <motion.span
        className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

export function Meter({ value, max, tone = 'lapis', label }: { value: number; max: number; tone?: 'lapis' | 'warn' | 'danger'; label?: string }) {
  const ratio = Math.min(1.15, value / Math.max(1, max))
  const color = tone === 'danger' || ratio > 1 ? 'bg-pomegranate' : tone === 'warn' || ratio > 0.9 ? 'bg-sun' : 'bg-firuze'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-forest/10" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-label={label}>
      <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, ratio * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
    </div>
  )
}
