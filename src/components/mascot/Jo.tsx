import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useSky } from '../../store/weatherStore'
import type { WeatherKind } from '../icons'
import { useMascot, type MascotMood } from './mascot-context'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const FOREST = '#173f35'
const SUN = '#f0b94b'
const TERRACOTTA = '#d96745'
const JADE = '#4fb8a4'
const CREAM = '#fbf5e6'

type Point = readonly [number, number]

/**
 * Arm keyframes. Pose 0 = arms at rest, 1 = hands over the eyes, 2 = both arms up.
 * One spring per arm interpolates between them, so every mood is just a number.
 */
const ARMS = {
  left: { shoulder: [72, 190] as Point, elbow: [[42, 216], [58, 154], [26, 144]] as Point[], hand: [[54, 248], [124, 135], [34, 98]] as Point[] },
  right: { shoulder: [228, 190] as Point, elbow: [[258, 216], [242, 154], [274, 144]] as Point[], hand: [[246, 248], [176, 135], [266, 98]] as Point[] },
} as const

function sample(keys: Point[], pose: number): Point {
  const p = clamp(pose, 0, 2)
  const index = p <= 1 ? 0 : 1
  const t = p <= 1 ? p : p - 1
  return [lerp(keys[index][0], keys[index + 1][0], t), lerp(keys[index][1], keys[index + 1][1], t)]
}

const POSES: Record<MascotMood, readonly [number, number]> = {
  idle: [0, 0],
  watching: [0, 0],
  hiding: [1, 1],
  peeking: [0.35, 1],
  thinking: [0, 0.7],
  error: [0.15, 0.15],
  joy: [2, 2],
  sleepy: [0, 0],
  wave: [0, 2],
}

function Arm({ side, pose }: { side: 'left' | 'right'; pose: MotionValue<number> }) {
  const arm = ARMS[side]
  const d = useTransform(pose, (value) => {
    const e = sample(arm.elbow, value)
    const h = sample(arm.hand, value)
    return `M${arm.shoulder[0]} ${arm.shoulder[1]} Q${e[0]} ${e[1]} ${h[0]} ${h[1]}`
  })
  const handX = useTransform(pose, (value) => sample(arm.hand, value)[0])
  const handY = useTransform(pose, (value) => sample(arm.hand, value)[1])
  return (
    <g>
      <motion.path d={d} stroke={FOREST} strokeWidth="25" strokeLinecap="round" fill="none" />
      <motion.path d={d} stroke={SUN} strokeWidth="17.5" strokeLinecap="round" fill="none" />
      <motion.g style={{ x: handX, y: handY }}>
        <circle r="14.5" fill={FOREST} />
        <circle r="11" fill="#f6c96a" />
        <path d="M-5 -2q5 -4 10 0" stroke="#fff" strokeOpacity=".5" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </motion.g>
    </g>
  )
}

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <path
      className="scene-window"
      style={{ animationDelay: `${delay}s`, ['--dur' as string]: '1.8s' }}
      d={`M${x} ${y - size}Q${x + size * 0.18} ${y - size * 0.18} ${x + size} ${y}Q${x + size * 0.18} ${y + size * 0.18} ${x} ${y + size}Q${x - size * 0.18} ${y + size * 0.18} ${x - size} ${y}Q${x - size * 0.18} ${y - size * 0.18} ${x} ${y - size}Z`}
      fill={SUN}
    />
  )
}

type Props = {
  className?: string
  /** Override the sky Jo dresses for (defaults to the current weather). */
  weather?: WeatherKind
  /** Draw the dotted route trail that follows Jo, a nod to the logo. */
  trail?: boolean
}

/**
 * Jo: a living map pin. Follows the pointer, watches the field you are typing in, covers its eyes for
 * passwords, shakes its head on errors, hops when happy, and dresses for the weather.
 */
export function Jo({ className = '', weather, trail = true }: Props) {
  const { mood, focusPoint, errorTick, originRef } = useMascot()
  const sky = useSky()
  const kind = weather ?? sky.kind
  const { reduced } = useMotionPrefs()
  const svgRef = useRef<SVGSVGElement>(null)

  const lookX = useMotionValue(0)
  const lookY = useMotionValue(0)
  const eyeX = useSpring(useTransform(lookX, (v) => v * 7), { stiffness: 220, damping: 20 })
  const eyeY = useSpring(useTransform(lookY, (v) => v * 5.5), { stiffness: 220, damping: 20 })
  const tilt = useSpring(useTransform(lookX, (v) => v * 7), { stiffness: 90, damping: 14 })
  const lean = useSpring(useTransform(lookX, (v) => v * 6), { stiffness: 90, damping: 16 })

  const poseL = useSpring(0, { stiffness: 160, damping: 15, mass: 0.9 })
  const poseR = useSpring(0, { stiffness: 160, damping: 15, mass: 0.9 })
  const target = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const [left, right] = POSES[mood]
    poseL.set(left)
    poseR.set(right)
    if (mood !== 'wave') return
    let up = true
    const timer = window.setInterval(() => {
      poseR.set(up ? 1.55 : 2)
      up = !up
    }, 320)
    return () => window.clearInterval(timer)
  }, [mood, poseL, poseR])

  const aim = (x: number, y: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const headX = rect.left + rect.width * 0.5
    const headY = rect.top + rect.height * 0.4
    lookX.set(clamp((x - headX) / (rect.width * 0.6), -1, 1))
    lookY.set(clamp((y - headY) / (rect.height * 0.6), -1, 1))
  }

  useEffect(() => {
    target.current = focusPoint
    if (focusPoint) aim(focusPoint.x, focusPoint.y)
  })

  useEffect(() => {
    if (reduced) return
    const onMove = (event: PointerEvent) => {
      if (!target.current) aim(event.clientX, event.clientY)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
    // aim only reads refs and stable motion values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  const happy = mood === 'joy'
  const sleepy = mood === 'sleepy'
  const worried = mood === 'error' || kind === 'storm'
  const covering = mood === 'hiding'
  const umbrella = kind === 'rain' || kind === 'storm'
  const shades = kind === 'sunny' && (mood === 'idle' || mood === 'watching' || mood === 'wave')
  const cap = kind === 'night'

  return (
    <div ref={originRef} className={`relative ${className}`}>
      <motion.div
        key={errorTick}
        className="size-full"
        style={{ rotate: tilt, x: lean, originY: '92%' }}
        animate={mood === 'error' ? { x: [0, -10, 10, -8, 8, -3, 0] } : undefined}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <motion.div
          className="size-full"
          key={happy ? 'hop' : 'still'}
          animate={happy ? { y: [0, -28, 0, -12, 0], scaleY: [1, 1.05, 0.93, 1.02, 1] } : { y: 0, scaleY: 1 }}
          style={{ originY: '100%' }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <div className="jo-float size-full">
            <svg ref={svgRef} viewBox="0 0 300 340" className="size-full overflow-visible" role="img" aria-label="Jo, linh vật của Journie">
              <defs>
                <linearGradient id="jo-body" x1="0.2" y1="0" x2="0.8" y2="1">
                  <stop offset="0" stopColor="#f9d57e" />
                  <stop offset="0.6" stopColor={SUN} />
                  <stop offset="1" stopColor="#e8963a" />
                </linearGradient>
              </defs>

              {trail && (
                <g>
                  <path className="jo-trail" d="M146 326C118 340 92 322 66 334S26 342 8 328" stroke={JADE} strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  <circle cx="10" cy="328" r="6" fill="none" stroke={TERRACOTTA} strokeWidth="3.5" />
                </g>
              )}
              <ellipse className="jo-shadow" cx="150" cy="332" rx="46" ry="7" fill={FOREST} opacity="0.35" />

              {/* body: a map pin */}
              <path d="M150 320C106 268 56 220 56 138A94 94 0 0 1 244 138C244 220 194 268 150 320Z" fill="url(#jo-body)" stroke={FOREST} strokeWidth="5" strokeLinejoin="round" />
              <path d="M214 76C236 96 246 124 240 156C232 200 198 246 156 306C214 262 250 200 248 138C248 112 236 90 214 76Z" fill={TERRACOTTA} opacity="0.22" />
              <circle cx="150" cy="138" r="66" fill={CREAM} stroke={FOREST} strokeWidth="4" />

              {/* head accessory */}
              {!umbrella && !cap && (
                <g className="jo-sprout">
                  <path d="M150 52C150 40 153 31 160 22" stroke={FOREST} strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M158 27C160 12 176 7 188 12C186 25 172 31 158 27Z" fill={JADE} stroke={FOREST} strokeWidth="3.5" strokeLinejoin="round" />
                  <path d="M150 38C142 25 127 23 118 29C122 40 138 44 150 38Z" fill="#7ccbb9" stroke={FOREST} strokeWidth="3.5" strokeLinejoin="round" />
                </g>
              )}
              {cap && (
                <g>
                  <path d="M96 78C106 40 148 22 196 42C214 50 228 44 240 60C226 70 206 70 194 64C166 54 128 58 96 78Z" fill="#705cc4" stroke={FOREST} strokeWidth="4" strokeLinejoin="round" />
                  <path d="M94 80C128 62 170 62 198 68" stroke={CREAM} strokeWidth="6" strokeLinecap="round" fill="none" />
                  <circle cx="242" cy="60" r="9" fill={SUN} stroke={FOREST} strokeWidth="3.5" />
                </g>
              )}

              {/* eyes */}
              <motion.g style={{ x: eyeX, y: eyeY }}>
                {!happy && !sleepy && (
                  <g className="jo-eyes">
                    {[126, 174].map((cx) => (
                      <g key={cx}>
                        <circle cx={cx} cy="134" r={mood === 'error' ? 8 : 10.5} fill={FOREST} />
                        <circle cx={cx + 3.2} cy="130" r="3.2" fill="#fff" />
                      </g>
                    ))}
                  </g>
                )}
              </motion.g>
              {happy && (
                <g stroke={FOREST} strokeWidth="4.5" strokeLinecap="round" fill="none">
                  <path d="M114 138Q126 122 138 138" />
                  <path d="M162 138Q174 122 186 138" />
                </g>
              )}
              {sleepy && (
                <g stroke={FOREST} strokeWidth="4.5" strokeLinecap="round" fill="none">
                  <path d="M114 134Q126 143 138 134" />
                  <path d="M162 134Q174 143 186 134" />
                </g>
              )}

              {shades && (
                <g>
                  <rect x="104" y="119" width="46" height="31" rx="13" fill={FOREST} />
                  <rect x="150" y="119" width="46" height="31" rx="13" fill={FOREST} />
                  <path d="M150 128H150" stroke={FOREST} strokeWidth="4" />
                  <path d="M104 126L92 122M196 126L208 122" stroke={FOREST} strokeWidth="4" strokeLinecap="round" />
                  <path d="M112 128L124 126M158 128L170 126" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
                </g>
              )}

              {/* brows */}
              {!happy && !sleepy && !shades && (
                <g stroke={FOREST} strokeWidth="3.8" strokeLinecap="round" fill="none">
                  <path d={worried ? 'M112 114Q124 108 138 116M162 116Q176 108 188 114' : 'M114 114Q126 108 138 113M162 113Q174 108 186 114'} />
                </g>
              )}

              {/* cheeks and mouth */}
              <ellipse cx="106" cy="154" rx="11" ry="6.5" fill={TERRACOTTA} opacity={happy ? 0.75 : 0.5} />
              <ellipse cx="194" cy="154" rx="11" ry="6.5" fill={TERRACOTTA} opacity={happy ? 0.75 : 0.5} />
              {happy ? (
                <g>
                  <path d="M134 152Q150 178 166 152Z" fill="#8a2f1f" stroke={FOREST} strokeWidth="3.5" strokeLinejoin="round" />
                  <path d="M142 162Q150 170 158 162Q150 158 142 162Z" fill="#ef8f78" />
                </g>
              ) : mood === 'error' ? (
                <ellipse cx="150" cy="158" rx="6.5" ry="8.5" fill="#8a2f1f" stroke={FOREST} strokeWidth="3.5" />
              ) : mood === 'thinking' || covering ? (
                <path d="M138 158Q144 153 150 158T162 158" stroke={FOREST} strokeWidth="3.8" strokeLinecap="round" fill="none" />
              ) : sleepy ? (
                <ellipse cx="150" cy="157" rx="5" ry="3.5" fill="#8a2f1f" stroke={FOREST} strokeWidth="3" />
              ) : (
                <path d="M136 152Q150 168 164 152" stroke={FOREST} strokeWidth="4" strokeLinecap="round" fill="none" />
              )}

              {/* arms */}
              <Arm side="left" pose={poseL} />
              <Arm side="right" pose={poseR} />

              {umbrella && (
                <g>
                  <path d="M150 58V16" stroke={FOREST} strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M58 62C58 20 242 20 242 62C230 52 218 52 206 62C194 52 182 52 170 62C158 52 142 52 130 62C118 52 106 52 94 62C82 52 70 52 58 62Z" fill={TERRACOTTA} stroke={FOREST} strokeWidth="4" strokeLinejoin="round" />
                  <path d="M150 26C128 32 112 44 106 60M150 26C172 32 188 44 194 60" stroke={FOREST} strokeOpacity="0.45" strokeWidth="2.5" fill="none" />
                  {[70, 118, 182, 230].map((x, i) => (
                    <path key={x} className="jo-drop" style={{ animationDelay: `${i * 0.35}s` }} d={`M${x} 70q-4 7 0 10q4 -3 0 -10Z`} fill={JADE} />
                  ))}
                </g>
              )}

              {mood === 'error' && (
                <g key={`sweat-${errorTick}`} className="jo-drop" style={{ animationIterationCount: 2 }}>
                  <path d="M214 96c-7 10-10 15-10 20a10 10 0 0 0 20 0c0-5-3-10-10-20Z" fill="#9fe0d6" stroke={FOREST} strokeWidth="3" />
                </g>
              )}

              {sleepy && (
                <g fontFamily="Lora, serif" fontWeight="600" fill={FOREST}>
                  <text className="jo-zzz" x="206" y="64" fontSize="26">z</text>
                  <text className="jo-zzz" style={{ animationDelay: '0.9s' }} x="222" y="48" fontSize="20">z</text>
                  <text className="jo-zzz" style={{ animationDelay: '1.7s' }} x="236" y="34" fontSize="15">z</text>
                </g>
              )}

              {happy && (
                <>
                  <Sparkle x={30} y={70} size={11} delay={0} />
                  <Sparkle x={270} y={58} size={13} delay={0.4} />
                  <Sparkle x={284} y={170} size={8} delay={0.8} />
                  <Sparkle x={14} y={176} size={9} delay={0.2} />
                </>
              )}
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
