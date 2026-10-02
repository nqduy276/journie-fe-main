import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  Coffee,
  Landmark,
  Moon,
  Mountain,
  Store,
  TreePine,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import { categories } from '../../domain/categories'
import type { CategoryId, SolverStatus } from '../../domain/types'
import { useTr } from '../../hooks/useTr'

const ICONS: Record<CategoryId, LucideIcon> = {
  culture: Landmark,
  food: UtensilsCrossed,
  cafe: Coffee,
  nature: TreePine,
  beach: Waves,
  market: Store,
  nightlife: Moon,
  adventure: Mountain,
}

export function CategoryGlyph({ cat, size = 36 }: { cat: CategoryId; size?: number }) {
  const Icon = ICONS[cat]
  const color = categories[cat].color
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[0.7rem]"
      style={{ width: size, height: size, background: `${color}1f`, color }}
      aria-hidden="true"
    >
      <Icon size={size * 0.5} strokeWidth={2} />
    </span>
  )
}

export function CategoryName({ cat }: { cat: CategoryId }) {
  const { tr } = useTr()
  return <>{tr(categories[cat].vi, categories[cat].en)}</>
}

const STATUS_STYLE: Record<SolverStatus, string> = {
  OPTIMAL: 'bg-firuze/15 text-[#0b7f75] ring-firuze/40',
  FEASIBLE: 'bg-sun/20 text-[#8a5a00] ring-sun/50',
  INFEASIBLE: 'bg-pomegranate/12 text-pomegranate ring-pomegranate/40',
}

/** Solver state, stated plainly (report §5.7): FEASIBLE is not the same claim as OPTIMAL. */
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
      {status}
    </span>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      <motion.svg
        viewBox="0 0 64 64"
        className="size-16 text-gold"
        aria-hidden="true"
        animate={{ rotate: [0, 6, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M10 40c0 8 12 10 24 10s20-2 22-10c2-6 6-8 10-9-6 0-12 1-18 2-8 1-18 0-24-3Z" fill="currentColor" opacity=".9" />
        <path d="M24 32c0-6 4-9 8-9s8 3 8 9Z" fill="currentColor" />
        <circle cx="32" cy="19" r="3" fill="currentColor" />
        <path d="M46 28c4-6 0-10 4-16" stroke="#2ec4b6" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="1 6" />
      </motion.svg>
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
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-xl bg-forest/6 p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative rounded-lg px-3 py-2 text-[0.8rem] font-semibold transition-colors ${active ? 'text-paper' : 'text-ink/65 hover:text-ink'}`}
          >
            {active && (
              <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-lg bg-lapis" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
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
