import { categories } from './categories'
import { cities, normalize, pois } from './pois'
import { hm } from './time'
import type { CategoryId, CityId, Interests, Pace, TransportPref } from './types'

/**
 * Stand-in for the Gemini intent-extraction call (report §5.8): free text in, a structured and
 * validated request out. Everything here is shown to the traveler as editable chips, so the user can
 * see exactly which parts of their wish became hard constraints and which became soft preferences.
 */

export type Intent = {
  city?: CityId
  days?: number
  budget?: number
  budgetHard: boolean
  interests: Interests
  keywords: string[]
  pace?: Pace
  avoidTags: string[]
  mustInclude: string[]
  transport?: TransportPref
  dayStart?: number
  dayEnd?: number
  chips: IntentChip[]
}

export type IntentChip = {
  kind: 'hard' | 'soft'
  field: 'city' | 'days' | 'budget' | 'interest' | 'pace' | 'avoid' | 'must' | 'transport' | 'time'
  vi: string
  en: string
}

const CITY_ALIASES: [CityId, string[]][] = [
  ['ha-noi', ['ha noi', 'hanoi', 'thu do']],
  ['ninh-binh', ['ninh binh', 'trang an', 'tam coc']],
  ['ha-long', ['ha long', 'halong', 'vinh ha long']],
  ['ha-giang', ['ha giang', 'ma pi leng', 'dong van', 'cao nguyen da']],
  ['hoi-an', ['hoi an', 'hoian', 'pho co hoi an']],
  ['sai-gon', ['sai gon', 'saigon', 'ho chi minh', 'hcm', 'tphcm']],
  ['phu-quoc', ['phu quoc', 'dao ngoc']],
  ['da-lat', ['da lat', 'dalat']],
]

const INTEREST_RULES: [CategoryId, RegExp, string[]][] = [
  ['food', /\b(an uong|am thuc|mon ngon|an ngon|food|eat|foodie|pho|dac san)\b/, []],
  ['cafe', /\b(ca phe|cafe|coffee|caphe)\b/, ['coffee']],
  ['culture', /\b(van hoa|lich su|bao tang|di san|culture|history|museum|heritage|chua|den)\b/, []],
  ['beach', /\b(bien|tam bien|beach|swim|boi)\b/, []],
  ['nature', /\b(thien nhien|nui|thac|song|nature|trekking|hike|leo nui|rung)\b/, []],
  ['market', /\b(cho|cho dem|night market|market|mua sam|shopping)\b/, []],
  ['nightlife', /\b(ve dem|nightlife|bar|toi muon|hoang hon|sunset)\b/, ['sunset']],
  ['adventure', /\b(phieu luu|mao hiem|adventure|thrill|cap treo|kham pha)\b/, []],
]

const KEYWORD_RULES: [RegExp, string][] = [
  [/\b(chup anh|song ao|check in|checkin|view dep|ngam canh|viewpoint)\b/, 'viewpoint'],
  [/\b(rooftop|san thuong)\b/, 'rooftop'],
  [/\b(ao dai|den long|lantern)\b/, 'lanterns'],
  [/\b(an chay|vegetarian|vegan)\b/, 'vegetarian'],
  [/\b(street food|an vat|an via he)\b/, 'street-food'],
  [/\b(thuyen|boat|di do)\b/, 'boat'],
]

const AVOID_RULES: [RegExp, string[], string, string][] = [
  [/(di ung|kieng|khong an|allerg\w*|no)\s*(hai san|seafood|tom|cua|ghe|ca)/, ['seafood'], 'Dị ứng hải sản', 'Seafood allergy'],
  [/(di ung|kieng|khong an|allerg\w*|no)\s*(dau phong|peanut|lac)/, ['peanut'], 'Dị ứng đậu phộng', 'Peanut allergy'],
  [/(khong an|kieng|no)\s*(thit heo|thit lon|pork)/, ['pork'], 'Không ăn thịt heo', 'No pork'],
  [/(khong an|kieng|no)\s*(thit bo|beef)/, ['beef'], 'Không ăn thịt bò', 'No beef'],
  [/\b(an chay|vegetarian|vegan)\b/, ['seafood', 'pork', 'beef', 'goat'], 'Ăn chay', 'Vegetarian'],
]

const NUMBER_WORDS: Record<string, number> = { mot: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5, sau: 6, bay: 7, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 }

const num = (raw: string) => Number(raw.replace(',', '.'))

export function extractIntent(text: string): Intent {
  const t = normalize(text)
  const intent: Intent = { budgetHard: false, interests: {}, keywords: [], avoidTags: [], mustInclude: [], chips: [] }
  const chip = (c: IntentChip) => intent.chips.push(c)

  // Destination
  for (const [id, aliases] of CITY_ALIASES) {
    if (aliases.some((alias) => t.includes(alias))) {
      intent.city = id
      const city = cities.find((c) => c.id === id)!
      chip({ kind: 'hard', field: 'city', vi: city.name, en: city.nameEn })
      break
    }
  }

  // Duration
  const digitDays = t.match(/(\d+)\s*(ngay|dem|day|night)/)
  const wordDays = t.match(/\b(mot|hai|ba|bon|nam|sau|bay|one|two|three|four|five|six|seven)\s*(ngay|dem|day|night)/)
  if (digitDays) intent.days = Math.min(7, Math.max(1, Number(digitDays[1])))
  else if (wordDays) intent.days = NUMBER_WORDS[wordDays[1]]
  else if (/cuoi tuan|weekend/.test(t)) intent.days = 2
  else if (/trong ngay|1 ngay|a day|one day|mot ngay/.test(t)) intent.days = 1
  if (intent.days) chip({ kind: 'hard', field: 'days', vi: `${intent.days} ngày`, en: `${intent.days} day${intent.days > 1 ? 's' : ''}` })

  // Budget
  const million = t.match(/(\d+(?:[.,]\d+)?)\s*(trieu|tr\b|million|m\b)/)
  const thousand = t.match(/(\d+(?:[.,]\d+)?)\s*(k\b|nghin|ngan|thousand)/)
  if (million) intent.budget = Math.round(num(million[1]) * 1_000_000)
  else if (thousand) intent.budget = Math.round(num(thousand[1]) * 1_000)
  if (intent.budget && intent.budget >= 100_000) {
    intent.budgetHard = /toi da|khong qua|duoi|under|max|at most|no more/.test(t)
    chip({
      kind: intent.budgetHard ? 'hard' : 'soft',
      field: 'budget',
      vi: `${intent.budgetHard ? 'Tối đa' : '~'} ${new Intl.NumberFormat('vi-VN').format(intent.budget)}đ`,
      en: `${intent.budgetHard ? 'Max' : '~'} ${new Intl.NumberFormat('en-US').format(intent.budget)} VND`,
    })
  } else {
    intent.budget = undefined
  }
  if (!intent.budget && /tiet kiem|binh dan|gia re|budget|cheap|limited budget/.test(t)) {
    intent.budget = 1_500_000
    chip({ kind: 'soft', field: 'budget', vi: 'Tiết kiệm', en: 'Budget-friendly' })
  }

  // Interests become soft weights
  for (const [cat, pattern, words] of INTEREST_RULES) {
    if (pattern.test(t)) {
      intent.interests[cat] = 0.95
      intent.keywords.push(...words)
      chip({ kind: 'soft', field: 'interest', vi: categories[cat].vi, en: categories[cat].en })
    }
  }
  for (const [pattern, word] of KEYWORD_RULES) if (pattern.test(t) && !intent.keywords.includes(word)) intent.keywords.push(word)

  // Pace
  if (/cham|thong tha|thu thai|chill|slow|relax|nhe nhang|khong voi/.test(t)) intent.pace = 'slow'
  else if (/nhanh|day dac|nhieu cho|packed|fast|full|toi da diem/.test(t)) intent.pace = 'fast'
  if (intent.pace) chip({ kind: 'soft', field: 'pace', vi: intent.pace === 'slow' ? 'Nhịp chậm' : 'Nhịp nhanh', en: intent.pace === 'slow' ? 'Slow pace' : 'Fast pace' })

  // Allergies and diet are hard
  for (const [pattern, tags, vi, en] of AVOID_RULES) {
    if (pattern.test(t)) {
      intent.avoidTags.push(...tags.filter((tag) => !intent.avoidTags.includes(tag)))
      chip({ kind: 'hard', field: 'avoid', vi, en })
    }
  }

  // Transport
  if (/di bo|walk/.test(t)) intent.transport = 'walk'
  else if (/xe may|grab bike|motorbike|scooter|xe om/.test(t)) intent.transport = 'bike'
  else if (/taxi|grab car|o to|car\b/.test(t)) intent.transport = 'taxi'
  if (intent.transport) {
    const label = { walk: ['Ưu tiên đi bộ', 'Prefer walking'], bike: ['Đi xe máy', 'By motorbike'], taxi: ['Đi taxi', 'By taxi'] }[intent.transport]
    chip({ kind: 'soft', field: 'transport', vi: label[0], en: label[1] })
  }

  // Times
  const startMatch = t.match(/(?:bat dau|xuat phat|tu|start(?:ing)?(?: at)?)\s*(?:luc\s*)?(\d{1,2})\s*(?:h|gio|:|am)?(\d{2})?/)
  const endMatch = t.match(/(?:ve truoc|ket thuc|truoc|until|back by|finish by)\s*(?:luc\s*)?(\d{1,2})\s*(?:h|gio|:|pm)?(\d{2})?/)
  if (startMatch && Number(startMatch[1]) >= 5 && Number(startMatch[1]) <= 12) intent.dayStart = hm(`${startMatch[1]}:${startMatch[2] ?? '00'}`)
  if (endMatch && Number(endMatch[1]) >= 15 && Number(endMatch[1]) <= 23) intent.dayEnd = hm(`${endMatch[1]}:${endMatch[2] ?? '00'}`)
  if (intent.dayStart !== undefined || intent.dayEnd !== undefined) {
    const from = intent.dayStart !== undefined ? `${String(Math.floor(intent.dayStart / 60)).padStart(2, '0')}:${String(intent.dayStart % 60).padStart(2, '0')}` : '…'
    const to = intent.dayEnd !== undefined ? `${String(Math.floor(intent.dayEnd / 60)).padStart(2, '0')}:${String(intent.dayEnd % 60).padStart(2, '0')}` : '…'
    chip({ kind: 'hard', field: 'time', vi: `${from} – ${to}`, en: `${from} – ${to}` })
  }

  // Named places become mandatory stops
  const scope = intent.city ? pois.filter((poi) => poi.city === intent.city) : pois
  for (const poi of scope) {
    const short = normalize(poi.name).replace(/\(.*?\)/g, '').trim()
    const head = short.split(/ & | – /)[0]
    if (head.length >= 6 && t.includes(head)) {
      intent.mustInclude.push(poi.id)
      if (!intent.city) intent.city = poi.city
      chip({ kind: 'hard', field: 'must', vi: `Phải có: ${poi.name}`, en: `Must include: ${poi.name}` })
    }
  }
  if (intent.mustInclude.length && !intent.chips.some((c) => c.field === 'city') && intent.city) {
    const city = cities.find((c) => c.id === intent.city)!
    intent.chips.unshift({ kind: 'hard', field: 'city', vi: city.name, en: city.nameEn })
  }

  return intent
}
