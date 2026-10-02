import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isRainy, weatherFor } from '../domain/conditions'
import { addDays, todayIso } from '../domain/time'
import type { CityId } from '../domain/types'
import type { WeatherKind } from '../components/icons'

/**
 * The sky the whole app is under. `auto` follows the clock (night after dusk) and the forecast for
 * the traveler's city; a person can pin any sky from the weather chip, and live trips override it
 * for a while when a real disruption (heavy rain) is detected.
 */
export type WeatherMode = 'auto' | WeatherKind

type WeatherState = {
  mode: WeatherMode
  override: { kind: WeatherKind; until: number } | null
  setMode: (mode: WeatherMode) => void
  /** Force a sky for `ms` milliseconds, e.g. when the monitor reports heavy rain. */
  setOverride: (kind: WeatherKind, ms?: number) => void
  clearOverride: () => void
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set) => ({
      mode: 'auto',
      override: null,
      setMode: (mode) => set({ mode, override: null }),
      setOverride: (kind, ms = 120_000) => set({ override: { kind, until: Date.now() + ms } }),
      clearOverride: () => set({ override: null }),
    }),
    { name: 'journie-weather', version: 1, partialize: (state) => ({ mode: state.mode }) },
  ),
)

const isNightHour = (date: Date) => {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return minutes >= 18 * 60 + 30 || minutes < 5 * 60 + 30
}

const BASE_TEMP: Record<WeatherKind, number> = { sunny: 33, cloudy: 29, rain: 25, storm: 24, night: 26 }

export type SkyInfo = { kind: WeatherKind; tempC: number; auto: boolean; label: [vi: string, en: string] }

export const SKY_LABEL: Record<WeatherKind, [string, string]> = {
  sunny: ['Nắng đẹp', 'Sunny'],
  cloudy: ['Nhiều mây', 'Cloudy'],
  rain: ['Mưa', 'Rain'],
  storm: ['Dông', 'Storm'],
  night: ['Đêm', 'Night'],
}

/** Current sky for a city. Re-evaluates every minute and when an override expires. */
export function useSky(city: CityId = 'sai-gon'): SkyInfo {
  const mode = useWeatherStore((state) => state.mode)
  const override = useWeatherStore((state) => state.override)
  const clearOverride = useWeatherStore((state) => state.clearOverride)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!override) return
    const wait = Math.max(0, override.until - Date.now())
    const timer = window.setTimeout(clearOverride, wait)
    return () => window.clearTimeout(timer)
  }, [override, clearOverride])

  if (override && override.until > now.getTime()) {
    return { kind: override.kind, tempC: BASE_TEMP[override.kind], auto: false, label: SKY_LABEL[override.kind] }
  }
  if (mode !== 'auto') return { kind: mode, tempC: BASE_TEMP[mode], auto: false, label: SKY_LABEL[mode] }

  const forecast = weatherFor(city, addDays(todayIso(), 0))
  if (isNightHour(now)) return { kind: 'night', tempC: forecast.tempC - 3, auto: true, label: SKY_LABEL.night }
  const kind: WeatherKind = forecast.condition === 'storm' ? 'storm' : isRainy(forecast) ? 'rain' : forecast.condition === 'cloudy' ? 'cloudy' : 'sunny'
  return { kind, tempC: forecast.tempC, auto: true, label: SKY_LABEL[kind] }
}
