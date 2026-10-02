import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { CHEER_EVENT } from '../../lib/cheer'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useTr } from '../../hooks/useTr'
import { useMascotPrefs } from '../../store/mascotStore'
import { applyDiAction, type DiAction } from '../../lib/diActions'
import { useSky, type Weather } from '../../store/weatherStore'
import { DiAvatar } from './DiAvatar'
import type { FocusPoint, MascotMood } from './mascot-context'

const SLEEP_AFTER_MS = 50_000
const POINT_AFTER_MS = 420
const INTERACTIVE = 'a[href], button:not(:disabled), [role="button"], [role="tab"], [role="radio"], [role="switch"], input:not([type="hidden"]), select, textarea, summary'

type Action = DiAction
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
    rain: [{ vi: 'Trời mưa rồi! Mình che ô cho bạn nhé.', en: 'It is raining! Let me hold the umbrella.', cta: { vi: 'Xem nơi trong nhà', en: 'Indoor places', action: 'indoor' } }],
    storm: [{ vi: 'Có dông đó, đừng ở điểm ngoài trời. Mình tìm chỗ trú nhé.', en: 'Thunderstorm! Stay off outdoor stops, I will find shelter.', cta: { vi: 'Xem nơi trong nhà', en: 'Indoor places', action: 'indoor' } }],
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

/**
 * Di living in the corner of the app. It stays put: its eyes and head turn to wherever the pointer is, and when
 * the pointer rests on a control Di points at it. It dozes off when nothing happens, cheers when something is
 * saved and passes on tips that fit the weather, the hour and the page, some with a button.
 */
export function DiCompanion() {
  const { tr } = useTr()
  const sky = useSky()
  const location = useLocation()
  const navigate = useNavigate()
  const { canPointerFx } = useMotionPrefs()
  const point = useMascotPrefs((state) => state.point)

  const [mood, setMood] = useState<MascotMood>('wave')
  const [tip, setTip] = useState<Tip | null>(null)
  const [pointAt, setPointAt] = useState<FocusPoint | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const asleep = useRef(false)
  const sleepTimer = useRef(0)
  const bubbleTimer = useRef(0)
  const moodTimer = useRef(0)
  const tipIndex = useRef(0)
  const lastWeather = useRef<string | null>(null)
  const seenSlots = useRef(new Set<string>())

  const say = useCallback((next: Tip, ms = 7500) => {
    setTip(next)
    window.clearTimeout(bubbleTimer.current)
    bubbleTimer.current = window.setTimeout(() => setTip(null), next.cta ? 14_000 : ms)
  }, [])

  const feel = useCallback((next: MascotMood, ms: number) => {
    setMood(next)
    window.clearTimeout(moodTimer.current)
    moodTimer.current = window.setTimeout(() => setMood('idle'), ms)
  }, [])

  // Point at the control the pointer is resting on.
  useEffect(() => {
    if (!point || !canPointerFx) return
    let timer = 0
    const onOver = (event: PointerEvent) => {
      window.clearTimeout(timer)
      const el = (event.target as Element | null)?.closest?.(INTERACTIVE)
      if (!el || boxRef.current?.contains(el)) {
        setPointAt(null)
        return
      }
      timer = window.setTimeout(() => {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0) return
        setPointAt({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      }, POINT_AFTER_MS)
    }
    const onOut = () => {
      window.clearTimeout(timer)
      setPointAt(null)
    }
    document.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('pointerleave', onOut)
    document.addEventListener('pointerdown', onOut, { passive: true })
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerleave', onOut)
      document.removeEventListener('pointerdown', onOut)
    }
  }, [point, canPointerFx])

  // Something nice happened elsewhere in the app: cheer.
  useEffect(() => {
    const onCheer = () => feel('joy', 1200)
    window.addEventListener(CHEER_EVENT, onCheer)
    return () => window.removeEventListener(CHEER_EVENT, onCheer)
  }, [feel])

  // Greeting.
  useEffect(() => {
    const hello = window.setTimeout(() => say({ vi: 'Chào bạn, mình là Di! Mình sẽ nhìn theo bạn và nhắc mọi thứ nhé.', en: 'Hi, I am Di! I will keep an eye on you and keep you posted.' }, 6000), 1400)
    const settle = window.setTimeout(() => setMood('idle'), 2800)
    return () => {
      window.clearTimeout(hello)
      window.clearTimeout(settle)
    }
  }, [say])

  // Notices when the weather changes.
  useEffect(() => {
    const previous = lastWeather.current
    lastWeather.current = sky.key
    if (previous === null || previous === sky.key) return
    const tips = WEATHER_TIPS[sky.phase][sky.weather]
    say(tips[tipIndex.current % tips.length], 8000)
    feel(sky.weather === 'storm' ? 'error' : 'wave', 1800)
  }, [sky.key, sky.phase, sky.weather, say, feel])

  // Tips that fit the hour, once each, and one about the page you land on.
  useEffect(() => {
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
  }, [location.pathname, say])

  // Falls asleep after a while, wakes on any activity.
  useEffect(() => {
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
  }, [feel])

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
    applyDiAction(action)
    setTip(null)
    navigate('/app/discover')
    feel('joy', 1000)
  }

  return (
    <div ref={boxRef} className="pointer-events-none fixed bottom-[5.4rem] right-1 z-40 w-[4.4rem] sm:right-3 sm:w-[4.9rem] lg:bottom-2 lg:right-5 lg:w-[5.4rem]" aria-live="polite">
      <AnimatePresence>
        {tip && (
          <motion.div
            key={tip.vi}
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            style={{ position: 'absolute' }}
            className="di-bubble pointer-events-auto bottom-[calc(100%-0.8rem)] right-1 w-[12.5rem] origin-bottom-right !px-3 !py-2 !text-[0.8rem] !leading-snug sm:w-[15rem] sm:!px-[0.95rem] sm:!py-[0.65rem] sm:!text-[0.92rem]"
            data-tail="bottom-right"
            role="status"
          >
            <button type="button" onClick={() => setTip(null)} className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border border-[#173f35]/25 bg-[#f7f2e8] text-[#173f35]/70 hover:text-terracotta" aria-label={tr('Đóng gợi ý', 'Close tip')}>
              <X size={12} />
            </button>
            {tr(tip.vi, tip.en)}
            {tip.cta && (
              <button type="button" onClick={() => runAction(tip.cta!.action)} className="mt-2 block border border-terracotta/60 bg-terracotta/10 px-2.5 py-1 font-sans text-[0.74rem] font-semibold not-italic text-terracotta transition-colors hover:bg-terracotta hover:text-white">
                {tr(tip.cta.vi, tip.cta.en)}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ y: 40, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.4 }} className="relative">
        <button type="button" onClick={poke} className="pointer-events-auto block w-full cursor-pointer outline-offset-4 transition-transform duration-300 hover:scale-105 active:scale-95" aria-label={tr('Hỏi Di một gợi ý', 'Ask Di for a tip')}>
          <DiAvatar mood={mood} pointAt={pointAt} className="aspect-square w-full" />
        </button>
      </motion.div>
    </div>
  )
}
