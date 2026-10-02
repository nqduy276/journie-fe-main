import type { ReactNode } from 'react'

export function PageHeader({ title, titleNode, subtitle, actions, kicker }: { title: string; titleNode?: ReactNode; subtitle?: string; actions?: ReactNode; kicker?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {kicker && <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-terracotta">{kicker}</div>}
        <h1 className="h-display flex items-center gap-3 text-[2.1rem] text-forest sm:text-[2.6rem]">
          {titleNode ?? title}
          <svg viewBox="0 0 56 14" width="56" height="14" className="mt-2 hidden shrink-0 sm:block" fill="none" aria-hidden="true">
            <path d="M2 7H40" stroke="#4fb8a4" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 6" />
            <circle cx="49" cy="7" r="4.2" stroke="#d96745" strokeWidth="2.4" />
          </svg>
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink/65">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}
