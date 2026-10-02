import { categoryIds } from '../domain/categories'
import { CategoryIcon, NavIcon, WeatherIcon, type NavIconName, type WeatherKind } from '../components/icons'
import { JoAvatar } from '../components/mascot/JoAvatar'
import type { MascotMood } from '../components/mascot/mascot-context'

const NAV: NavIconName[] = ['home', 'plan', 'trips', 'discover', 'profile', 'analytics']
const MOODS: MascotMood[] = ['idle', 'hiding', 'peeking', 'thinking', 'error', 'joy', 'sleepy', 'wave']
const WEATHER: WeatherKind[] = ['sunny', 'cloudy', 'rain', 'storm', 'night']

/** Dev-only contact sheet for the custom icon set (`/__icons`). */
export function IconSheet() {
  return (
    <div className="min-h-dvh bg-paper p-8 text-forest">
      <h1 className="h-display text-3xl">Journie icons</h1>
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-forest/60">Jo: moods (sunny) and weather (idle)</h2>
        <ul className="flex flex-wrap gap-4">
          {MOODS.map((mood) => (
            <li key={mood} className="w-32 text-center text-xs">
              <JoAvatar mood={mood} weather="sunny" className="aspect-[300/340] w-full" />
              {mood}
            </li>
          ))}
          {WEATHER.map((kind) => (
            <li key={kind} className="w-32 text-center text-xs">
              <JoAvatar mood="idle" weather={kind} className="aspect-[300/340] w-full" />
              {kind}
            </li>
          ))}
        </ul>
      </section>
      {[
        { label: 'Places', items: categoryIds.map((cat) => ({ key: cat, node: (size: number) => <CategoryIcon cat={cat} size={size} /> })) },
        { label: 'Weather', items: WEATHER.map((kind) => ({ key: kind, node: (size: number) => <WeatherIcon kind={kind} size={size} /> })) },
        { label: 'Navigation', items: NAV.map((name) => ({ key: name, node: (size: number) => <NavIcon name={name} size={size} /> })) },
      ].map((group) => (
        <section key={group.label} className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-forest/60">{group.label}</h2>
          <ul className="flex flex-wrap items-end gap-6">
            {group.items.map((item) => (
              <li key={item.key} className="flex flex-col items-center gap-2 text-xs">
                <span className="flex items-end gap-3">
                  {item.node(96)}
                  {item.node(40)}
                  {item.node(22)}
                </span>
                {item.key}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
