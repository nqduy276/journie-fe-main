import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isRainy, weatherFor } from '../domain/conditions'
import { addDays, todayIso } from '../domain/time'
import type { CityId } from '../domain/types'

/**
 * The sky the whole app is under, as two independent things: the time of day (day or night) and the
 * weather (clear, cloudy, rain, storm). A rainy night is night AND rain. Both follow the clock and the
 * forecast on `auto`; a person can pin either from the sky chip, and live trips override the weather for
 * a while when a real disruption (heavy rain) is detected.
 */
export type Phase = 'day' | 'night'
export type Weather = 'clear' | 'cloudy' | 'rain' | 'storm'
export type PhaseMode = 'auto' | Phase
export type WeatherMode = 'auto' | Weather

/** A day↔night change in progress: the overlay plays it, then commits `mode` while the screen is covered. */
export type SkyShift = { id: number; from: Phase; to: Phase; mode: PhaseMode }

type SkyState = {
  phaseMode: PhaseMode
  weatherMode: WeatherMode
  override: { weather: Weather; until: number } | null
  shift: SkyShift | null
  setPhaseMode: (mode: PhaseMode) => void
  /** Choose day, night or auto. A real change of sky plays the moon/sun rising; the same sky just applies. */
  requestPhase: (mode: PhaseMode) => void
  endShift: () => void
  setWeatherMode: (mode: WeatherMode) => void
  /** Force a weather for `ms` milliseconds, e.g. when the monitor reports heavy rain. */
  setOverride: (weather: Weather, ms?: number) => void
  clearOverride: () => void
}

const isNightHour = (date: Date) => {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return minutes >= 18 * 60 + 30 || minutes < 5 * 60 + 30
}

/** The time of day a mode stands for right now (`auto` follows the clock: night is 18:30 to 05:30). */
export const resolvePhase = (mode: PhaseMode, now: Date = new Date()): Phase => (mode === 'auto' ? (isNightHour(now) ? 'night' : 'day') : mode)

export const useWeatherStore = create<SkyState>()(
  persist(
    (set, get) => ({
      phaseMode: 'auto',
      weatherMode: 'auto',
      override: null,
      shift: null,
      setPhaseMode: (phaseMode) => set({ phaseMode }),
      requestPhase: (mode) => {
        const from = resolvePhase(get().phaseMode)
        const to = resolvePhase(mode)
        if (from === to) set({ phaseMode: mode, shift: null })
        else set({ shift: { id: Date.now(), from, to, mode } })
      },
      endShift: () => set({ shift: null }),
      setWeatherMode: (weatherMode) => set({ weatherMode, override: null }),
      setOverride: (weather, ms = 120_000) => set({ override: { weather, until: Date.now() + ms } }),
      clearOverride: () => set({ override: null }),
    }),
    {
      name: 'journie-sky',
      version: 1,
      partialize: (state) => ({ phaseMode: state.phaseMode, weatherMode: state.weatherMode }),
    },
  ),
)

export const WEATHER_LABEL: Record<Weather, [string, string]> = {
  clear: ['Quang đãng', 'Clear'],
  cloudy: ['Nhiều mây', 'Cloudy'],
  rain: ['Mưa', 'Rain'],
  storm: ['Dông', 'Storm'],
}

export const PHASE_LABEL: Record<Phase, [string, string]> = {
  day: ['Ban ngày', 'Daytime'],
  night: ['Ban đêm', 'Night'],
}


const BASE_TEMP: Record<Weather, number> = { clear: 33, cloudy: 29, rain: 26, storm: 25 }

export type SkyInfo = {
  phase: Phase
  weather: Weather
  tempC: number
  autoPhase: boolean
  autoWeather: boolean
  /** Handy for CSS: "night-rain", "day-clear"… */
  key: `${Phase}-${Weather}`
  night: boolean
  label: [vi: string, en: string]
}

/** Current sky for a city. Re-evaluates every minute and when an override expires. */
export function useSky(city: CityId = 'sai-gon'): SkyInfo {
  const phaseMode = useWeatherStore((state) => state.phaseMode)
  const weatherMode = useWeatherStore((state) => state.weatherMode)
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

  const forecast = weatherFor(city, addDays(todayIso(), 0))
  const forecastWeather: Weather = forecast.condition === 'storm' ? 'storm' : isRainy(forecast) ? 'rain' : forecast.condition === 'cloudy' ? 'cloudy' : 'clear'

  const phase: Phase = resolvePhase(phaseMode, now)
  const overridden = !!override && override.until > now.getTime()
  const weather: Weather = overridden ? override.weather : weatherMode === 'auto' ? forecastWeather : weatherMode
  const tempC = Math.round(weatherMode === 'auto' && !overridden ? forecast.tempC - (phase === 'night' ? 3 : 0) : BASE_TEMP[weather] - (phase === 'night' ? 4 : 0))

  return {
    phase,
    weather,
    tempC,
    autoPhase: phaseMode === 'auto',
    autoWeather: weatherMode === 'auto' && !overridden,
    key: `${phase}-${weather}`,
    night: phase === 'night',
    label: WEATHER_LABEL[weather],
  }
}
