/** Clock helpers: the whole domain works in minutes after midnight. */

export const hm = (value: string): number => {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + (m || 0)
}

export const fmtTime = (minutes: number): string => {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const fmtMinutes = (minutes: number, vi = true): string => {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return vi ? `${m} phút` : `${m} min`
  if (!m) return vi ? `${h} giờ` : `${h} h`
  return vi ? `${h} giờ ${m}` : `${h} h ${m}`
}

export const todayIso = () => new Date().toISOString().slice(0, 10)

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDate(iso: string, locale: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, options ?? { weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(`${iso}T00:00:00`),
  )
}

export const formatVnd = (amount: number, compact = false): string => {
  if (!amount) return '0đ'
  if (compact) {
    if (amount >= 1_000_000) return `${+(amount / 1_000_000).toFixed(1)}tr`
    if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`
  }
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))}đ`
}
