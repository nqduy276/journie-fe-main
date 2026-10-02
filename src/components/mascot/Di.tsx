import { useEffect, useId, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useSky, type Phase, type Weather } from '../../store/weatherStore'
import { useMascot, type MascotMood } from './mascot-context'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/* A short, muted palette: taupe fur, cream face, one deep green rug with a gold edge, one terracotta hat. */
const FUR_HI = '#b4927a'
const FUR = '#8a6a54'
const FUR_LO = '#5c4435'
const CREAM = '#f3e6d2'
const CREAM_LO = '#e2cdb0'
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
 * Arm keyframes. Pose 0 = hands on knees, 1 = hands over the eyes, 2 = arm up (wave, cheer),
 * 3 = holding an umbrella. One spring per arm interpolates between them, so every mood is a number.
 * A fourth state, pointing, blends toward a hand position aimed at a control on the page.
 */
const ARMS = {
  left: { shoulder: [126, 194] as Point, elbow: [[92, 216], [96, 172], [68, 168], [92, 216]] as Point[], hand: [[106, 244], [141, 122], [72, 108], [106, 244]] as Point[] },
  right: { shoulder: [194, 194] as Point, elbow: [[228, 216], [224, 172], [252, 168], [232, 190]] as Point[], hand: [[214, 244], [179, 122], [248, 108], [230, 140]] as Point[] },
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
      <motion.path d={d} stroke="#2a1a12" strokeOpacity="0.22" strokeWidth="19" strokeLinecap="round" fill="none" transform="translate(1.5 3.5)" />
      <motion.path d={d} stroke={FUR} strokeWidth="17" strokeLinecap="round" fill="none" />
      <motion.path d={d} stroke={FUR_HI} strokeOpacity="0.32" strokeWidth="5" strokeLinecap="round" fill="none" transform="translate(-2.5 -2.5)" />
      <motion.g style={{ x: handX, y: handY }}>
        <circle r="12.5" fill="#2a1a12" opacity="0.2" cx="1.5" cy="3" />
        <circle r="12" fill={FUR} />
        <circle r="5.5" cx="-3.5" cy="-3.5" fill={FUR_HI} opacity="0.5" />
        <motion.g style={{ rotate: aim.angle, scale: finger, originX: 0, originY: 0 }}>
          <rect x="5" y="-3.8" width="15" height="7.6" rx="3.8" fill={FUR} />
          <rect x="7" y="-2.6" width="11" height="2.6" rx="1.3" fill={FUR_HI} opacity="0.5" />
        </motion.g>
      </motion.g>
    </g>
  )
}

/* ───────── the flying carpet: a ribbon that ripples, drawn fresh every frame ───────── */

const RUG_L = 34
const RUG_R = 286
const RUG_MID = (RUG_L + RUG_R) / 2
const RUG_HALF = (RUG_R - RUG_L) / 2
const STEPS = 30

function rugEdge(x: number, t: number, base: number, amp: number, phase: number) {
  const u = (x - RUG_MID) / RUG_HALF
  const wave = Math.sin(u * 3.1 + t * 2 + phase) * amp + Math.sin(u * 6.3 - t * 1.3 + phase) * amp * 0.3
  const curl = Math.abs(u) ** 3 * 14
  return base + wave - curl
}

const fmt = (n: number) => n.toFixed(1)

function buildRug(t: number, energy: number) {
  const amp = 3.4 + energy * 5
  const top: Point[] = []
  const bot: Point[] = []
  for (let i = 0; i <= STEPS; i += 1) {
    const x = lerp(RUG_L, RUG_R, i / STEPS)
    top.push([x, rugEdge(x, t, 254, amp, 0)])
    bot.push([x, rugEdge(x, t, 283, amp, 0.7)])
  }
  const at = (i: number, k: number): Point => [top[i][0], lerp(top[i][1], bot[i][1], k)]
  const poly = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p[0])} ${fmt(p[1])}`).join('')
  const body = `${poly(top)}${[...bot].reverse().map((p) => `L${fmt(p[0])} ${fmt(p[1])}`).join('')}Z`
  const trim = poly(top.map((_, i) => at(i, 0.26)))
  let dots = ''
  for (const u of [-0.5, -0.25, 0, 0.25, 0.5]) {
    const i = Math.round(((u * RUG_HALF + RUG_HALF) / (RUG_HALF * 2)) * STEPS)
    const c = at(i, 0.62)
    const slope = (at(Math.min(STEPS, i + 1), 0.62)[1] - at(Math.max(0, i - 1), 0.62)[1]) / 2
    const r = 3.6
    dots += `M${fmt(c[0] - r)} ${fmt(c[1] - slope)}L${fmt(c[0])} ${fmt(c[1] - r - slope)}L${fmt(c[0] + r)} ${fmt(c[1] + slope)}L${fmt(c[0])} ${fmt(c[1] + r + slope)}Z`
  }
  const tassel = (side: -1 | 1) => {
    const i = side < 0 ? 0 : STEPS
    let d = ''
    for (let k = 0; k <= 3; k += 1) {
      const p = at(i, 0.14 + k * 0.24)
      const sway = Math.sin(t * 2.6 + k * 0.9) * 1.8
      d += `M${fmt(p[0])} ${fmt(p[1])}Q${fmt(p[0] + side * 7)} ${fmt(p[1] + 0.8 + sway)} ${fmt(p[0] + side * 13)} ${fmt(p[1] + 2.4 + sway)}`
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
 * Di: a small monkey on a flying carpet, drawn as a soft toy: no outlines, a few muted colours, gradients and
 * shadows for depth. Looks at the pointer, points at the control under it, watches the field you are typing in,
 * covers its eyes for passwords, shakes its head on errors and dresses for the sky (fez or nightcap, sunglasses,
 * umbrella). The umbrella stays up whatever the mood while it rains.
 */
export function Di({ className = '', phase, weather, trail = true, energy, roll }: Props) {
  const { mood, focusPoint, pointAt = null, errorTick, originRef } = useMascot()
  const sky = useSky()
  const ph = phase ?? sky.phase
  const wx = weather ?? sky.weather
  const { reduced } = useMotionPrefs()
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
    const reach = clamp(dist * 0.5, 62, 92)
    const hx = sx + dx * reach
    const hy = sy + dy * reach + 4
    const aim = { hx, hy, ex: sx + dx * reach * 0.5 + (side === 'left' ? -8 : 8), ey: sy + dy * reach * 0.5 + 14, angle: ((Math.atan2(dy, dx) * 180) / Math.PI + (side === 'left' ? 360 : 0)) % 360 }
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
    const headY = box.top + box.height * 0.38
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
            <svg ref={svgRef} viewBox="0 0 320 300" className="size-full overflow-visible" role="img" aria-label="Di, linh vật của Journie">
              <defs>
                <radialGradient id={`${uid}-fur`} cx="0.34" cy="0.28" r="0.85">
                  <stop offset="0" stopColor={FUR_HI} />
                  <stop offset="0.55" stopColor={FUR} />
                  <stop offset="1" stopColor={FUR_LO} />
                </radialGradient>
                <radialGradient id={`${uid}-face`} cx="0.5" cy="0.38" r="0.7">
                  <stop offset="0" stopColor="#fbf2e3" />
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
                  <stop offset="0" stopColor="#4fb8a4" stopOpacity="0.38" />
                  <stop offset="1" stopColor="#4fb8a4" stopOpacity="0" />
                </radialGradient>
                <filter id={`${uid}-soft`} x="-30%" y="-60%" width="160%" height="220%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
                <filter id={`${uid}-soft2`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.4" />
                </filter>
              </defs>

              {/* floor of light and contact shadow */}
              <ellipse className="di-shadow" cx="160" cy="292" rx="118" ry="12" fill={g('glow')} />
              <ellipse className="di-shadow" cx="160" cy="294" rx="84" ry="7" fill="#08201a" opacity="0.4" filter={g('soft')} />

              {trail && (
                <g>
                  <Sparkle x={14} y={236} size={7} delay={0} />
                  <Sparkle x={306} y={252} size={6} delay={1.2} />
                </g>
              )}

              {/* tail, behind everything */}
              <g className="di-tail" style={{ transformOrigin: '204px 234px', transformBox: 'view-box' }}>
                <path d="M204 238C250 240 268 200 244 176C235 168 227 178 236 185" stroke="#2a1a12" strokeOpacity="0.25" strokeWidth="14" strokeLinecap="round" fill="none" transform="translate(1 3)" />
                <path d="M204 238C250 240 268 200 244 176C235 168 227 178 236 185" stroke={FUR} strokeWidth="11" strokeLinecap="round" fill="none" />
                <path d="M204 236C248 238 264 202 244 178" stroke={FUR_HI} strokeOpacity="0.45" strokeWidth="3.4" strokeLinecap="round" fill="none" transform="translate(-1 -2)" />
              </g>

              <motion.g style={{ rotate: rugTilt, originX: '50%', originY: '88%', transformBox: 'view-box' }}>
                <Carpet time={time} energy={energy ?? calmEnergy} uid={uid} />
              </motion.g>

              {/* feet resting on the rug */}
              <g>
                <ellipse cx="116" cy="256" rx="22" ry="12" fill="#1a110c" opacity="0.28" filter={g('soft2')} />
                <ellipse cx="204" cy="256" rx="22" ry="12" fill="#1a110c" opacity="0.28" filter={g('soft2')} />
                <ellipse cx="116" cy="251" rx="21" ry="12.5" fill={g('fur')} />
                <ellipse cx="204" cy="251" rx="21" ry="12.5" fill={g('fur')} />
                <ellipse cx="109" cy="253" rx="8" ry="5" fill={CREAM_LO} opacity="0.7" />
                <ellipse cx="211" cy="253" rx="8" ry="5" fill={CREAM_LO} opacity="0.7" />
              </g>

              {/* body */}
              <motion.g style={{ x: bodyShift }}>
                <ellipse cx="160" cy="214" rx="46" ry="42" fill="#1a110c" opacity="0.22" filter={g('soft2')} transform="translate(2 6)" />
                <ellipse cx="160" cy="208" rx="45" ry="46" fill={g('fur')} />
                <ellipse cx="160" cy="216" rx="27" ry="30" fill={g('belly')} />
                <ellipse cx="146" cy="190" rx="12" ry="22" fill="#fff" opacity="0.13" transform="rotate(14 146 190)" filter={g('soft2')} />
              </motion.g>

              {/* head */}
              <motion.g style={{ rotate: headTilt, x: lean, originX: '160px', originY: '150px', transformBox: 'view-box' }}>
                <circle cx="96" cy="118" r="22" fill={g('fur')} />
                <circle cx="96" cy="119" r="12" fill="#d3a28d" opacity="0.7" />
                <circle cx="224" cy="118" r="22" fill={g('fur')} />
                <circle cx="224" cy="119" r="12" fill="#d3a28d" opacity="0.7" />
                <circle cx="160" cy="114" r="64" fill="#1a110c" opacity="0.2" filter={g('soft2')} transform="translate(2 5)" />
                <circle cx="160" cy="112" r="64" fill={g('fur')} />
                <ellipse cx="138" cy="70" rx="26" ry="11" fill="#fff" opacity="0.2" transform="rotate(-18 138 70)" filter={g('soft2')} />
                <path d="M160 100C150 84 110 88 110 120C110 148 138 172 160 172C182 172 210 148 210 120C210 88 170 84 160 100Z" fill="#2a1a12" opacity="0.14" filter={g('soft2')} transform="translate(0 2)" />
                <path d="M160 100C150 84 110 88 110 120C110 148 138 172 160 172C182 172 210 148 210 120C210 88 170 84 160 100Z" fill={g('face')} />

                <motion.g style={{ x: faceX, y: faceY }}>
                  <motion.g style={{ x: eyeX, y: eyeY }}>
                    {!happy && !sleepy && (
                      <g className="di-eyes">
                        {[139, 181].map((cx) => (
                          <g key={cx}>
                            <ellipse cx={cx} cy="119" rx={mood === 'error' ? 9.5 : 10.5} ry={mood === 'error' ? 11 : 12.5} fill={EYE} />
                            <ellipse cx={cx} cy="125" rx="6" ry="4" fill="#4a3a30" opacity="0.5" />
                            <circle cx={cx + 3.4} cy="114" r="3.8" fill="#fff" opacity="0.95" />
                            <circle cx={cx - 3} cy="124" r="1.7" fill="#fff" opacity="0.55" />
                          </g>
                        ))}
                      </g>
                    )}
                  </motion.g>
                  {happy && (
                    <g stroke={EYE} strokeWidth="4.6" strokeLinecap="round" fill="none">
                      <path d="M127 123Q139 108 151 123" />
                      <path d="M169 123Q181 108 193 123" />
                    </g>
                  )}
                  {sleepy && (
                    <g stroke={EYE} strokeWidth="4.6" strokeLinecap="round" fill="none">
                      <path d="M127 119Q139 128 151 119" />
                      <path d="M169 119Q181 128 193 119" />
                    </g>
                  )}
                  {shades && (
                    <g>
                      <rect x="121" y="105" width="38" height="28" rx="13" fill={g('lens')} />
                      <rect x="161" y="105" width="38" height="28" rx="13" fill={g('lens')} />
                      <path d="M159 113H161" stroke="#1d1511" strokeWidth="4" />
                      <path d="M121 111L109 106M199 111L211 106" stroke="#1d1511" strokeWidth="3.4" strokeLinecap="round" />
                      <path d="M127 112L139 110M167 112L179 110" stroke="#fff" strokeOpacity="0.35" strokeWidth="2.6" strokeLinecap="round" />
                    </g>
                  )}
                  {worried && !happy && !sleepy && !shades && (
                    <g stroke={BROW} strokeWidth="3.2" strokeLinecap="round" fill="none" opacity="0.85">
                      <path d="M127 100Q138 94 151 102M169 102Q182 94 193 100" />
                    </g>
                  )}
                  <ellipse cx="122" cy="146" rx="10" ry="6" fill="#e8988a" opacity={happy ? 0.38 : 0.2} />
                  <ellipse cx="198" cy="146" rx="10" ry="6" fill="#e8988a" opacity={happy ? 0.38 : 0.2} />
                  <ellipse cx="160" cy="141" rx="7.5" ry="5" fill="#5c4435" />
                  <ellipse cx="158" cy="139.5" rx="2.4" ry="1.4" fill="#fff" opacity="0.4" />
                  {happy ? (
                    <g>
                      <path d="M144 152Q160 176 176 152Z" fill="#6e2a1e" />
                      <path d="M152 162Q160 170 168 162Q160 158 152 162Z" fill="#e48b74" />
                    </g>
                  ) : mood === 'error' ? (
                    <ellipse cx="160" cy="158" rx="6" ry="7.6" fill="#6e2a1e" />
                  ) : mood === 'thinking' || covering ? (
                    <path d="M148 157Q154 152 160 157T172 157" stroke={BROW} strokeWidth="3.2" strokeLinecap="round" fill="none" />
                  ) : sleepy ? (
                    <ellipse cx="160" cy="157" rx="4.6" ry="3.4" fill="#6e2a1e" />
                  ) : (
                    <path d="M147 151Q160 164 173 151" stroke={BROW} strokeWidth="3.4" strokeLinecap="round" fill="none" />
                  )}
                </motion.g>

                {/* head wear: a fez by day, a nightcap after dark */}
                {!cap ? (
                  <g>
                    <ellipse cx="160" cy="78" rx="44" ry="9" fill="#1a110c" opacity="0.3" filter={g('soft2')} />
                    <path d="M120 78L130 40Q160 31 190 40L200 78Q160 89 120 78Z" fill={g('fez')} />
                    <path d="M130 40Q160 31 190 40L191 47Q160 38 129 47Z" fill="#fff" opacity="0.14" />
                    <path d="M121 72Q160 83 199 72" stroke={GOLD} strokeWidth="3.2" strokeLinecap="round" fill="none" />
                    <ellipse cx="160" cy="38" rx="30" ry="6.5" fill={FEZ_HI} />
                    <g className="di-tassel" style={{ transformOrigin: '160px 36px', transformBox: 'view-box' }}>
                      <path d="M160 36C175 36 186 47 188 63" stroke={GOLD_LO} strokeWidth="2.6" strokeLinecap="round" fill="none" />
                      <circle cx="188" cy="67" r="6" fill={GOLD} />
                      <circle cx="186" cy="65" r="2.2" fill="#fff" opacity="0.5" />
                    </g>
                  </g>
                ) : (
                  <g>
                    <ellipse cx="160" cy="80" rx="46" ry="9" fill="#1a110c" opacity="0.3" filter={g('soft2')} />
                    <path d="M108 82C112 46 150 24 202 42C222 49 238 44 252 62C236 72 214 72 200 67C170 57 134 63 108 82Z" fill={g('cap')} />
                    <path d="M107 84C140 64 176 64 204 71" stroke={CREAM} strokeOpacity="0.9" strokeWidth="7" strokeLinecap="round" fill="none" />
                    <circle cx="253" cy="62" r="9" fill={CREAM} />
                    <circle cx="250" cy="59" r="3" fill="#fff" opacity="0.6" />
                  </g>
                )}
              </motion.g>

              {/* arms on top so hands can cover the face */}
              <Arm side="left" pose={poseL} aim={left.aim} />
              <Arm side="right" pose={poseR} aim={right.aim} />

              {showUmbrella && (
                <g className="di-umbrella">
                  <path d="M230 142V30" stroke="#3a2a20" strokeWidth="4.4" strokeLinecap="round" />
                  <ellipse cx="231" cy="52" rx="62" ry="10" fill="#08201a" opacity="0.25" filter={g('soft2')} />
                  <path d="M168 46C168 -6 294 -6 294 46C283 36 273 36 262 46C251 36 241 36 231 46C221 36 211 36 200 46C190 36 180 36 168 46Z" fill={g('fez')} />
                  <path d="M168 46C180 36 190 36 200 46C211 36 221 36 231 46C241 36 251 36 262 46C273 36 283 36 294 46" stroke="#fff" strokeOpacity="0.18" strokeWidth="2" fill="none" />
                  <path d="M231 4C209 10 191 25 185 46M231 4C253 10 271 25 277 46" stroke="#fff" strokeOpacity="0.16" strokeWidth="2" fill="none" />
                  {[196, 224, 252, 276].map((x, i) => (
                    <path key={x} className="di-drop" style={{ animationDelay: `${i * 0.33}s` }} d={`M${x} 68q-3.6 6.5 0 9q3.6 -2.8 0 -9Z`} fill="#b5e3d8" opacity="0.85" />
                  ))}
                </g>
              )}

              {mood === 'error' && (
                <g key={`sweat-${errorTick}`} className="di-drop" style={{ animationIterationCount: 2 }}>
                  <path d="M214 92c-7 10-10 15-10 20a10 10 0 0 0 20 0c0-5-3-10-10-20Z" fill="#b9e6dc" opacity="0.9" />
                </g>
              )}

              {sleepy && (
                <g fontFamily="'Journie Display', serif" fontWeight="600" fill="#d9f0e8" opacity="0.9">
                  <text className="di-zzz" x="214" y="56" fontSize="28">z</text>
                  <text className="di-zzz" style={{ animationDelay: '0.9s' }} x="232" y="40" fontSize="21">z</text>
                  <text className="di-zzz" style={{ animationDelay: '1.7s' }} x="246" y="26" fontSize="15">z</text>
                </g>
              )}

              {happy && (
                <>
                  <Sparkle x={30} y={84} size={10} delay={0} />
                  <Sparkle x={292} y={70} size={12} delay={0.4} />
                  <Sparkle x={304} y={176} size={8} delay={0.8} />
                  <Sparkle x={14} y={180} size={9} delay={0.2} />
                </>
              )}
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
