import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useTr } from '../../hooks/useTr'
import { useSky } from '../../store/weatherStore'
import type { WeatherKind } from '../icons'
import { JoAvatar } from './JoAvatar'
import type { MascotMood } from './mascot-context'

const HIDDEN_KEY = 'journie-jo-hidden'
const SLEEP_AFTER_MS = 50_000

const readHidden = () => {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

const writeHidden = (hidden: boolean) => {
  try {
    window.localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0')
  } catch {
    /* private mode: Jo simply comes back next visit */
  }
}

type Tip = { vi: string; en: string }

const SKY_TIPS: Record<WeatherKind, Tip[]> = {
  sunny: [
    { vi: 'Nắng đẹp quá! Nhớ mang nón và chai nước nhé.', en: 'What a sunny day! Pack a hat and some water.' },
    { vi: 'Trời nắng, điểm ngoài trời buổi sáng sớm là hợp nhất.', en: 'Sunny: outdoor stops are best early in the morning.' },
  ],
  cloudy: [
    { vi: 'Trời mát, đi bộ phố cổ là tuyệt nhất.', en: 'Nice and cool, perfect for an old-town stroll.' },
    { vi: 'Mây nhiều nên chụp ảnh sẽ rất mềm, thử ngay nhé.', en: 'Soft clouds make the best light for photos.' },
  ],
  rain: [
    { vi: 'Đang mưa rồi. Mình đưa bạn vào quán cà phê hay bảo tàng nhé?', en: 'It is raining. Shall we duck into a café or museum?' },
    { vi: 'Mưa thì mình cứ đổi điểm trong nhà, lịch trình vẫn gọn.', en: 'Rain only means swapping in indoor stops; the plan stays tidy.' },
  ],
  storm: [
    { vi: 'Có dông đó, đừng ở điểm ngoài trời nhé. Mình tìm chỗ trú giúp bạn.', en: 'Thunderstorm! Stay off outdoor stops, I will find shelter.' },
  ],
  night: [
    { vi: 'Khuya rồi, nghỉ ngơi để mai đi tiếp nhé.', en: 'It is late. Rest up and carry on tomorrow.' },
    { vi: 'Ban đêm chợ đêm và phố ẩm thực lên đèn đẹp lắm.', en: 'Night markets and food streets glow after dark.' },
  ],
}

const ROUTE_TIPS: { match: RegExp; tip: Tip }[] = [
  { match: /^\/app\/plan/, tip: { vi: 'Kể mình nghe chuyến đi mơ ước, cứ viết tự nhiên thôi.', en: 'Tell me about your dream trip, just write naturally.' } },
  { match: /^\/app\/discover/, tip: { vi: 'Thả tim vào nơi bạn thích, mình sẽ ưu tiên khi lập lịch.', en: 'Heart what you like and I will favour it when planning.' } },
  { match: /^\/app\/trips\/[^/]+\/live/, tip: { vi: 'Mình đang theo dõi thời tiết và đường đi cho bạn.', en: 'I am watching the weather and the road for you.' } },
  { match: /^\/app\/profile/, tip: { vi: 'Chỉ cần vài ý chính là đủ rồi, còn lại mình đoán.', en: 'A few key ideas are enough, I will guess the rest.' } },
]

/**
 * Jo living in the corner of the app: blinks, follows the pointer, waves hello, dozes off when nothing
 * happens, hops when poked and passes on a tip that fits the weather and the page.
 */
export function JoCompanion() {
  const { tr } = useTr()
  const sky = useSky()
  const location = useLocation()
  const [hidden, setHidden] = useState(readHidden)
  const [mood, setMood] = useState<MascotMood>('wave')
  const [tip, setTip] = useState<Tip | null>(null)
  const sleepTimer = useRef<number>(0)
  const bubbleTimer = useRef<number>(0)
  const moodTimer = useRef<number>(0)
  const tipIndex = useRef(0)
  const lastSky = useRef<WeatherKind | null>(null)
  const asleep = useRef(false)

  const say = useCallback((next: Tip, ms = 7000) => {
    setTip(next)
    window.clearTimeout(bubbleTimer.current)
    bubbleTimer.current = window.setTimeout(() => setTip(null), ms)
  }, [])

  const feel = useCallback((next: MascotMood, ms: number) => {
    setMood(next)
    window.clearTimeout(moodTimer.current)
    moodTimer.current = window.setTimeout(() => setMood('idle'), ms)
  }, [])

  // Greeting, then settle into idle.
  useEffect(() => {
    if (hidden) return
    const hello = window.setTimeout(() => {
      say({ vi: 'Chào bạn, mình là Jo. Chạm vào mình nếu cần gợi ý nhé!', en: 'Hi, I am Jo. Tap me anytime for a tip!' }, 6000)
    }, 1400)
    const settle = window.setTimeout(() => setMood('idle'), 2600)
    return () => {
      window.clearTimeout(hello)
      window.clearTimeout(settle)
    }
  }, [hidden, say])

  // Notices when the sky changes.
  useEffect(() => {
    if (hidden) return
    const previous = lastSky.current
    lastSky.current = sky.kind
    if (previous === null || previous === sky.kind) return
    const tips = SKY_TIPS[sky.kind]
    say(tips[tipIndex.current % tips.length], 8000)
    feel(sky.kind === 'storm' ? 'error' : 'wave', 1800)
  }, [sky.kind, hidden, say, feel])

  // Page-aware tip, a moment after arriving.
  useEffect(() => {
    if (hidden) return
    const hit = ROUTE_TIPS.find((entry) => entry.match.test(location.pathname))
    if (!hit) return
    const timer = window.setTimeout(() => say(hit.tip, 6000), 2200)
    return () => window.clearTimeout(timer)
  }, [location.pathname, hidden, say])

  // Falls asleep after a while, wakes up on any activity.
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
    const pool = [...SKY_TIPS[sky.kind], ...ROUTE_TIPS.filter((entry) => entry.match.test(location.pathname)).map((entry) => entry.tip)]
    tipIndex.current += 1
    say(pool[tipIndex.current % pool.length] ?? SKY_TIPS.sunny[0])
    feel('joy', 1100)
  }

  const dismiss = () => {
    writeHidden(true)
    setHidden(true)
    setTip(null)
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => {
          writeHidden(false)
          setHidden(false)
          setMood('wave')
        }}
        className="fixed bottom-[5.75rem] right-3 z-40 border border-forest/25 bg-paper px-3 py-1.5 text-[0.7rem] font-semibold text-forest shadow-sm transition-colors hover:border-terracotta hover:text-terracotta lg:bottom-5 lg:right-5"
      >
        {tr('Gọi Jo ra chơi', 'Call Jo back')}
      </button>
    )
  }

  return (
    <div className="pointer-events-none fixed bottom-[5.5rem] right-2 z-40 flex flex-col items-end sm:right-4 lg:bottom-4 lg:right-6" aria-live="polite">
      <AnimatePresence>
        {tip && (
          <motion.div
            key={tip.vi}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            className="jo-bubble pointer-events-auto mb-1 mr-3 max-w-[12.5rem] origin-bottom-right !px-3 !py-2 !text-[0.8rem] !leading-snug sm:max-w-[15rem] sm:!px-[0.95rem] sm:!py-[0.65rem] sm:!text-[0.92rem]"
            data-tail="bottom-right"
            role="status"
          >
            <button type="button" onClick={() => setTip(null)} className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border border-forest/20 bg-paper text-forest/60 hover:text-terracotta" aria-label={tr('Đóng gợi ý', 'Close tip')}>
              <X size={12} />
            </button>
            {tr(tip.vi, tip.en)}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        initial={{ x: 90, opacity: 0, rotate: 12 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.5 }}
        className="group pointer-events-auto relative"
      >
        <button type="button" onClick={poke} className="block w-[4.6rem] cursor-pointer outline-offset-4 transition-transform duration-300 hover:scale-110 active:scale-95 sm:w-[5.4rem]" aria-label={tr('Hỏi Jo một gợi ý', 'Ask Jo for a tip')}>
          <JoAvatar mood={mood} trail={false} className="aspect-[300/340] w-full" />
        </button>
        <button type="button" onClick={dismiss} className="absolute -left-3 top-1 hidden size-6 place-items-center rounded-full border border-forest/20 bg-paper/90 text-forest/55 transition-colors hover:text-terracotta group-hover:grid group-focus-within:grid" aria-label={tr('Cho Jo nghỉ', 'Let Jo rest')} title={tr('Cho Jo nghỉ', 'Let Jo rest')}>
          <X size={12} />
        </button>
      </motion.div>
    </div>
  )
}
