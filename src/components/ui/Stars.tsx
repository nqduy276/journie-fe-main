import { useId } from 'react'

const STAR = 'M12 2.6l2.9 6 6.5.8-4.8 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.6 9.4l6.5-.8z'

/** Rounded five-point stars in sun yellow with a fine ink edge; a partial rating fills part of the last star. */
export function StarRating({ value, size = 13 }: { value: number; size?: number }) {
  const uid = useId()
  return (
    <span className="inline-flex items-center gap-px" role="img" aria-label={`${value.toFixed(1)} / 5`}>
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, value - index))
        const clip = `${uid}-${index}`
        return (
          <svg key={index} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
            <defs>
              <clipPath id={clip}>
                <rect x="0" y="0" width={24 * fill} height="24" />
              </clipPath>
            </defs>
            <path d={STAR} fill="rgba(23,63,53,0.12)" stroke="rgba(23,63,53,0.35)" strokeWidth="1.2" strokeLinejoin="round" />
            <path d={STAR} fill="#f0b94b" stroke="#173f35" strokeWidth="1.5" strokeLinejoin="round" clipPath={`url(#${clip})`} />
          </svg>
        )
      })}
    </span>
  )
}
