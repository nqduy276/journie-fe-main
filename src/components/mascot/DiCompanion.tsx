import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, useVelocity } from 'motion/react'
import { X } from 'lucide-react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useTr } from '../../hooks/useTr'
import { useMascotPrefs } from '../../store/mascotStore'
import { useUiStore } from '../../store/uiStore'
import { useSky, type Weather } from '../../store/weatherStore'
import { DiAvatar } from './DiAvatar'
import type { MascotMood } from './mascot-context'

const SLEEP_AFTER_MS = 50_000
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type Action = 'indoor' | 'food' | 'cafe'
type Tip = { vi: string; en: string; cta?: { vi: string; en: string; action: Action } }

const WEATHER_TIPS: Record<'day' | 'night', Record<Weather, Tip[]>> = {
  day: {
    clear: [
      { vi: 'Nắng đẹp quá! Nhớ đội nón và mang nước nhé.', en: 'What a sunny day! Wear a hat and bring water.' },
      { vi: 'Trời nắng, điểm ngoài trời nên đi vào sáng sớm.', en: 'It is sunny: outdoor stops are best early in the morning.' },
    ],
    cloudy: [
      { vi: 'Trời mát, đi bộ phố cổ là tuyệt nhất.', en: 'Nice and cool, perfect for an old-town stroll.' },
      { vi: 'Mây nhiều nên ảnh sẽ rất mềm, chụp ngay nhé.', en: 'Soft clouds make the best light for photos.' },
    ],
    rain: [
      { vi: 'Trời mưa rồi! Mình che ô cho bạn nhé.', en: 'It is raining! Let me hold the umbrella.', cta: { vi: 'Xem nơi trong nhà', en: 'Indoor places', action: 'indoor' } },
    ],
    storm: [
      { vi: 'Có dông đó, đừng ở điểm ngoài trời. Mình tìm chỗ trú nhé.', en: 'Thunderstorm! Stay off outdoor stops, I will find shelter.', cta: { vi: 'Xem nơi trong nhà', en: 'Indoor places', action: 'indoor' } },
    ],
  },
  night: {
    clear: [
      { vi: 'Đêm đẹp trời, nhìn sao rồi mai đi tiếp nhé.', en: 'A clear night. Stargaze, then carry on tomorrow.' },
      { vi: 'Chợ đêm và phố ẩm thực lên đèn đẹp lắm.', en: 'Night markets and food streets glow after dark.' },
    ],
    cloudy: [{ vi: 'Đêm nhiều mây, ngủ sớm để mai có sức nhé.', en: 'Cloudy night. Sleep early to be fresh tomorrow.' }],
    rain: [{ vi: 'Mưa đêm rồi. Ở trong nhà ăn chè nóng nhé?', en: 'Rainy night. Shall we stay in with something warm?', cta: { vi: 'Xem quán cà phê', en: 'Cafés nearby', action: 'cafe' } }],
    storm: [{ vi: 'Đêm có dông, mình ở yên trong nhà nhé.', en: 'Stormy night, let us stay put indoors.' }],
  },
}

const ROUTE_TIPS: { match: RegExp; tip: Tip }[] = [
  { match: /^\/app\/plan/, tip: { vi: 'Kể mình nghe chuyến đi mơ ước, cứ viết tự nhiên thôi.', en: 'Tell me about your dream trip, just write naturally.' } },
  { match: /^\/app\/discover/, tip: { vi: 'Thả tim vào nơi bạn thích, mình sẽ ưu tiên khi lập lịch.', en: 'Heart what you like and I will favour it when planning.' } },
  { match: /^\/app\/trips\/[^/]+\/live/, tip: { vi: 'Mình đang theo dõi thời tiết và đường đi cho bạn.', en: 'I am watching the weather and the road for you.' } },
  { match: /^\/app\/profile/, tip: { vi: 'Chỉ cần vài ý chính là đủ rồi, còn lại mình đoán.', en: 'A few key ideas are enough, I will guess the rest.' } },
]

/** A nudge that fits the hour of the day, shown at most once per slot per visit. */
function hourTip(now: Date): { slot: string; tip: Tip } | null {
  const m = now.getHours() * 60 + now.getMinutes()
  if (m >= 5 * 60 + 30 && m < 9 * 60) return { slot: 'breakfast', tip: { vi: 'Chào buổi sáng! Ăn sáng một tô phở cho ấm bụng nhé?', en: 'Good morning! A bowl of pho for breakfast?', cta: { vi: 'Gợi ý món ăn', en: 'Food ideas', action: 'food' } } }
  if (m >= 11 * 60 + 30 && m < 13 * 60 + 15) return { slot: 'lunch', tip: { vi: 'Đến giờ ăn trưa rồi, bụng mình đang kêu đây này!', en: 'It is lunchtime and my tummy is rumbling!', cta: { vi: 'Gợi ý món ăn', en: 'Food ideas', action: 'food' } } }
  if (m >= 17 * 60 + 30 && m < 19 * 60 + 30) return { slot: 'dinner', tip: { vi: 'Chiều tối rồi, đi ăn tối rồi dạo chợ đêm nhé?', en: 'Evening already: dinner, then the night market?', cta: { vi: 'Gợi ý món ăn', en: 'Food ideas', action: 'food' } } }
  if (m >= 23 * 60 || m < 5 * 60) return { slot: 'late', tip: { vi: 'Khuya rồi, nghỉ ngơi để mai đi tiếp bạn nhé.', en: 'It is late. Rest up and carry on tomorrow.' } }
  return null
}

function readSize() {
  return window.innerWidth >= 640 ? 92 : 76
}

/**
 * Di living in the app: a monkey on a flying carpet that trails the pointer, blinks and looks at what
 * you look at, dozes off when nothing happens, cheers when poked and passes on tips that fit the
 * weather, the hour and the page. It can wait in the corner instead, or be sent to rest.
 */
export function DiCompanion() {
  const { tr } = useTr()
  const sky = useSky()
  const location = useLocation()
  const navigate = useNavigate()
  const { canPointerFx } = useMotionPrefs()
  const hidden = useMascotPrefs((state) => state.hidden)
  const follow = useMascotPrefs((state) => state.follow)
  const setHidden = useMascotPrefs((state) => state.setHidden)

  const [mood, setMood] = useState<MascotMood>('wave')
  const [tip, setTip] = useState<Tip | null>(null)
  const [side, setSide] = useState({ right: true, below: false })
  const [size, setSize] = useState(readSize)

  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const sx = useSpring(x, { stiffness: 70, damping: 13, mass: 0.9 })
  const sy = useSpring(y, { stiffness: 70, damping: 13, mass: 0.9 })
  const vx = useVelocity(sx)
  const vy = useVelocity(sy)
  const roll = useTransform(vx, (v) => clamp(v / 50, -16, 16))
  const energy = useTransform([vx, vy], ([a, b]: number[]) => clamp(Math.hypot(a, b) / 800, 0, 1))

  const flying = follow && canPointerFx
  const parked = useRef(false)
  const asleep = useRef(false)
  const sleepTimer = useRef(0)
  const bubbleTimer = useRef(0)
  const moodTimer = useRef(0)
  const tipIndex = useRef(0)
  const lastWeather = useRef<string | null>(null)
  const seenSlots = useRef(new Set<string>())

  const corner = useCallback(() => {
    const s = readSize()
    const lg = window.innerWidth >= 1024
    return { x: window.innerWidth - s - (lg ? 28 : 8), y: window.innerHeight - s - (lg ? 28 : 96) }
  }, [])

  const goHome = useCallback(() => {
    const c = corner()
    x.set(c.x)
    y.set(c.y)
  }, [corner, x, y])

  const say = useCallback(
    (next: Tip, ms = 7500) => {
      const bubbleRight = x.get() + 250 > window.innerWidth
      setSide({ right: bubbleRight, below: y.get() < 150 })
      setTip(next)
      window.clearTimeout(bubbleTimer.current)
      // tips with a button wait in the corner so the button holds still while you reach for it
      if (next.cta) {
        parked.current = true
        goHome()
        bubbleTimer.current = window.setTimeout(() => {
          setTip(null)
          parked.current = false
        }, 14_000)
      } else {
        bubbleTimer.current = window.setTimeout(() => setTip(null), ms)
      }
    },
    [goHome, x, y],
  )

  const feel = useCallback((next: MascotMood, ms: number) => {
    setMood(next)
    window.clearTimeout(moodTimer.current)
    moodTimer.current = window.setTimeout(() => setMood('idle'), ms)
  }, [])

  // Starting position and resizing.
  useEffect(() => {
    const place = () => {
      setSize(readSize())
      if (!flying || parked.current) goHome()
    }
    if (x.get() < -100) {
      const c = corner()
      x.jump(c.x)
      y.jump(c.y)
    }
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [corner, flying, goHome, x, y])

  // Trail the pointer, a little below and to the right of it, flipping sides near the screen edge.
  useEffect(() => {
    if (!flying || hidden) {
      goHome()
      return
    }
    const onMove = (event: PointerEvent) => {
      if (parked.current) return
      const s = readSize()
      const w = window.innerWidth
      const h = window.innerHeight
      let tx = event.clientX + 26
      let ty = event.clientY + 22
      if (tx + s > w - 6) tx = event.clientX - s - 18
      if (ty + s * 0.95 > h - 6) ty = event.clientY - s - 14
      x.set(clamp(tx, 6, w - s - 6))
      y.set(clamp(ty, 6, h - s - 6))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [flying, hidden, goHome, x, y])

  // Greeting.
  useEffect(() => {
    if (hidden) return
    const hello = window.setTimeout(() => say({ vi: 'Chào bạn, mình là Di! Mình sẽ đi theo và nhắc bạn mọi thứ nhé.', en: 'Hi, I am Di! I will tag along and keep you posted.' }, 6000), 1400)
    const settle = window.setTimeout(() => setMood('idle'), 2800)
    return () => {
      window.clearTimeout(hello)
      window.clearTimeout(settle)
    }
  }, [hidden, say])

  // Notices when the weather changes.
  useEffect(() => {
    if (hidden) return
    const previous = lastWeather.current
    lastWeather.current = sky.key
    if (previous === null || previous === sky.key) return
    const tips = WEATHER_TIPS[sky.phase][sky.weather]
    say(tips[tipIndex.current % tips.length], 8000)
    feel(sky.weather === 'storm' ? 'error' : 'wave', 1800)
  }, [sky.key, sky.phase, sky.weather, hidden, say, feel])

  // Tips that fit the hour, once each, and one about the page you land on.
  useEffect(() => {
    if (hidden) return
    const timer = window.setTimeout(() => {
      const hour = hourTip(new Date())
      if (hour && !seenSlots.current.has(hour.slot)) {
        seenSlots.current.add(hour.slot)
        say(hour.tip, 9000)
        return
      }
      const hit = ROUTE_TIPS.find((entry) => entry.match.test(location.pathname))
      if (hit) say(hit.tip, 6000)
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [location.pathname, hidden, say])

  // On the first visit in the rain Di already has its umbrella up, so say so.
  useEffect(() => {
    if (hidden || lastWeather.current !== null) return
    lastWeather.current = sky.key
  }, [hidden, sky.key])

  // Falls asleep after a while, wakes on any activity.
  useEffect(() => {
    if (hidden) return
    const arm = () => {
      window.clearTimeout(sleepTimer.current)
      sleepTimer.current = window.setTimeout(() => {
        asleep.current = true
        setTip(null)
        setMood('sleepy')
      }, SLEEP_AFTER_MS)
    }
    const onActivity = () => {
      if (asleep.current) {
        asleep.current = false
        feel('wave', 1400)
      }
      arm()
    }
    arm()
    const events = ['pointermove', 'keydown', 'pointerdown', 'scroll'] as const
    events.forEach((name) => window.addEventListener(name, onActivity, { passive: true }))
    return () => {
      window.clearTimeout(sleepTimer.current)
      events.forEach((name) => window.removeEventListener(name, onActivity))
    }
  }, [hidden, feel])

  useEffect(
    () => () => {
      window.clearTimeout(bubbleTimer.current)
      window.clearTimeout(moodTimer.current)
    },
    [],
  )

  const poke = () => {
    const pool = [...WEATHER_TIPS[sky.phase][sky.weather], ...ROUTE_TIPS.filter((entry) => entry.match.test(location.pathname)).map((entry) => entry.tip)]
    tipIndex.current += 1
    say(pool[tipIndex.current % pool.length])
    feel('joy', 1100)
  }

  const runAction = (action: Action) => {
    const { setDiscover } = useUiStore.getState()
    if (action === 'indoor') setDiscover({ indoorOnly: true })
    if (action === 'food') setDiscover({ categories: ['food'] })
    if (action === 'cafe') setDiscover({ categories: ['cafe'], indoorOnly: true })
    setTip(null)
    parked.current = false
    navigate('/app/discover')
    feel('joy', 1000)
  }

  if (hidden) return null

  return (
    <motion.div className="pointer-events-none fixed left-0 top-0 z-40" style={{ x: sx, y: sy, width: size }} aria-live="polite">
      <AnimatePresence>
        {tip && (
          <motion.div
            key={tip.vi}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            style={{ position: 'absolute' }}
            className={`di-bubble w-[12.5rem] !px-3 !py-2 !text-[0.8rem] !leading-snug sm:w-[15rem] sm:!px-[0.95rem] sm:!py-[0.65rem] sm:!text-[0.92rem] ${side.below ? 'top-[calc(100%-0.4rem)]' : 'bottom-[calc(100%-0.6rem)]'} ${side.right ? 'right-1 origin-bottom-right' : 'left-1 origin-bottom-left'} ${tip.cta ? 'pointer-events-auto' : ''}`}
            data-tail={side.below ? 'none' : side.right ? 'bottom-right' : 'bottom-left'}
            role="status"
          >
            <button type="button" onClick={() => { setTip(null); parked.current = false }} className="pointer-events-auto absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border border-[#173f35]/25 bg-[#f7f2e8] text-[#173f35]/70 hover:text-terracotta" aria-label={tr('Đóng gợi ý', 'Close tip')}>
              <X size={12} />
            </button>
            {tr(tip.vi, tip.en)}
            {tip.cta && (
              <button type="button" onClick={() => runAction(tip.cta!.action)} className="pointer-events-auto mt-2 block border border-terracotta/60 bg-terracotta/10 px-2.5 py-1 font-sans text-[0.74rem] font-semibold not-italic text-terracotta transition-colors hover:bg-terracotta hover:text-white">
                {tr(tip.cta.vi, tip.cta.en)}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 13, delay: 0.4 }} className="group relative" style={{ originX: 0.5, originY: 1 }}>
        {flying ? (
          <div className="pointer-events-none">
            <DiAvatar mood={mood} className="aspect-[320/300] w-full" energy={energy} roll={roll} />
          </div>
        ) : (
          <>
            <button type="button" onClick={poke} className="pointer-events-auto block w-full cursor-pointer outline-offset-4 transition-transform duration-300 hover:scale-110 active:scale-95" aria-label={tr('Hỏi Di một gợi ý', 'Ask Di for a tip')}>
              <DiAvatar mood={mood} className="aspect-[320/300] w-full" energy={energy} roll={roll} />
            </button>
            <button type="button" onClick={() => setHidden(true)} className="pointer-events-auto absolute -left-2 top-0 hidden size-6 place-items-center rounded-full border border-[#173f35]/25 bg-[#f7f2e8]/90 text-[#173f35]/65 transition-colors hover:text-terracotta group-hover:grid group-focus-within:grid" aria-label={tr('Cho Di nghỉ', 'Let Di rest')} title={tr('Cho Di nghỉ', 'Let Di rest')}>
              <X size={12} />
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
