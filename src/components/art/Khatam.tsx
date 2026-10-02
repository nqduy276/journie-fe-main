import type { CSSProperties } from 'react'

/** Eight-pointed Persian star (khatam): outer radius 26, inner 14 inside a 64 box. */
export const KHATAM_PATH =
  'M58 32 44.9 37.4 50.4 50.4 37.4 44.9 32 58 26.6 44.9 13.6 50.4 19.1 37.4 6 32 19.1 26.6 13.6 13.6 26.6 19.1 32 6 37.4 19.1 50.4 13.6 44.9 26.6Z'

export function Khatam({
  size = 16,
  className,
  style,
  fill = 'currentColor',
}: {
  size?: number
  className?: string
  style?: CSSProperties
  fill?: string
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={KHATAM_PATH} fill={fill} />
    </svg>
  )
}

/** Divider with a khatam at its centre, used between groups of content. */
export function StarRule({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-gold ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-current opacity-40" />
      <Khatam size={12} />
      <span className="h-px flex-1 bg-current opacity-40" />
    </div>
  )
}

/** Rating drawn with khatam stars instead of generic five-point stars. */
export function StarRating({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value.toFixed(1)} / 5`}>
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, value - index))
        return (
          <span key={index} className="relative inline-block" style={{ width: size, height: size }}>
            <Khatam size={size} className="absolute inset-0 text-ink/15" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Khatam size={size} className="text-sun" />
            </span>
          </span>
        )
      })}
    </span>
  )
}
