import { useEffect, useState } from 'react'
import type { DiAction } from '../../lib/diActions'
import { useSky } from '../../store/weatherStore'
import type { MascotMood } from './mascot-context'

export type DiMoment = {
  mood: MascotMood
  line: { vi: string; en: string }
  cta?: { vi: string; en: string; action: DiAction }
}

const FOOD = { vi: 'Gợi ý món ăn', en: 'Food ideas', action: 'food' } as const
const INDOOR = { vi: 'Xem nơi trong nhà', en: 'Indoor places', action: 'indoor' } as const

type Meal = 'breakfast' | 'lunch' | 'dinner' | null

function mealAt(minutes: number): Meal {
  if (minutes >= 5 * 60 + 30 && minutes < 9 * 60) return 'breakfast'
  if (minutes >= 11 * 60 + 30 && minutes < 13 * 60 + 15) return 'lunch'
  if (minutes >= 17 * 60 + 30 && minutes < 19 * 60 + 30) return 'dinner'
  return null
}

const HUNGRY: Record<Exclude<Meal, null>, { vi: string; en: string }> = {
  breakfast: { vi: 'Bụng Di đang réo rồi… ăn sáng một tô phở nhé?', en: 'My tummy is rumbling… shall we have pho for breakfast?' },
  lunch: { vi: 'Đến giờ ăn trưa rồi, Di đói quá! Mình đi ăn nhé?', en: 'It is lunchtime and I am starving! Shall we eat?' },
  dinner: { vi: 'Chiều tối rồi, Di đói bụng. Ăn tối rồi dạo chợ đêm nhé?', en: 'Evening already and I am hungry. Dinner, then the night market?' },
}

/**
 * What the big Di on the dashboard is doing right now, picked from the sky and the clock rather than from the
 * pointer: it holds an umbrella and worries in storms, pats its tummy at mealtimes, fans itself in the midday sun,
 * dozes off late at night. It is deliberately not the corner Di's mood, which follows what you are clicking.
 */
export function useDiMoment(): DiMoment {
  const sky = useSky()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const minutes = now.getHours() * 60 + now.getMinutes()
  const meal = mealAt(minutes)
  const late = minutes >= 23 * 60 || minutes < 5 * 60

  if (sky.weather === 'storm') return { mood: 'error', line: { vi: 'Có dông! Di núp dưới ô rồi, bạn cũng đừng ở điểm ngoài trời nhé.', en: 'Thunderstorm! I am under my umbrella, and you should stay off outdoor stops too.' }, cta: INDOOR }
  if (sky.weather === 'rain') {
    if (meal) return { mood: 'hungry', line: { vi: 'Mưa rồi mà bụng Di vẫn réo. Ăn chút gì nóng nóng nhé?', en: 'It is raining and my tummy still rumbles. Something warm to eat?' }, cta: FOOD }
    return { mood: 'idle', line: { vi: 'Trời mưa, Di che ô cho bạn. Hôm nay hợp với nơi trong nhà.', en: 'It is raining, so I brought the umbrella. Indoor places suit today.' }, cta: INDOOR }
  }
  if (meal) return { mood: 'hungry', line: HUNGRY[meal], cta: FOOD }
  if (late) return { mood: 'sleepy', line: { vi: 'Khuya rồi, Di buồn ngủ quá. Mai mình đi tiếp nhé.', en: 'It is late and I am sleepy. Let us carry on tomorrow.' } }
  if (sky.night) return { mood: 'watching', line: { vi: 'Đêm đẹp trời, Di ngắm sao cùng bạn. Lên lịch cho ngày mai nhé?', en: 'A lovely night. I am stargazing with you; plan tomorrow?' } }
  if (sky.weather === 'clear' && minutes >= 11 * 60 && minutes < 16 * 60) return { mood: 'hot', line: { vi: 'Nắng gắt quá! Di quạt cho mát. Nhớ mang nước và đội nón nhé.', en: 'So sunny! I am fanning myself. Bring water and a hat.' } }
  if (sky.weather === 'cloudy') return { mood: 'wave', line: { vi: 'Trời dịu mát, đi dạo phố cổ là hợp nhất.', en: 'Cool and cloudy: perfect for an old-town stroll.' } }
  return { mood: 'wave', line: { vi: 'Chào bạn! Hôm nay bạn muốn đi đâu? Kể cho Di nghe nhé.', en: 'Hello! Where would you like to go today? Tell me.' } }
}
