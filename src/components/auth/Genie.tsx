import { useEffect, useId, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useGenie, type GenieMood } from './genie-context'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

type Point = readonly [number, number]

/**
 * Arm keyframes. Pose 0 = arms folded over the chest, 1 = hands over the eyes, 2 = both arms up.
 * One spring per arm interpolates between them, so every mood is just a number.
 */
const ARMS = {
  left: {
    shoulder: [130, 212] as Point,
    elbow: [[170, 262], [92, 182], [74, 132]] as Point[],
    hand: [[210, 250], [158, 126], [104, 50]] as Point[],
  },
  right: {
    shoulder: [230, 212] as Point,
    elbow: [[190, 266], [268, 182], [286, 132]] as Point[],
    hand: [[150, 254], [202, 126], [256, 50]] as Point[],
  },
} as const

function sample(keys: Point[], pose: number): Point {
  const p = clamp(pose, 0, 2)
  const index = p <= 1 ? 0 : 1
  const t = p <= 1 ? p : p - 1
  return [lerp(keys[index][0], keys[index + 1][0], t), lerp(keys[index][1], keys[index + 1][1], t)]
}

const POSES: Record<GenieMood, readonly [number, number]> = {
  idle: [0, 0],
  watching: [0, 0],
  hiding: [1, 1],
  peeking: [0.5, 1],
  thinking: [0, 0.55],
  error: [0.25, 0.25],
  joy: [2, 2],
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
  const cuffX = useTransform(pose, (value) => {
    const e = sample(arm.elbow, value)
    const h = sample(arm.hand, value)
    return lerp(h[0], e[0], 0.2)
  })
  const cuffY = useTransform(pose, (value) => {
    const e = sample(arm.elbow, value)
    const h = sample(arm.hand, value)
    return lerp(h[1], e[1], 0.2)
  })

  return (
    <g>
      <motion.path d={d} stroke="url(#genie-skin-flat)" strokeWidth="27" strokeLinecap="round" fill="none" />
      <motion.circle cx={cuffX} cy={cuffY} r="14.5" fill="none" stroke="#f6cb5a" strokeWidth="5" />
      <motion.g style={{ x: handX, y: handY }}>
        <circle r="19" fill="url(#genie-skin-flat)" />
        <path d="M-9 -8q9 -6 18 0" stroke="#fff" strokeOpacity=".28" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M-6 6q6 5 12 0" stroke="#1b2a86" strokeOpacity=".3" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </motion.g>
    </g>
  )
}

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <path
      className="genie-sparkle"
      style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px`, transformBox: 'view-box' }}
      d={`M${x} ${y - size}Q${x + size * 0.16} ${y - size * 0.16} ${x + size} ${y}Q${x + size * 0.16} ${y + size * 0.16} ${x} ${y + size}Q${x - size * 0.16} ${y + size * 0.16} ${x - size} ${y}Q${x - size * 0.16} ${y - size * 0.16} ${x} ${y - size}Z`}
      fill="#f6cb5a"
    />
  )
}

/**
 * Jinnie, the Journie genie. It follows the pointer, watches whichever field has focus,
 * covers its eyes while a password is typed and reacts to errors and success.
 */
export function Genie({ className = '' }: { className?: string }) {
  const { mood, focusPoint, errorTick, originRef } = useGenie()
  const { reduced } = useMotionPrefs()
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)

  const lookX = useMotionValue(0)
  const lookY = useMotionValue(0)
  const pupilX = useSpring(useTransform(lookX, (v) => v * 6.5), { stiffness: 220, damping: 20 })
  const pupilY = useSpring(useTransform(lookY, (v) => v * 7), { stiffness: 220, damping: 20 })
  const leanX = useSpring(useTransform(lookX, (v) => v * 5), { stiffness: 90, damping: 16 })
  const leanY = useSpring(useTransform(lookY, (v) => v * 2.5), { stiffness: 90, damping: 16 })

  const poseL = useSpring(0, { stiffness: 150, damping: 15, mass: 0.9 })
  const poseR = useSpring(0, { stiffness: 150, damping: 15, mass: 0.9 })

  const target = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const [left, right] = POSES[mood]
    poseL.set(left)
    poseR.set(right)
  }, [mood, poseL, poseR])

  useEffect(() => {
    target.current = focusPoint
    const svg = svgRef.current
    if (!svg || !focusPoint) return
    aim(svg, focusPoint.x, focusPoint.y)
  })

  function aim(svg: SVGSVGElement, x: number, y: number) {
    const rect = svg.getBoundingClientRect()
    const headX = rect.left + rect.width * (180 / 360)
    const headY = rect.top + rect.height * (122 / 470)
    lookX.set(clamp((x - headX) / (rect.width * 0.55), -1, 1))
    lookY.set(clamp((y - headY) / (rect.height * 0.55), -1, 1))
  }

  useEffect(() => {
    if (reduced) return
    const onMove = (event: PointerEvent) => {
      const svg = svgRef.current
      if (!svg || target.current) return
      aim(svg, event.clientX, event.clientY)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
    // aim only reads refs and stable motion values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  const covering = mood === 'hiding'
  const happy = mood === 'joy'
  const surprised = mood === 'error'
  const smiling = mood === 'idle' || mood === 'watching' || mood === 'peeking'

  const id = (name: string) => `${name}-${uid}`

  return (
    <div ref={originRef} className={`genie-float relative ${className}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 360 470"
        className="h-full w-full overflow-visible"
        role="img"
        aria-label="Jinnie, thần đèn của Journie"
      >
        <defs>
          <linearGradient id="genie-skin-flat" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="320">
            <stop offset="0" stopColor="#4a78ee" />
            <stop offset=".55" stopColor="#3c8fe3" />
            <stop offset="1" stopColor="#2fb4d4" />
          </linearGradient>
          <linearGradient id={id('smoke')} gradientUnits="userSpaceOnUse" x1="0" y1="290" x2="0" y2="410">
            <stop offset="0" stopColor="#35a6dc" />
            <stop offset=".6" stopColor="#2ec4b6" stopOpacity=".85" />
            <stop offset="1" stopColor="#a99cf5" stopOpacity=".55" />
          </linearGradient>
          <linearGradient id={id('brass')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe08a" />
            <stop offset=".5" stopColor="#f0b94b" />
            <stop offset="1" stopColor="#b7791f" />
          </linearGradient>
          <linearGradient id={id('turban')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e0467a" />
            <stop offset="1" stopColor="#9d2149" />
          </linearGradient>
          <radialGradient id={id('halo')} cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#f6cb5a" stopOpacity=".5" />
            <stop offset=".5" stopColor="#2ec4b6" stopOpacity=".16" />
            <stop offset="1" stopColor="#2ec4b6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id('flame')} cx=".5" cy=".7" r=".6">
            <stop offset="0" stopColor="#fff6dc" />
            <stop offset=".45" stopColor="#f6cb5a" />
            <stop offset="1" stopColor="#d96745" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="180" cy="190" r="190" fill={`url(#${id('halo')})`} />

        {/* smoke tail rising from the lamp spout */}
        <g className="genie-tail">
          <path
            d="M116 300C104 340 170 352 200 372c24 15 44 24 72 32-14-18-10-34-22-48-14-17-8-34-10-58Z"
            fill={`url(#${id('smoke')})`}
          />
          <path d="M142 322c10 14 30 22 52 30" stroke="#fff" strokeOpacity=".25" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M214 330c6 12 4 22 14 34" stroke="#fff" strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>

        {/* the lamp */}
        <g>
          <path d="M142 462h92l-10-14h-72Z" fill={`url(#${id('brass')})`} />
          <path
            d="M104 410c-14 2-26 12-22 26s22 12 30 0"
            stroke={`url(#${id('brass')})`}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M112 424c4 24 28 26 76 26s84-4 98-30c4-8 10-12 22-18-14 2-34 6-52 8-40 4-82 2-110-6Z"
            fill={`url(#${id('brass')})`}
          />
          <path d="M128 414c24-10 82-12 118-4-6 6-10 10-18 12-30 4-80 4-100-8Z" fill="#ffe08a" opacity=".4" />
          <path d="M168 404c0-14 8-20 18-20s18 6 18 20Z" fill={`url(#${id('brass')})`} />
          <circle cx="186" cy="380" r="6" fill="#ffe08a" />
          <circle cx="186" cy="436" r="6.5" fill="#2ec4b6" stroke="#fff6dc" strokeWidth="1.6" />
          <circle cx="258" cy="406" r="14" fill={`url(#${id('flame')})`} className="genie-flame" />
        </g>

        {/* torso */}
        <path
          d="M124 200c16-28 96-28 112 0l6 90c-22 20-102 20-124 0Z"
          fill="url(#genie-skin-flat)"
        />
        <path d="M130 206c8-12 20-18 30-20l8 106c-18-2-34-8-44-18Z" fill={`url(#${id('turban')})`} />
        <path d="M230 206c-8-12-20-18-30-20l-8 106c18-2 34-8 44-18Z" fill={`url(#${id('turban')})`} />
        <path d="M130 206c8-12 20-18 30-20M230 206c-8-12-20-18-30-20" stroke="#f6cb5a" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M112 284c36 20 100 20 136 0l6 22c-40 24-108 24-148 0Z" fill={`url(#${id('brass')})`} />
        <circle cx="180" cy="304" r="8" fill="#2ec4b6" stroke="#fff6dc" strokeWidth="1.8" />

        {/* head */}
        <motion.g style={{ x: leanX, y: leanY }}>
          <motion.g
            key={errorTick}
            animate={surprised ? { x: [0, -9, 9, -7, 7, -3, 0] } : { x: 0 }}
            transition={{ duration: 0.65, ease: 'easeInOut' }}
          >
            <circle cx="124" cy="124" r="10" fill="#3c8fe3" />
            <circle cx="236" cy="124" r="10" fill="#3c8fe3" />
            <circle cx="122" cy="141" r="4" fill="none" stroke="#f6cb5a" strokeWidth="2.4" />
            <circle cx="238" cy="141" r="4" fill="none" stroke="#f6cb5a" strokeWidth="2.4" />
            <circle cx="180" cy="122" r="58" fill="url(#genie-skin-flat)" />
            <ellipse cx="156" cy="150" rx="12" ry="7" fill="#ff8fb0" opacity=".28" />
            <ellipse cx="204" cy="150" rx="12" ry="7" fill="#ff8fb0" opacity=".28" />

            {/* eyes */}
            <g className="genie-eyes" opacity={happy ? 0 : 1}>
              {[158, 202].map((cx) => (
                <g key={cx}>
                  <ellipse cx={cx} cy="124" rx="14.5" ry="17" fill="#fff" />
                  <motion.g style={{ x: pupilX, y: pupilY }}>
                    <circle cx={cx} cy="125" r={surprised ? 5 : 8.2} fill="#17206f" />
                    <circle cx={cx + 2.6} cy="121" r="2.6" fill="#fff" />
                  </motion.g>
                </g>
              ))}
            </g>
            <g opacity={happy ? 1 : 0} stroke="#17206f" strokeWidth="4.5" strokeLinecap="round" fill="none">
              <path d="M146 128q12-16 24 0" />
              <path d="M190 128q12-16 24 0" />
            </g>

            {/* brows */}
            <g stroke="#17206f" strokeWidth="4.2" strokeLinecap="round" fill="none">
              <path d={surprised ? 'M144 99q14-10 28-3M188 96q14-7 28 3' : 'M144 102q14-8 28-2M188 100q14-6 28 2'} />
            </g>

            {/* mouth */}
            <path d="M164 152q16 14 32 0" stroke="#17206f" strokeWidth="4" strokeLinecap="round" fill="none" opacity={smiling ? 1 : 0} />
            <path d="M160 150q20 28 40 0Z" fill="#2a0f3d" opacity={happy ? 1 : 0} />
            <path d="M170 164q10 6 20 0" fill="#ff7a9d" opacity={happy ? 1 : 0} />
            <ellipse cx="180" cy="156" rx="7" ry="9" fill="#2a0f3d" opacity={surprised ? 1 : 0} />
            <path d="M166 156q14-5 28 0" stroke="#17206f" strokeWidth="4" strokeLinecap="round" fill="none" opacity={mood === 'thinking' || covering ? 1 : 0} />

            {/* mustache + goatee */}
            <path d="M180 144c-10-8-26-4-34 8 10-4 22-3 34-1 12-2 24-3 34 1-8-12-24-16-34-8Z" fill="#1b1f5c" />
            <path d="M168 162c0 18 6 30 12 40 6-10 12-22 12-40-6 6-18 6-24 0Z" fill="#1b1f5c" />

            {/* turban */}
            <path d="M120 100C116 52 146 24 180 24s64 28 60 76c-26-14-94-14-120 0Z" fill={`url(#${id('turban')})`} />
            <path d="M124 90c36-16 76-16 112 0M128 68c34-14 70-14 104 0" stroke="#f6cb5a" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".9" />
            <path d="M184 70c24-12 30-40 22-62-12 16-22 36-28 58Z" fill={`url(#${id('brass')})`} />
            <circle cx="180" cy="92" r="9.5" fill="#f6cb5a" />
            <circle cx="180" cy="92" r="5.5" fill="#c2335d" />
            <circle cx="177.8" cy="89.6" r="1.8" fill="#fff" opacity=".8" />
          </motion.g>
        </motion.g>

        {/* arms sit above the face so they can cover the eyes */}
        <Arm side="left" pose={poseL} />
        <Arm side="right" pose={poseR} />

        {surprised && (
          <g key={`drop-${errorTick}`} className="genie-drop">
            <path d="M246 76c-7 10-10 15-10 20a10 10 0 0 0 20 0c0-5-3-10-10-20Z" fill="#8fe3f2" stroke="#fff" strokeWidth="1.5" />
          </g>
        )}

        <Sparkle x={62} y={140} size={9} delay={0.2} />
        <Sparkle x={300} y={104} size={11} delay={1.1} />
        <Sparkle x={282} y={230} size={7} delay={0.7} />
        <Sparkle x={76} y={300} size={8} delay={1.7} />
      </svg>
    </div>
  )
}
