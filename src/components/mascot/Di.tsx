import { useEffect, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useSky, type Phase, type Weather } from '../../store/weatherStore'
import { useMascot, type MascotMood } from './mascot-context'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const INK = '#2a1a12'
const FUR = '#8a5a3b'
const FUR_DARK = '#6e4529'
const CREAM = '#f8dfb8'
const BLUSH = '#ec9a86'
const TERRACOTTA = '#d96745'
const SUN = '#f0b94b'
const JADE = '#4fb8a4'
const RUG = '#1f5a4b'

type Point = readonly [number, number]

/**
 * Arm keyframes. Pose 0 = hands on knees, 1 = hands over the eyes, 2 = arm up (wave, cheer),
 * 3 = holding an umbrella. One spring per arm interpolates between them, so every mood is a number.
 */
const ARMS = {
  left: { shoulder: [124, 192] as Point, elbow: [[88, 216], [92, 172], [64, 168], [88, 216]] as Point[], hand: [[104, 244], [141, 120], [70, 106], [104, 244]] as Point[] },
  right: { shoulder: [196, 192] as Point, elbow: [[232, 216], [228, 172], [256, 168], [236, 190]] as Point[], hand: [[216, 244], [179, 120], [250, 106], [232, 140]] as Point[] },
} as const

function sample(keys: Point[], pose: number): Point {
  const p = clamp(pose, 0, keys.length - 1)
  const index = Math.min(keys.length - 2, Math.floor(p))
  const t = p - index
  return [lerp(keys[index][0], keys[index + 1][0], t), lerp(keys[index][1], keys[index + 1][1], t)]
}

const POSES: Record<MascotMood, readonly [number, number]> = {
  idle: [0, 0],
  watching: [0, 0],
  hiding: [1, 1],
  peeking: [0.35, 1],
  thinking: [0, 0.72],
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
      <motion.path d={d} stroke={INK} strokeWidth="25" strokeLinecap="round" fill="none" />
      <motion.path d={d} stroke={FUR} strokeWidth="17" strokeLinecap="round" fill="none" />
      <motion.g style={{ x: handX, y: handY }}>
        <circle r="14" fill={INK} />
        <circle r="10.5" fill={FUR} />
        <ellipse cx="0" cy="2" rx="6" ry="5" fill={CREAM} />
      </motion.g>
    </g>
  )
}

/* ───────── the flying carpet: a ribbon that ripples, drawn fresh every frame ───────── */

const RUG_L = 30
const RUG_R = 290
const RUG_MID = (RUG_L + RUG_R) / 2
const RUG_HALF = (RUG_R - RUG_L) / 2
const STEPS = 34

function rugEdge(x: number, t: number, base: number, amp: number, phase: number) {
  const u = (x - RUG_MID) / RUG_HALF
  const wave = Math.sin(u * 3.1 + t * 2.1 + phase) * amp + Math.sin(u * 6.3 - t * 1.4 + phase) * amp * 0.32
  const curl = Math.abs(u) ** 3 * 17
  return base + wave - curl
}

const fmt = (n: number) => n.toFixed(1)

function buildRug(t: number, energy: number) {
  const amp = 4.2 + energy * 6
  const top: Point[] = []
  const bot: Point[] = []
  for (let i = 0; i <= STEPS; i += 1) {
    const x = lerp(RUG_L, RUG_R, i / STEPS)
    top.push([x, rugEdge(x, t, 252, amp, 0)])
    bot.push([x, rugEdge(x, t, 288, amp, 0.7)])
  }
  const at = (a: Point[], b: Point[], i: number, k: number): Point => [a[i][0], lerp(a[i][1], b[i][1], k)]
  const poly = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p[0])} ${fmt(p[1])}`).join('')

  const body = `${poly(top)}${[...bot].reverse().map((p) => `L${fmt(p[0])} ${fmt(p[1])}`).join('')}Z`
  const stripeA = poly(top.map((_, i) => at(top, bot, i, 0.2)))
  const stripeB = poly(top.map((_, i) => at(top, bot, i, 0.8)))

  // diamonds along the middle line, each leaning with the local slope
  let diamonds = ''
  for (const u of [-0.62, -0.31, 0, 0.31, 0.62]) {
    const i = Math.round(((u * RUG_HALF + RUG_HALF) / (RUG_HALF * 2)) * STEPS)
    const c = at(top, bot, i, 0.5)
    const slope = (at(top, bot, Math.min(STEPS, i + 1), 0.5)[1] - at(top, bot, Math.max(0, i - 1), 0.5)[1]) / 2
    const r = 7.5
    diamonds += `M${fmt(c[0] - r)} ${fmt(c[1] - slope)}L${fmt(c[0])} ${fmt(c[1] - r - slope)}L${fmt(c[0] + r)} ${fmt(c[1] + slope)}L${fmt(c[0])} ${fmt(c[1] + r + slope)}Z`
  }

  const tassel = (side: -1 | 1) => {
    const i = side < 0 ? 0 : STEPS
    let d = ''
    for (let k = 0; k <= 4; k += 1) {
      const p = at(top, bot, i, 0.12 + k * 0.19)
      const sway = Math.sin(t * 3 + k * 0.9) * 2.4
      d += `M${fmt(p[0])} ${fmt(p[1])}Q${fmt(p[0] + side * 9)} ${fmt(p[1] + 1 + sway)} ${fmt(p[0] + side * 17)} ${fmt(p[1] + 3 + sway * 1.4)}`
    }
    return d
  }
  return { body, stripeA, stripeB, diamonds, left: tassel(-1), right: tassel(1) }
}

function Carpet({ time, energy }: { time: MotionValue<number>; energy: MotionValue<number> }) {
  const rug = useTransform([time, energy], ([t, e]: number[]) => buildRug(t, e))
  const body = useTransform(rug, (r) => r.body)
  const stripeA = useTransform(rug, (r) => r.stripeA)
  const stripeB = useTransform(rug, (r) => r.stripeB)
  const diamonds = useTransform(rug, (r) => r.diamonds)
  const left = useTransform(rug, (r) => r.left)
  const right = useTransform(rug, (r) => r.right)
  return (
    <g>
      <motion.path d={left} stroke={SUN} strokeWidth="3" strokeLinecap="round" fill="none" />
      <motion.path d={right} stroke={SUN} strokeWidth="3" strokeLinecap="round" fill="none" />
      <motion.path d={body} fill={RUG} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <motion.path d={stripeA} stroke={TERRACOTTA} strokeWidth="5" strokeLinecap="round" fill="none" />
      <motion.path d={stripeB} stroke={TERRACOTTA} strokeWidth="5" strokeLinecap="round" fill="none" />
      <motion.path d={diamonds} fill={SUN} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  )
}

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <path
      className="di-twinkle"
      style={{ animationDelay: `${delay}s` }}
      d={`M${x} ${y - size}Q${x + size * 0.18} ${y - size * 0.18} ${x + size} ${y}Q${x + size * 0.18} ${y + size * 0.18} ${x} ${y + size}Q${x - size * 0.18} ${y + size * 0.18} ${x - size} ${y}Q${x - size * 0.18} ${y - size * 0.18} ${x} ${y - size}Z`}
      fill={SUN}
    />
  )
}

type Props = {
  className?: string
  /** Override the sky Di dresses for (defaults to the current sky). */
  phase?: Phase
  weather?: Weather
  /** Stardust trailing behind the carpet. */
  trail?: boolean
  /** 0..1, how fast the carpet should flutter (the companion raises it while flying). */
  energy?: MotionValue<number>
  /** The companion tilts the whole figure with its speed. */
  roll?: MotionValue<number>
}

/**
 * Di: a small monkey on a flying carpet. Follows the pointer with its eyes and head, watches the field
 * you are typing in, covers its eyes for passwords, shakes its head on errors, cheers when happy and
 * dresses for the sky (sunglasses, umbrella, nightcap).
 */
export function Di({ className = '', phase, weather, trail = true, energy, roll }: Props) {
  const { mood, focusPoint, errorTick, originRef } = useMascot()
  const sky = useSky()
  const ph = phase ?? sky.phase
  const wx = weather ?? sky.weather
  const { reduced } = useMotionPrefs()
  const svgRef = useRef<SVGSVGElement>(null)

  const time = useMotionValue(0)
  const calmEnergy = useMotionValue(0)
  useAnimationFrame((t) => {
    if (!reduced) time.set(t / 1000)
  })

  const lookX = useMotionValue(0)
  const lookY = useMotionValue(0)
  const eyeX = useSpring(useTransform(lookX, (v) => v * 6.5), { stiffness: 220, damping: 20 })
  const eyeY = useSpring(useTransform(lookY, (v) => v * 5), { stiffness: 220, damping: 20 })
  const faceX = useSpring(useTransform(lookX, (v) => v * 5), { stiffness: 140, damping: 18 })
  const faceY = useSpring(useTransform(lookY, (v) => v * 3), { stiffness: 140, damping: 18 })
  const headTilt = useSpring(useTransform(lookX, (v) => v * 7), { stiffness: 90, damping: 14 })
  const lean = useSpring(useTransform(lookX, (v) => v * 4), { stiffness: 90, damping: 16 })
  const rugTilt = useSpring(useTransform(lookX, (v) => v * 3), { stiffness: 70, damping: 14 })
  const noRoll = useMotionValue(0)
  const bodyRoll = useSpring(roll ?? noRoll, { stiffness: 120, damping: 16 })

  const poseL = useSpring(0, { stiffness: 160, damping: 15, mass: 0.9 })
  const poseR = useSpring(0, { stiffness: 160, damping: 15, mass: 0.9 })
  const target = useRef<{ x: number; y: number } | null>(null)

  const showUmbrella = (wx === 'rain' || wx === 'storm') && ['idle', 'watching', 'thinking', 'error', 'sleepy'].includes(mood)
  const shades = ph === 'day' && wx === 'clear' && ['idle', 'watching', 'wave'].includes(mood)
  const cap = ph === 'night'

  useEffect(() => {
    const [left, right] = POSES[mood]
    poseL.set(left)
    poseR.set(showUmbrella ? 3 : right)
    if (mood !== 'wave') return
    let up = true
    const timer = window.setInterval(() => {
      poseR.set(up ? 1.6 : 2)
      up = !up
    }, 320)
    return () => window.clearInterval(timer)
  }, [mood, showUmbrella, poseL, poseR])

  const aim = (x: number, y: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const headX = rect.left + rect.width * 0.5
    const headY = rect.top + rect.height * 0.38
    lookX.set(clamp((x - headX) / (rect.width * 0.7), -1, 1))
    lookY.set(clamp((y - headY) / (rect.height * 0.7), -1, 1))
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
  const worried = mood === 'error' || wx === 'storm'
  const covering = mood === 'hiding'

  return (
    <div ref={originRef} className={`relative ${className}`}>
      <motion.div
        key={errorTick}
        className="size-full"
        style={{ rotate: bodyRoll, originY: '85%' }}
        animate={mood === 'error' ? { x: [0, -10, 10, -8, 8, -3, 0] } : undefined}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <motion.div
          className="size-full"
          key={happy ? 'hop' : 'still'}
          animate={happy ? { y: [0, -30, 0, -13, 0], scaleY: [1, 1.05, 0.93, 1.02, 1] } : { y: 0, scaleY: 1 }}
          style={{ originY: '100%' }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <div className="di-float size-full">
            <svg ref={svgRef} viewBox="0 0 320 300" className="size-full overflow-visible" role="img" aria-label="Di, linh vật của Journie">
              <ellipse className="di-shadow" cx="160" cy="296" rx="92" ry="7" fill="#0d2822" opacity="0.28" />

              {trail && (
                <g>
                  <Sparkle x={10} y={236} size={9} delay={0} />
                  <Sparkle x={-8} y={262} size={6} delay={0.7} />
                  <Sparkle x={310} y={250} size={7} delay={1.3} />
                </g>
              )}

              {/* tail, behind everything */}
              <g className="di-tail" style={{ transformOrigin: '204px 232px', transformBox: 'view-box' }}>
                <path d="M204 234C252 236 270 196 244 172C234 163 226 174 236 182" stroke={INK} strokeWidth="17" strokeLinecap="round" fill="none" />
                <path d="M204 234C252 236 270 196 244 172C234 163 226 174 236 182" stroke={FUR} strokeWidth="9.5" strokeLinecap="round" fill="none" />
              </g>

              <motion.g style={{ rotate: rugTilt, originX: '50%', originY: '88%', transformBox: 'view-box' }}>
                <Carpet time={time} energy={energy ?? calmEnergy} />
              </motion.g>

              {/* legs and feet resting on the carpet */}
              <g>
                <path d="M138 222C124 232 116 242 112 252" stroke={INK} strokeWidth="25" strokeLinecap="round" fill="none" />
                <path d="M138 222C124 232 116 242 112 252" stroke={FUR} strokeWidth="17" strokeLinecap="round" fill="none" />
                <path d="M182 222C196 232 204 242 208 252" stroke={INK} strokeWidth="25" strokeLinecap="round" fill="none" />
                <path d="M182 222C196 232 204 242 208 252" stroke={FUR} strokeWidth="17" strokeLinecap="round" fill="none" />
                <ellipse cx="108" cy="258" rx="22" ry="13" fill={FUR} stroke={INK} strokeWidth="4" />
                <ellipse cx="102" cy="260" rx="9" ry="6" fill={CREAM} />
                <ellipse cx="212" cy="258" rx="22" ry="13" fill={FUR} stroke={INK} strokeWidth="4" />
                <ellipse cx="218" cy="260" rx="9" ry="6" fill={CREAM} />
              </g>

              {/* body */}
              <ellipse cx="160" cy="204" rx="43" ry="46" fill={FUR} stroke={INK} strokeWidth="4.5" />
              <ellipse cx="160" cy="212" rx="25" ry="29" fill={CREAM} />
              {/* vest */}
              <path d="M124 180C110 206 114 236 130 248L150 246C142 224 146 200 150 178Z" fill={SUN} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
              <path d="M196 180C210 206 206 236 190 248L170 246C178 224 174 200 170 178Z" fill={SUN} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
              <path d="M126 192C122 208 124 226 130 238M194 192C198 208 196 226 190 238" stroke={TERRACOTTA} strokeWidth="4" strokeLinecap="round" fill="none" />
              <circle cx="146" cy="226" r="3.4" fill={TERRACOTTA} />
              <circle cx="174" cy="226" r="3.4" fill={TERRACOTTA} />

              {/* head */}
              <motion.g style={{ rotate: headTilt, x: lean, originX: '160px', originY: '150px', transformBox: 'view-box' }}>
                <circle cx="94" cy="116" r="23" fill={FUR} stroke={INK} strokeWidth="4.5" />
                <circle cx="94" cy="117" r="12" fill={BLUSH} />
                <circle cx="226" cy="116" r="23" fill={FUR} stroke={INK} strokeWidth="4.5" />
                <circle cx="226" cy="117" r="12" fill={BLUSH} />
                <circle cx="160" cy="112" r="64" fill={FUR} stroke={INK} strokeWidth="4.5" />
                <path d="M160 100C150 84 110 88 110 120C110 148 138 172 160 172C182 172 210 148 210 120C210 88 170 84 160 100Z" fill={CREAM} />

                <motion.g style={{ x: faceX, y: faceY }}>
                  {/* eyes */}
                  <motion.g style={{ x: eyeX, y: eyeY }}>
                    {!happy && !sleepy && (
                      <g className="di-eyes">
                        {[139, 181].map((cx) => (
                          <g key={cx}>
                            <ellipse cx={cx} cy="118" rx={mood === 'error' ? 9.5 : 11} ry={mood === 'error' ? 11 : 12.5} fill={INK} />
                            <circle cx={cx + 3.5} cy="113" r="3.8" fill="#fff" />
                            <circle cx={cx - 3} cy="123" r="1.8" fill="#fff" opacity="0.7" />
                          </g>
                        ))}
                      </g>
                    )}
                  </motion.g>
                  {happy && (
                    <g stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none">
                      <path d="M127 122Q139 106 151 122" />
                      <path d="M169 122Q181 106 193 122" />
                    </g>
                  )}
                  {sleepy && (
                    <g stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none">
                      <path d="M127 118Q139 128 151 118" />
                      <path d="M169 118Q181 128 193 118" />
                    </g>
                  )}
                  {shades && (
                    <g>
                      <rect x="121" y="104" width="38" height="28" rx="12" fill={INK} />
                      <rect x="161" y="104" width="38" height="28" rx="12" fill={INK} />
                      <path d="M159 112H161" stroke={INK} strokeWidth="5" />
                      <path d="M121 110L108 104M199 110L212 104" stroke={INK} strokeWidth="4" strokeLinecap="round" />
                      <path d="M128 111L140 109M168 111L180 109" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
                    </g>
                  )}
                  {/* brows */}
                  {!happy && !sleepy && !shades && (
                    <g stroke={INK} strokeWidth="3.8" strokeLinecap="round" fill="none">
                      <path d={worried ? 'M125 98Q137 92 151 100M169 100Q183 92 195 98' : 'M126 98Q138 92 150 97M170 97Q182 92 194 98'} />
                    </g>
                  )}
                  {/* cheeks, nose, mouth */}
                  <ellipse cx="122" cy="144" rx="10" ry="6.5" fill={BLUSH} opacity={happy ? 0.85 : 0.55} />
                  <ellipse cx="198" cy="144" rx="10" ry="6.5" fill={BLUSH} opacity={happy ? 0.85 : 0.55} />
                  <ellipse cx="160" cy="140" rx="8" ry="5.5" fill={FUR_DARK} />
                  <circle cx="157" cy="139" r="1.5" fill={INK} />
                  <circle cx="163" cy="139" r="1.5" fill={INK} />
                  {happy ? (
                    <g>
                      <path d="M142 150Q160 176 178 150Z" fill="#7a2a1c" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
                      <path d="M151 161Q160 170 169 161Q160 157 151 161Z" fill="#ef8f78" />
                    </g>
                  ) : mood === 'error' ? (
                    <ellipse cx="160" cy="157" rx="6.5" ry="8" fill="#7a2a1c" stroke={INK} strokeWidth="3.2" />
                  ) : mood === 'thinking' || covering ? (
                    <path d="M147 156Q153 151 160 156T173 156" stroke={INK} strokeWidth="3.8" strokeLinecap="round" fill="none" />
                  ) : sleepy ? (
                    <ellipse cx="160" cy="156" rx="5" ry="3.6" fill="#7a2a1c" stroke={INK} strokeWidth="3" />
                  ) : (
                    <path d="M145 150Q160 166 175 150" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
                  )}
                </motion.g>

                {/* head wear: a fez by day, a nightcap after dark */}
                {!cap ? (
                  <g>
                    <path d="M117 78L128 38Q160 28 192 38L203 78Q160 90 117 78Z" fill={TERRACOTTA} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
                    <path d="M118 71Q160 84 202 71L203 78Q160 90 117 78Z" fill={SUN} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
                    <ellipse cx="160" cy="36" rx="32" ry="7" fill="#e98763" stroke={INK} strokeWidth="3.5" />
                    <g className="di-tassel" style={{ transformOrigin: '160px 34px', transformBox: 'view-box' }}>
                      <path d="M160 34C176 34 188 46 190 64" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
                      <circle cx="190" cy="68" r="7" fill={SUN} stroke={INK} strokeWidth="3.5" />
                    </g>
                  </g>
                ) : (
                  <g>
                    <path d="M108 80C112 44 150 22 202 40C222 48 238 42 252 62C236 72 214 72 200 66C170 56 134 62 108 80Z" fill="#705cc4" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
                    <path d="M106 82C140 62 176 62 204 70" stroke={CREAM} strokeWidth="8" strokeLinecap="round" fill="none" />
                    <circle cx="254" cy="62" r="10" fill={SUN} stroke={INK} strokeWidth="3.5" />
                  </g>
                )}
              </motion.g>

              {/* arms on top so hands can cover the face */}
              <Arm side="left" pose={poseL} />
              <Arm side="right" pose={poseR} />

              {showUmbrella && (
                <g className="di-umbrella">
                  <path d="M232 138V30" stroke={INK} strokeWidth="5" strokeLinecap="round" />
                  <path d="M168 44C168 -8 296 -8 296 44C284 34 274 34 263 44C252 34 242 34 232 44C222 34 212 34 201 44C190 34 180 34 168 44Z" fill={TERRACOTTA} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
                  <path d="M232 4C210 10 192 24 186 44M232 4C254 10 272 24 278 44" stroke={INK} strokeOpacity="0.35" strokeWidth="2.5" fill="none" />
                  {[196, 224, 252, 276].map((x, i) => (
                    <path key={x} className="di-drop" style={{ animationDelay: `${i * 0.33}s` }} d={`M${x} 66q-4 7 0 10q4 -3 0 -10Z`} fill={JADE} />
                  ))}
                </g>
              )}

              {mood === 'error' && (
                <g key={`sweat-${errorTick}`} className="di-drop" style={{ animationIterationCount: 2 }}>
                  <path d="M214 92c-7 10-10 15-10 20a10 10 0 0 0 20 0c0-5-3-10-10-20Z" fill="#9fe0d6" stroke={INK} strokeWidth="3" />
                </g>
              )}

              {sleepy && (
                <g fontFamily="'Journie Display', serif" fontWeight="600" fill="#d9f0e8">
                  <text className="di-zzz" x="214" y="56" fontSize="28">z</text>
                  <text className="di-zzz" style={{ animationDelay: '0.9s' }} x="232" y="40" fontSize="21">z</text>
                  <text className="di-zzz" style={{ animationDelay: '1.7s' }} x="246" y="26" fontSize="15">z</text>
                </g>
              )}

              {happy && (
                <>
                  <Sparkle x={30} y={80} size={12} delay={0} />
                  <Sparkle x={292} y={66} size={14} delay={0.4} />
                  <Sparkle x={304} y={176} size={9} delay={0.8} />
                  <Sparkle x={14} y={180} size={10} delay={0.2} />
                </>
              )}
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
