import { useEffect, useMemo } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { cssVars, seededRandom } from '../../utils/css'

/* ───────── constellation of Vietnam: real coordinates, north to south ───────── */

type Star = { name: string; lat: number; lng: number; label?: boolean; left?: boolean }

const ROUTE: Star[] = [
  { name: 'Hà Giang', lat: 22.82, lng: 104.98, label: true },
  { name: 'Sa Pa', lat: 22.34, lng: 103.84 },
  { name: 'Hà Nội', lat: 21.03, lng: 105.85, label: true, left: true },
  { name: 'Hạ Long', lat: 20.95, lng: 107.08, label: true },
  { name: 'Ninh Bình', lat: 20.25, lng: 105.97, label: true },
  { name: 'Phong Nha', lat: 17.59, lng: 106.28 },
  { name: 'Huế', lat: 16.46, lng: 107.59 },
  { name: 'Hội An', lat: 15.88, lng: 108.34, label: true },
  { name: 'Quy Nhơn', lat: 13.78, lng: 109.22 },
  { name: 'Nha Trang', lat: 12.24, lng: 109.19 },
  { name: 'Đà Lạt', lat: 11.94, lng: 108.44, label: true },
  { name: 'Sài Gòn', lat: 10.78, lng: 106.7, label: true },
  { name: 'Phú Quốc', lat: 10.29, lng: 103.98, label: true },
]

const W = 220
const H = 560
const project = ({ lat, lng }: Star) => ({
  x: ((lng - 102.6) / (110 - 102.6)) * W,
  y: ((23.6 - lat) / (23.6 - 9.8)) * H,
})

function Constellation() {
  const points = ROUTE.map(project)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')

  return (
    <svg viewBox={`-30 -20 ${W + 90} ${H + 40}`} className="h-full w-full overflow-visible" aria-hidden="true">
      <path
        d={path}
        pathLength="1"
        className="constellation-line"
        stroke="#f6cb5a"
        strokeOpacity=".55"
        strokeWidth="1.2"
        strokeDasharray="1"
        fill="none"
      />
      {ROUTE.map((star, index) => {
        const { x, y } = points[index]
        return (
          <g key={star.name}>
            <circle cx={x} cy={y} r="11" fill="#f6cb5a" opacity=".1" className="constellation-halo" style={cssVars({ '--delay': `${index * 0.35}s` })} />
            <path
              d={`M${x} ${y - 6}Q${x + 1} ${y - 1} ${x + 6} ${y}Q${x + 1} ${y + 1} ${x} ${y + 6}Q${x - 1} ${y + 1} ${x - 6} ${y}Q${x - 1} ${y - 1} ${x} ${y - 6}Z`}
              fill="#fff6dc"
              className="constellation-star"
              style={cssVars({ '--delay': `${index * 0.35}s` })}
            />
            {star.label && (
              <text
                x={star.left ? x - 12 : x + 12}
                y={y + 3.5}
                textAnchor={star.left ? 'end' : 'start'}
                fill="#fff6dc"
                fillOpacity=".62"
                fontSize="10.5"
                fontFamily="var(--font-sans)"
                letterSpacing=".04em"
                className="constellation-label"
              >
                {star.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ───────── skyline: Persian domes and minarets beside Vietnamese pagodas and karst ───────── */

const BASE = 220

function karst(x: number, w: number, h: number) {
  const y = BASE - h
  return `L${x} ${BASE}C${x + w * 0.12} ${y + h * 0.3} ${x + w * 0.2} ${y} ${x + w * 0.5} ${y}S${x + w * 0.88} ${BASE - h * 0.3} ${x + w} ${BASE}`
}

function dome(x: number, w: number, h: number, base: number) {
  const y0 = BASE - base
  const top = y0 - h
  return `L${x} ${BASE}L${x} ${y0}C${x - w * 0.12} ${y0 - h * 0.35} ${x + w * 0.16} ${top + h * 0.28} ${x + w * 0.5} ${top}C${x + w * 0.84} ${top + h * 0.28} ${x + w * 1.12} ${y0 - h * 0.35} ${x + w} ${y0}L${x + w} ${BASE}`
}

function minaret(x: number, h: number) {
  const top = BASE - h
  return `L${x} ${BASE}L${x} ${top + 18}L${x - 3} ${top + 18}L${x - 3} ${top + 12}L${x + 1} ${top + 6}L${x + 2} ${top - 12}L${x + 3} ${top + 6}L${x + 7} ${top + 12}L${x + 7} ${top + 18}L${x + 4} ${top + 18}L${x + 4} ${BASE}`
}

function pagoda(x: number, w: number, h: number) {
  const tiers = 3
  let out = `L${x} ${BASE}`
  for (let tier = 0; tier < tiers; tier += 1) {
    const inset = tier * w * 0.12
    const y = BASE - h * (0.22 + tier * 0.27)
    out += `L${x + inset} ${y + 8}Q${x + inset - 10} ${y + 6} ${x + inset - 14} ${y - 4}Q${x + inset + 6} ${y - 4} ${x + inset + 14} ${y - 12}`
  }
  const cx = x + w / 2
  out += `L${cx - 3} ${BASE - h}L${cx} ${BASE - h - 14}L${cx + 3} ${BASE - h}`
  for (let tier = tiers - 1; tier >= 0; tier -= 1) {
    const inset = tier * w * 0.12
    const y = BASE - h * (0.22 + tier * 0.27)
    out += `L${x + w - inset - 14} ${y - 12}Q${x + w - inset - 6} ${y - 4} ${x + w - inset + 14} ${y - 4}Q${x + w - inset + 10} ${y + 6} ${x + w - inset} ${y + 8}`
  }
  return `${out}L${x + w} ${BASE}`
}

function layer(width: number, build: (rand: () => number) => (x: number) => [string, number][], seed: number) {
  const rand = seededRandom(seed)
  const next = build(rand)
  let x = -20
  let d = `M-20 ${BASE}`
  while (x < width + 40) {
    const options = next(x)
    const [segment, advance] = options[Math.floor(rand() * options.length)]
    d += segment
    x += advance
  }
  return `${d}L${x} ${BASE}Z`
}

function useSkylinePaths() {
  return useMemo(
    () => ({
      far: layer(
        1800,
        (rand) => (x) => {
          const w = 120 + rand() * 120
          return [[karst(x, w, 70 + rand() * 90), w]]
        },
        7,
      ),
      mid: layer(
        1800,
        (rand) => (x) => {
          const w = 56 + rand() * 40
          return [
            [dome(x, w, 40 + rand() * 24, 34 + rand() * 26), w + 6],
            [minaret(x + 8, 96 + rand() * 50), 24],
            [pagoda(x, 74, 80 + rand() * 22), 90],
            [karst(x, 110, 62 + rand() * 30), 104],
            [dome(x, w * 1.2, 52, 30), w * 1.2 + 6],
          ]
        },
        19,
      ),
      near: layer(
        1800,
        (rand) => (x) => {
          const w = 40 + rand() * 60
          const roof = BASE - 24 - rand() * 22
          return [
            [`L${x} ${BASE}L${x} ${roof}L${x + w} ${roof}L${x + w} ${BASE}`, w],
            [dome(x, w, 18, 14 + rand() * 12), w],
          ]
        },
        33,
      ),
    }),
    [],
  )
}

/* ───────── the scene itself ───────── */

export function NightScene() {
  const { reduced } = useMotionPrefs()
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 60, damping: 18 })
  const sy = useSpring(py, { stiffness: 60, damping: 18 })

  useEffect(() => {
    if (reduced) return
    const onMove = (event: PointerEvent) => {
      px.set(event.clientX / window.innerWidth - 0.5)
      py.set(event.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [px, py, reduced])

  const farX = useTransform(sx, (v) => v * -14)
  const midX = useTransform(sx, (v) => v * -30)
  const nearX = useTransform(sx, (v) => v * -54)
  const skyX = useTransform(sx, (v) => v * 10)
  const skyY = useTransform(sy, (v) => v * 8)

  const skyline = useSkylinePaths()

  const stars = useMemo(() => {
    const rand = seededRandom(11)
    return Array.from({ length: 110 }, (_, index) => ({
      id: index,
      left: rand() * 100,
      top: rand() * 78,
      size: 1 + rand() * 2.2,
      delay: rand() * 6,
      dur: 2.6 + rand() * 4,
    }))
  }, [])

  return (
    <div className="night-sky pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="girih-drift absolute -inset-16" />
      <div className="night-aurora night-aurora-a" />
      <div className="night-aurora night-aurora-b" />

      <motion.div className="absolute inset-0" style={{ x: skyX, y: skyY }}>
        {stars.map((star) => (
          <span
            key={star.id}
            className="scene-star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              ...cssVars({ '--delay': `${star.delay}s`, '--dur': `${star.dur}s` }),
            }}
          />
        ))}
        <svg viewBox="0 0 120 120" className="night-moon absolute left-[46%] top-[5%] hidden size-24 sm:block lg:size-28">
          <defs>
            <mask id="night-crescent">
              <rect width="120" height="120" fill="#fff" />
              <circle cx="74" cy="48" r="38" fill="#000" />
            </mask>
            <radialGradient id="night-moon-glow" cx=".5" cy=".5" r=".5">
              <stop offset="0" stopColor="#f6cb5a" stopOpacity=".35" />
              <stop offset="1" stopColor="#f6cb5a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="58" fill="url(#night-moon-glow)" />
          <circle cx="52" cy="62" r="38" fill="#fdeaa8" mask="url(#night-crescent)" />
        </svg>
        <div className="night-shoot" />
      </motion.div>

      <div className="absolute inset-y-[10%] left-[1%] hidden w-[17rem] opacity-90 lg:block xl:left-[3%]">
        <Constellation />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[34vh] min-h-52">
        {(
          [
            ['far', farX, '#1d2a8c', 0.7],
            ['mid', midX, '#121a62', 1],
            ['near', nearX, '#070a28', 1],
          ] as const
        ).map(([key, x, fill, opacity]) => (
          <motion.svg
            key={key}
            viewBox={`0 0 1800 ${BASE}`}
            preserveAspectRatio="xMidYMax slice"
            className="absolute inset-x-[-4%] bottom-0 h-full w-[108%]"
            style={{ x }}
          >
            <path d={skyline[key]} fill={fill} opacity={opacity} />
          </motion.svg>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-night to-transparent" />
    </div>
  )
}
