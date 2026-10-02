import type { ReactNode } from 'react'
import { Khatam } from '../art/Khatam'

/**
 * A pointed Persian arch, drawn as a parchment doorway. The cap is an SVG stretched to the card
 * width (strokes stay crisp via non-scaling-stroke) and the body continues the same gold frame.
 */
export function ArchCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`arch-card relative ${className}`}>
      <svg className="arch-cap" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 34V22C0 12 29 14 50 1C71 14 100 12 100 22V34Z" className="arch-fill" />
        <path d="M4.5 34V23.5C4.5 15.5 31 17.5 50 6C69 17.5 95.5 15.5 95.5 23.5V34" className="arch-inner" />
        <path d="M0 34V22C0 12 29 14 50 1C71 14 100 12 100 22V34" className="arch-edge" />
      </svg>
      <span className="arch-jewel" aria-hidden="true">
        <Khatam size={18} />
      </span>
      <div className="arch-body">{children}</div>
    </div>
  )
}
