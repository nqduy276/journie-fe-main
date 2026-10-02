import type { ReactNode } from 'react'
import { Khatam } from './art/Khatam'

export function PageHeader({ title, titleNode, subtitle, actions, kicker }: { title: string; titleNode?: ReactNode; subtitle?: string; actions?: ReactNode; kicker?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {kicker && <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-lapis">{kicker}</div>}
        <h1 className="h-display flex items-center gap-3 text-[2.1rem] text-forest sm:text-[2.6rem]">
          {titleNode ?? title}
          <Khatam size={18} className="mt-1 hidden shrink-0 text-gold sm:block" />
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink/65">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}
