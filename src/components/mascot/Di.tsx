import { useEffect, useId, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useTr } from '../../hooks/useTr'
import { useSky, type Phase, type Weather } from '../../store/weatherStore'
import { useMascot, type MascotMood } from './mascot-context'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/* A short, muted palette: caramel fur, cream face, one deep green rug with a gold edge, one terracotta hat. */
const FUR_HI = '#c49c7c'
const FUR = '#996f56'
const FUR_LO = '#5f4234'
const CREAM = '#f8ecd9'
const CREAM_LO = '#e6d0b2'
const EYE = '#1d1511'
const BROW = '#4a3426'
const GOLD = '#e9c97f'
const GOLD_LO = '#c39a4b'
const RUG_HI = '#2f6e5d'
const RUG_LO = '#143a30'
const FEZ_HI = '#d98a6b'
const FEZ_LO = '#9f4f3a'
const CAP_HI = '#7d7cb9'
const CAP_LO = '#4d4c88'

type Point = readonly [number, number]

/**
 * Arm keyframes. Pose 0 = arms down by the sides, 1 = mitts over the eyes, 2 = arm up (wave, cheer),
 * 3 = holding an umbrella. One spring per arm interpolates between them, so every mood is a number.
 * A fourth state, pointing, blends toward a hand position aimed at a control on the page.
 */
const ARMS = {
  left: { shoulder: [126, 214] as Point, elbow: [[112, 230], [104, 190], [84, 212], [112, 230]] as Point[], hand: [[116, 242], [138, 139], [58, 168], [116, 242]] as Point[] },
  right: { shoulder: [194, 214] as Point, elbow: [[208, 230], [216, 190], [236, 212], [244, 206]] as Point[], hand: [[204, 242], [182, 139], [262, 168], [252, 172]] as Point[] },
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

type Aim = { w: MotionValue<number>; hx: MotionValue<number>; hy: MotionValue<number>; ex: MotionValue<number>; ey: MotionValue<number>; angle: MotionValue<number> }

function useAim(): { aim: Aim; set: (target: { hx: number; hy: number; ex: number; ey: number; angle: number } | null) => void } {
  const w = useSpring(0, { stiffness: 170, damping: 20 })
  const hx = useSpring(0, { stiffness: 150, damping: 18 })
  const hy = useSpring(0, { stiffness: 150, damping: 18 })
  const ex = useSpring(0, { stiffness: 150, damping: 18 })
  const ey = useSpring(0, { stiffness: 150, damping: 18 })
  const angle = useSpring(0, { stiffness: 150, damping: 18 })
  return {
    aim: { w, hx, hy, ex, ey, angle },
    set: (target) => {
      if (!target) {
        w.set(0)
        return
      }
      if (w.get() < 0.05) {
        hx.jump(target.hx)
        hy.jump(target.hy)
        ex.jump(target.ex)
        ey.jump(target.ey)
        angle.jump(target.angle)
      } else {
        hx.set(target.hx)
        hy.set(target.hy)
        ex.set(target.ex)
        ey.set(target.ey)
        angle.set(target.angle)
      }
      w.set(1)
    },
  }
}

function Arm({ side, pose, aim }: { side: 'left' | 'right'; pose: MotionValue<number>; aim: Aim }) {
  const arm = ARMS[side]
  const geometry = useTransform([pose, aim.w, aim.hx, aim.hy, aim.ex, aim.ey] as MotionValue<number>[], ([p, w, hx, hy, ex, ey]: number[]) => {
    const e = sample(arm.elbow, p)
    const h = sample(arm.hand, p)
    return { ex: lerp(e[0], ex, w), ey: lerp(e[1], ey, w), hx: lerp(h[0], hx, w), hy: lerp(h[1], hy, w) }
  })
  const d = useTransform(geometry, (g) => `M${arm.shoulder[0]} ${arm.shoulder[1]}Q${g.ex} ${g.ey} ${g.hx} ${g.hy}`)
  const handX = useTransform(geometry, (g) => g.hx)
  const handY = useTransform(geometry, (g) => g.hy)
  const finger = useTransform(aim.w, (w) => clamp(w * 1.4 - 0.4, 0, 1))
  return (
    <g>
      <motion.path d={d} stroke="#2a1a12" strokeOpacity="0.22" strokeWidth="18" strokeLinecap="round" fill="none" transform="translate(1.5 3.5)" />
      <motion.path d={d} stroke={FUR} strokeWidth="16" strokeLinecap="round" fill="none" />
      <motion.path d={d} stroke={FUR_HI} strokeOpacity="0.32" strokeWidth="5" strokeLinecap="round" fill="none" transform="translate(-2.5 -2.5)" />
      <motion.g style={{ x: handX, y: handY }}>
        <circle r="12.5" fill="#2a1a12" opacity="0.2" cx="1.5" cy="3" />
        <circle r="11.5" fill={FUR} />
        <circle r="5" cx="-3.5" cy="-3.5" fill={FUR_HI} opacity="0.55" />
        <motion.g style={{ rotate: aim.angle, scale: finger, originX: 0, originY: 0 }}>
          <rect x="5" y="-3.8" width="15" height="7.6" rx="3.8" fill={FUR} />
          <rect x="7" y="-2.6" width="11" height="2.6" rx="1.3" fill={FUR_HI} opacity="0.5" />
        </motion.g>
      </motion.g>
    </g>
  )
}

/* ───────── the flying carpet: a ribbon that ripples, drawn fresh every frame ───────── */

const RUG_L = 54
const RUG_R = 266
const RUG_MID = (RUG_L + RUG_R) / 2
const RUG_HALF = (RUG_R - RUG_L) / 2
const STEPS = 30

function rugEdge(x: number, t: number, base: number, amp: number, phase: number) {
  const u = (x - RUG_MID) / RUG_HALF
  const wave = Math.sin(u * 3.1 + t * 2 + phase) * amp + Math.sin(u * 6.3 - t * 1.3 + phase) * amp * 0.3
  const curl = Math.abs(u) ** 3 * 9
  return base + wave - curl
}

const fmt = (n: number) => n.toFixed(1)

function buildRug(t: number, energy: number) {
  const amp = 2.2 + energy * 4
  const top: Point[] = []
  const bot: Point[] = []
  for (let i = 0; i <= STEPS; i += 1) {
    const x = lerp(RUG_L, RUG_R, i / STEPS)
    top.push([x, rugEdge(x, t, 262, amp, 0)])
    bot.push([x, rugEdge(x, t, 284, amp, 0.7)])
  }
  const at = (i: number, k: number): Point => [top[i][0], lerp(top[i][1], bot[i][1], k)]
  const poly = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p[0])} ${fmt(p[1])}`).join('')
  const body = `${poly(top)}${[...bot].reverse().map((p) => `L${fmt(p[0])} ${fmt(p[1])}`).join('')}Z`
  const trim = poly(top.map((_, i) => at(i, 0.26)))
  let dots = ''
  for (const u of [-0.45, 0, 0.45]) {
    const i = Math.round(((u * RUG_HALF + RUG_HALF) / (RUG_HALF * 2)) * STEPS)
    const c = at(i, 0.62)
    const slope = (at(Math.min(STEPS, i + 1), 0.62)[1] - at(Math.max(0, i - 1), 0.62)[1]) / 2
    const r = 3
    dots += `M${fmt(c[0] - r)} ${fmt(c[1] - slope)}L${fmt(c[0])} ${fmt(c[1] - r - slope)}L${fmt(c[0] + r)} ${fmt(c[1] + slope)}L${fmt(c[0])} ${fmt(c[1] + r + slope)}Z`
  }
  const tassel = (side: -1 | 1) => {
    const i = side < 0 ? 0 : STEPS
    let d = ''
    for (let k = 0; k <= 3; k += 1) {
      const p = at(i, 0.16 + k * 0.22)
      const sway = Math.sin(t * 2.6 + k * 0.9) * 1.8
      d += `M${fmt(p[0])} ${fmt(p[1])}Q${fmt(p[0] + side * 5)} ${fmt(p[1] + 0.6 + sway)} ${fmt(p[0] + side * 10)} ${fmt(p[1] + 1.8 + sway)}`
    }
    return d
  }
  return { body, top: poly(top), bottom: poly(bot), trim, dots, left: tassel(-1), right: tassel(1) }
}

function Carpet({ time, energy, uid }: { time: MotionValue<number>; energy: MotionValue<number>; uid: string }) {
  const rug = useTransform([time, energy], ([t, e]: number[]) => buildRug(t, e))
  const body = useTransform(rug, (r) => r.body)
  const topEdge = useTransform(rug, (r) => r.top)
  const bottomEdge = useTransform(rug, (r) => r.bottom)
  const trim = useTransform(rug, (r) => r.trim)
  const dots = useTransform(rug, (r) => r.dots)
  const left = useTransform(rug, (r) => r.left)
  const right = useTransform(rug, (r) => r.right)
  return (
    <g>
      <motion.path d={left} stroke={GOLD_LO} strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" fill="none" />
      <motion.path d={right} stroke={GOLD_LO} strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" fill="none" />
      <motion.path d={body} fill={`url(#${uid}-rug)`} />
      <motion.path d={bottomEdge} stroke="#06201a" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" fill="none" />
      <motion.path d={trim} stroke={GOLD} strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <motion.path d={topEdge} stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <motion.path d={dots} fill={GOLD} fillOpacity="0.8" />
    </g>
  )
}

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <path
      className="di-twinkle"
      style={{ animationDelay: `${delay}s` }}
      d={`M${x} ${y - size}Q${x + size * 0.18} ${y - size * 0.18} ${x + size} ${y}Q${x + size * 0.18} ${y + size * 0.18} ${x} ${y + size}Q${x - size * 0.18} ${y + size * 0.18} ${x - size} ${y}Q${x - size * 0.18} ${y - size * 0.18} ${x} ${y - size}Z`}
      fill={GOLD}
    />
  )
}

type Props = {
  className?: string
  /** Override the sky Di dresses for (defaults to the current sky). */
  phase?: Phase
  weather?: Weather
  /** A few glints around the carpet. */
  trail?: boolean
  /** 0..1, how fast the carpet should flutter. */
  energy?: MotionValue<number>
  roll?: MotionValue<number>
}

/**
 * Di: a small chibi monkey on a flying carpet, proportioned like a desk pet (a big round head on a bean-sized
 * body, stubby limbs) and drawn as a soft toy: no outlines, a few muted colours, gradients and shadows for depth. Looks at the pointer, points at the control under it, watches the field you are typing in,
 * covers its eyes for passwords, shakes its head on errors and dresses for the sky (fez or nightcap, sunglasses,
 * umbrella). The umbrella stays up whatever the mood while it rains.
 */
export function Di({ className = '', phase, weather, trail = true, energy, roll }: Props) {
  const { mood, focusPoint, pointAt = null, errorTick, originRef } = useMascot()
  const sky = useSky()
  const ph = phase ?? sky.phase
  const wx = weather ?? sky.weather
  const { reduced } = useMotionPrefs()
  const { tr } = useTr()
  const svgRef = useRef<SVGSVGElement>(null)
  const uid = useId().replace(/:/g, '')

  const time = useMotionValue(0)
  const calmEnergy = useMotionValue(0)
  useAnimationFrame((t) => {
    if (!reduced) time.set(t / 1000)
  })

  const lookX = useMotionValue(0)
  const lookY = useMotionValue(0)
  const eyeX = useSpring(useTransform(lookX, (v) => v * 6.5), { stiffness: 220, damping: 20 })
  const eyeY = useSpring(useTransform(lookY, (v) => v * 5), { stiffness: 220, damping: 20 })
  const faceX = useSpring(useTransform(lookX, (v) => v * 5.5), { stiffness: 140, damping: 18 })
  const faceY = useSpring(useTransform(lookY, (v) => v * 3.5), { stiffness: 140, damping: 18 })
  const headTilt = useSpring(useTransform(lookX, (v) => v * 8), { stiffness: 90, damping: 14 })
  const lean = useSpring(useTransform(lookX, (v) => v * 5), { stiffness: 90, damping: 16 })
  const bodyShift = useSpring(useTransform(lookX, (v) => v * 2.5), { stiffness: 60, damping: 16 })
  const rugTilt = useSpring(useTransform(lookX, (v) => v * 3), { stiffness: 70, damping: 14 })
  const noRoll = useMotionValue(0)
  const bodyRoll = useSpring(roll ?? noRoll, { stiffness: 120, damping: 16 })

  const poseL = useSpring(0, { stiffness: 160, damping: 15, mass: 0.9 })
  const poseR = useSpring(0, { stiffness: 160, damping: 15, mass: 0.9 })
  const left = useAim()
  const right = useAim()
  const target = useRef<{ x: number; y: number } | null>(null)
  const lastPointer = useRef(0)

  const raining = wx === 'rain' || wx === 'storm'
  const showUmbrella = raining && mood !== 'hiding' && mood !== 'peeking'
  const shades = ph === 'day' && wx === 'clear' && !pointAt && ['idle', 'watching', 'wave'].includes(mood)
  const cap = ph === 'night'

  useEffect(() => {
    const [l, r] = POSES[mood]
    poseL.set(l)
    poseR.set(showUmbrella ? 3 : r)
    if (mood !== 'wave' || showUmbrella) return
    let up = true
    const timer = window.setInterval(() => {
      poseR.set(up ? 1.6 : 2)
      up = !up
    }, 320)
    return () => window.clearInterval(timer)
  }, [mood, showUmbrella, poseL, poseR])

  // Point at the control under the pointer with the arm on that side (not while the right hand holds the umbrella).
  const setLeft = left.set
  const setRight = right.set
  useEffect(() => {
    const svg = svgRef.current
    if (!pointAt || !svg || mood === 'hiding' || mood === 'peeking' || mood === 'sleepy') {
      setLeft(null)
      setRight(null)
      return
    }
    const box = svg.getBoundingClientRect()
    const px = (pointAt.x - box.left) * (320 / box.width)
    const py = (pointAt.y - box.top) * (300 / box.height)
    const side: 'left' | 'right' = px < 160 ? 'left' : 'right'
    if (side === 'right' && showUmbrella) {
      setLeft(null)
      setRight(null)
      return
    }
    const [sx, sy] = ARMS[side].shoulder
    const dist = Math.hypot(px - sx, py - sy) || 1
    const dx = (px - sx) / dist
    const dy = (py - sy) / dist
    const reach = clamp(dist * 0.45, 46, 70)
    const hx = sx + dx * reach
    const hy = sy + dy * reach + 3
    const aim = { hx, hy, ex: sx + dx * reach * 0.5 + (side === 'left' ? -7 : 7), ey: sy + dy * reach * 0.5 + 12, angle: ((Math.atan2(dy, dx) * 180) / Math.PI + (side === 'left' ? 360 : 0)) % 360 }
    if (side === 'left') {
      setLeft(aim)
      setRight(null)
    } else {
      setRight(aim)
      setLeft(null)
    }
  }, [pointAt, mood, showUmbrella, setLeft, setRight])

  const aimLook = (x: number, y: number) => {
    const svg = svgRef.current
    if (!svg) return
    const box = svg.getBoundingClientRect()
    const headX = box.left + box.width * 0.5
    const headY = box.top + box.height * 0.44
    lookX.set(clamp((x - headX) / (box.width * 0.9), -1, 1))
    lookY.set(clamp((y - headY) / (box.height * 0.9), -1, 1))
  }

  useEffect(() => {
    target.current = focusPoint
    if (focusPoint) aimLook(focusPoint.x, focusPoint.y)
  })

  useEffect(() => {
    if (reduced) return
    const onMove = (event: PointerEvent) => {
      lastPointer.current = performance.now()
      if (!target.current) aimLook(event.clientX, event.clientY)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
    // aimLook only reads refs and stable motion values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  // When nobody is moving the pointer, Di glances around on its own.
  useEffect(() => {
    if (reduced) return
    const timer = window.setInterval(() => {
      if (target.current || performance.now() - lastPointer.current < 5000) return
      const still = Math.random() < 0.25
      lookX.set(still ? 0 : Math.random() * 1.6 - 0.8)
      lookY.set(still ? 0 : Math.random() * 0.9 - 0.4)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [reduced, lookX, lookY])

  const happy = mood === 'joy'
  const sleepy = mood === 'sleepy'
  const worried = mood === 'error' || wx === 'storm'
  const covering = mood === 'hiding'
  const g = (name: string) => `url(#${uid}-${name})`

  return (
    <div ref={originRef} className={`relative ${className}`}>
      <motion.div
        key={errorTick}
        className="size-full"
        style={{ rotate: bodyRoll, originY: '85%' }}
        animate={mood === 'error' ? { x: [0, -9, 9, -7, 7, -3, 0] } : undefined}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <motion.div
          className="size-full"
          key={happy ? 'hop' : 'still'}
          animate={happy ? { y: [0, -26, 0, -11, 0], scaleY: [1, 1.04, 0.94, 1.02, 1] } : { y: 0, scaleY: 1 }}
          style={{ originY: '100%' }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <div className="di-float size-full">
            <svg ref={svgRef} viewBox="0 0 320 300" className="size-full overflow-visible" role="img" aria-label={tr('Di, linh vật của Journie', 'Di, the Journie mascot')}>
              <defs>
                <radialGradient id={`${uid}-fur`} cx="0.34" cy="0.26" r="0.9">
                  <stop offset="0" stopColor={FUR_HI} />
                  <stop offset="0.5" stopColor={FUR} />
                  <stop offset="1" stopColor={FUR_LO} />
                </radialGradient>
                <radialGradient id={`${uid}-face`} gradientUnits="userSpaceOnUse" cx="156" cy="132" r="84">
                  <stop offset="0" stopColor="#fdf6ea" />
                  <stop offset="1" stopColor={CREAM_LO} />
                </radialGradient>
                <radialGradient id={`${uid}-belly`} cx="0.5" cy="0.3" r="0.8">
                  <stop offset="0" stopColor={CREAM} />
                  <stop offset="1" stopColor={CREAM_LO} />
                </radialGradient>
                <linearGradient id={`${uid}-rug`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={RUG_HI} />
                  <stop offset="1" stopColor={RUG_LO} />
                </linearGradient>
                <linearGradient id={`${uid}-fez`} x1="0.1" y1="0" x2="0.9" y2="1">
                  <stop offset="0" stopColor={FEZ_HI} />
                  <stop offset="1" stopColor={FEZ_LO} />
                </linearGradient>
                <linearGradient id={`${uid}-cap`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={CAP_HI} />
                  <stop offset="1" stopColor={CAP_LO} />
                </linearGradient>
                <linearGradient id={`${uid}-lens`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#3a322d" />
                  <stop offset="1" stopColor="#120e0b" />
                </linearGradient>
                <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#4fb8a4" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#4fb8a4" stopOpacity="0" />
                </radialGradient>
                <filter id={`${uid}-soft`} x="-30%" y="-60%" width="160%" height="220%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
                <filter id={`${uid}-soft2`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.6" />
                </filter>
              </defs>

              {/* floor of light and contact shadow */}
              <ellipse className="di-shadow" cx="160" cy="294" rx="104" ry="10" fill={g('glow')} />
              <ellipse className="di-shadow" cx="160" cy="295" rx="74" ry="6" fill="#08201a" opacity="0.4" filter={g('soft')} />

              {trail && (
                <g>
                  <Sparkle x={26} y={246} size={7} delay={0} />
                  <Sparkle x={296} y={256} size={6} delay={1.2} />
                </g>
              )}

              {/* tail, behind everything */}
              <g className="di-tail" style={{ transformOrigin: '196px 242px', transformBox: 'view-box' }}>
                <path d="M196 242C238 248 264 216 248 190C242 182 233 189 240 196" stroke="#2a1a12" strokeOpacity="0.25" strokeWidth="12" strokeLinecap="round" fill="none" transform="translate(1 3)" />
                <path d="M196 242C238 248 264 216 248 190C242 182 233 189 240 196" stroke={FUR} strokeWidth="10" strokeLinecap="round" fill="none" />
                <path d="M198 240C236 244 260 216 247 192" stroke={FUR_HI} strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" fill="none" transform="translate(-1 -2)" />
              </g>

              <motion.g style={{ rotate: rugTilt, originX: '50%', originY: '90%', transformBox: 'view-box' }}>
                <Carpet time={time} energy={energy ?? calmEnergy} uid={uid} />
              </motion.g>

              {/* little feet resting on the rug */}
              <g>
                <ellipse cx="128" cy="262" rx="19" ry="9" fill="#1a110c" opacity="0.28" filter={g('soft2')} />
                <ellipse cx="192" cy="262" rx="19" ry="9" fill="#1a110c" opacity="0.28" filter={g('soft2')} />
                <ellipse cx="128" cy="256" rx="19" ry="11.5" fill={g('fur')} />
                <ellipse cx="192" cy="256" rx="19" ry="11.5" fill={g('fur')} />
                <ellipse cx="122" cy="258" rx="7" ry="4.4" fill={CREAM_LO} opacity="0.75" />
                <ellipse cx="198" cy="258" rx="7" ry="4.4" fill={CREAM_LO} opacity="0.75" />
              </g>

              {/* body: a small bean under a big head */}
              <motion.g style={{ x: bodyShift }}>
                <ellipse cx="160" cy="234" rx="43" ry="34" fill="#1a110c" opacity="0.22" filter={g('soft2')} transform="translate(2 6)" />
                <ellipse cx="160" cy="228" rx="42" ry="36" fill={g('fur')} />
                <ellipse cx="160" cy="236" rx="25" ry="22" fill={g('belly')} />
                <ellipse cx="146" cy="214" rx="9" ry="14" fill="#fff" opacity="0.13" transform="rotate(14 146 214)" filter={g('soft2')} />
              </motion.g>

              {/* head: the big round part of the pet */}
              <motion.g animate={{ y: covering ? 8 : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
                <motion.g style={{ rotate: headTilt, x: lean, originX: '160px', originY: '190px', transformBox: 'view-box' }}>
                  <circle cx="80" cy="110" r="24" fill={g('fur')} />
                  <circle cx="81" cy="111" r="13" fill="#d9aa95" opacity="0.75" />
                  <circle cx="240" cy="110" r="24" fill={g('fur')} />
                  <circle cx="239" cy="111" r="13" fill="#d9aa95" opacity="0.75" />
                  <circle cx="160" cy="134" r="82" fill="#1a110c" opacity="0.2" filter={g('soft2')} transform="translate(2 6)" />
                  <circle cx="160" cy="130" r="82" fill={g('fur')} />
                  <ellipse cx="128" cy="74" rx="30" ry="12" fill="#fff" opacity="0.22" transform="rotate(-20 128 74)" filter={g('soft2')} />
                  <g fill="#2a1a12" opacity="0.13" filter={g('soft2')} transform="translate(0 3)">
                    <circle cx="132" cy="124" r="37" />
                    <circle cx="188" cy="124" r="37" />
                    <ellipse cx="160" cy="150" rx="60" ry="46" />
                  </g>
                  <g fill={g('face')}>
                    <circle cx="132" cy="124" r="37" />
                    <circle cx="188" cy="124" r="37" />
                    <ellipse cx="160" cy="150" rx="60" ry="46" />
                  </g>

                  <motion.g style={{ x: faceX, y: faceY }}>
                    <motion.g style={{ x: eyeX, y: eyeY }}>
                      {!happy && !sleepy && !covering && (
                        <g className="di-eyes">
                          {[133, 187].map((cx) => (
                            <g key={cx}>
                              <ellipse cx={cx} cy="128" rx={mood === 'error' ? 10.5 : 11.5} ry={mood === 'error' ? 12 : 14} fill={EYE} />
                              <ellipse cx={cx} cy="134" rx="6.5" ry="4.4" fill="#4a3a30" opacity="0.5" />
                              <circle cx={cx + 3.8} cy="122" r="4.4" fill="#fff" opacity="0.95" />
                              <circle cx={cx - 3.2} cy="133" r="1.9" fill="#fff" opacity="0.55" />
                            </g>
                          ))}
                        </g>
                      )}
                    </motion.g>
                    {happy && (
                      <g stroke={EYE} strokeWidth="5" strokeLinecap="round" fill="none">
                        <path d="M120 133Q133 116 146 133" />
                        <path d="M174 133Q187 116 200 133" />
                      </g>
                    )}
                    {sleepy && (
                      <g stroke={EYE} strokeWidth="5" strokeLinecap="round" fill="none">
                        <path d="M120 127Q133 138 146 127" />
                        <path d="M174 127Q187 138 200 127" />
                      </g>
                    )}
                    {shades && (
                      <g>
                        <rect x="110" y="111" width="47" height="33" rx="14" fill={g('lens')} />
                        <rect x="163" y="111" width="47" height="33" rx="14" fill={g('lens')} />
                        <path d="M157 122H163" stroke="#1d1511" strokeWidth="4" />
                        <path d="M110 120L97 114M210 120L223 114" stroke="#1d1511" strokeWidth="3.4" strokeLinecap="round" />
                        <path d="M117 119L131 117M170 119L184 117" stroke="#fff" strokeOpacity="0.35" strokeWidth="2.8" strokeLinecap="round" />
                      </g>
                    )}
                    {worried && !happy && !sleepy && !shades && (
                      <g stroke={BROW} strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.85">
                        <path d="M118 106Q131 99 146 108M174 108Q189 99 202 106" />
                      </g>
                    )}
                    <ellipse cx="106" cy="154" rx="11" ry="6.5" fill="#e8988a" opacity={happy ? 0.42 : 0.24} />
                    <ellipse cx="214" cy="154" rx="11" ry="6.5" fill="#e8988a" opacity={happy ? 0.42 : 0.24} />
                    <ellipse cx="160" cy="149" rx="7.5" ry="5" fill="#5c4435" />
                    <ellipse cx="158" cy="147.5" rx="2.4" ry="1.4" fill="#fff" opacity="0.4" />
                    {happy ? (
                      <g>
                        <path d="M145 159Q160 184 175 159Z" fill="#6e2a1e" />
                        <path d="M153 170Q160 178 167 170Q160 166 153 170Z" fill="#e48b74" />
                      </g>
                    ) : mood === 'error' ? (
                      <ellipse cx="160" cy="165" rx="6" ry="7.6" fill="#6e2a1e" />
                    ) : mood === 'thinking' || covering ? (
                      <path d="M148 164Q154 159 160 164T172 164" stroke={BROW} strokeWidth="3.2" strokeLinecap="round" fill="none" />
                    ) : sleepy ? (
                      <ellipse cx="160" cy="164" rx="4.6" ry="3.4" fill="#6e2a1e" />
                    ) : (
                      <path d="M148 158Q160 171 172 158" stroke={BROW} strokeWidth="3.4" strokeLinecap="round" fill="none" />
                    )}
                  </motion.g>

                  {/* head wear: a fez by day, a nightcap after dark */}
                  {!cap ? (
                    <g>
                      <ellipse cx="160" cy="68" rx="42" ry="9" fill="#1a110c" opacity="0.3" filter={g('soft2')} />
                      <path d="M121 68L131 28Q160 19 189 28L199 68Q160 80 121 68Z" fill={g('fez')} />
                      <path d="M131 28Q160 19 189 28L190 35Q160 26 130 35Z" fill="#fff" opacity="0.14" />
                      <path d="M122 62Q160 74 198 62" stroke={GOLD} strokeWidth="3.2" strokeLinecap="round" fill="none" />
                      <ellipse cx="160" cy="27" rx="29" ry="6.5" fill={FEZ_HI} />
                      <g className="di-tassel" style={{ transformOrigin: '160px 26px', transformBox: 'view-box' }}>
                        <path d="M160 26C176 26 188 38 190 55" stroke={GOLD_LO} strokeWidth="2.6" strokeLinecap="round" fill="none" />
                        <circle cx="190" cy="59" r="6" fill={GOLD} />
                        <circle cx="188" cy="57" r="2.2" fill="#fff" opacity="0.5" />
                      </g>
                    </g>
                  ) : (
                    <g>
                      <ellipse cx="160" cy="72" rx="46" ry="9" fill="#1a110c" opacity="0.3" filter={g('soft2')} />
                      <path d="M110 74C112 32 148 8 198 22C222 29 238 25 256 46C240 56 218 56 202 51C170 42 134 52 110 74Z" fill={g('cap')} />
                      <path d="M109 76C140 56 176 54 206 60" stroke={CREAM} strokeOpacity="0.9" strokeWidth="7.5" strokeLinecap="round" fill="none" />
                      <circle cx="257" cy="46" r="9.5" fill={CREAM} />
                      <circle cx="254" cy="43" r="3" fill="#fff" opacity="0.6" />
                    </g>
                  )}
                </motion.g>
              </motion.g>

              {/* arms on top so mitts can cover the face */}
              <Arm side="left" pose={poseL} aim={left.aim} />
              <Arm side="right" pose={poseR} aim={right.aim} />

              {showUmbrella && (
                <g className="di-umbrella">
                  <path d="M252 172V40" stroke="#3a2a20" strokeWidth="4.4" strokeLinecap="round" />
                  <ellipse cx="252" cy="58" rx="58" ry="9" fill="#08201a" opacity="0.25" filter={g('soft2')} />
                  <path d="M196 52C196 -2 308 -2 308 52C298 42 289 42 280 52C271 42 262 42 252 52C243 42 233 42 224 52C215 42 206 42 196 52Z" fill={g('fez')} />
                  <path d="M196 52C206 42 215 42 224 52C233 42 243 42 252 52C262 42 271 42 280 52C289 42 298 42 308 52" stroke="#fff" strokeOpacity="0.18" strokeWidth="2" fill="none" />
                  <path d="M252 8C232 14 214 28 208 52M252 8C272 14 290 28 296 52" stroke="#fff" strokeOpacity="0.16" strokeWidth="2" fill="none" />
                  {[216, 240, 266, 290].map((x, i) => (
                    <path key={x} className="di-drop" style={{ animationDelay: `${i * 0.33}s` }} d={`M${x} 72q-3.6 6.5 0 9q3.6 -2.8 0 -9Z`} fill="#b5e3d8" opacity="0.85" />
                  ))}
                </g>
              )}

              {mood === 'error' && (
                <g key={`sweat-${errorTick}`} className="di-drop" style={{ animationIterationCount: 2 }}>
                  <path d="M228 98c-7 10-10 15-10 20a10 10 0 0 0 20 0c0-5-3-10-10-20Z" fill="#b9e6dc" opacity="0.9" />
                </g>
              )}

              {sleepy && (
                <g fontFamily="'Journie Display', serif" fontWeight="600" fill="#d9f0e8" opacity="0.9">
                  <text className="di-zzz" x="236" y="62" fontSize="28">z</text>
                  <text className="di-zzz" style={{ animationDelay: '0.9s' }} x="254" y="44" fontSize="21">z</text>
                  <text className="di-zzz" style={{ animationDelay: '1.7s' }} x="268" y="28" fontSize="15">z</text>
                </g>
              )}

              {happy && (
                <>
                  <Sparkle x={28} y={84} size={10} delay={0} />
                  <Sparkle x={294} y={74} size={12} delay={0.4} />
                  <Sparkle x={302} y={176} size={8} delay={0.8} />
                  <Sparkle x={16} y={184} size={9} delay={0.2} />
                </>
              )}
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
