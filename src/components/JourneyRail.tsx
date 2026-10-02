import { motion } from 'motion/react'
import { journeyChapters } from '../content/site'
import { useActiveSection } from '../hooks/useActiveSection'
import { useLanguage } from '../hooks/useLanguage'
import { HERO_PLACES, heroPlace } from '../content/heroPlaces'
import { cityById } from '../domain/pois'
import { Coordinates } from './motion/Coordinates'

const chapterIds: readonly string[] = journeyChapters.map((chapter) => chapter.id)
const lastIndex = journeyChapters.length - 1
/** Chapter slots that name a destination, in order; the slot between Ha Long and Phu Quoc stays "across the country". */
const PLACE_SLOTS = [0, 1, 2, 3, 4, null, 5] as const

/**
 * Scrolling reads as travelling. In the page margins of wide screens, a vertical readout
 * names the place the current section belongs to and a rail tracks progress between places.
 */
export function JourneyRail() {
  const { messages, language } = useLanguage()
  const activeId = useActiveSection(chapterIds, true)
  const index = Math.max(0, chapterIds.indexOf(activeId ?? chapterIds[0]))
  const chapter = journeyChapters[index]
  // The journey starts where the hero photograph is and visits the other places after it.
  const hero = heroPlace()
  const order = [hero, ...HERO_PLACES.filter((item) => item.id !== hero.id)]
  const slot = PLACE_SLOTS[index]
  const stop = slot === null ? null : order[slot]
  const place = stop ? (language === 'vi' ? cityById[stop.id].name : cityById[stop.id].nameEn) : messages.journey.places[index]
  const coordinates: readonly [number, number] = stop ? [stop.lat, stop.lng] : chapter.coordinates
  const dark = chapter.tone === 'dark'

  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 transition-colors duration-700 min-[1360px]:block ${
          dark ? 'text-paper' : 'text-ink'
        }`}
      >
        <p className="flex rotate-180 items-center gap-3 text-[0.68rem] [writing-mode:vertical-rl]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-terracotta opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-terracotta" />
          </span>
          <motion.span
            key={place}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-semibold tracking-wide"
          >
            {place}
          </motion.span>
          <Coordinates
            latitude={coordinates[0]}
            longitude={coordinates[1]}
            className={dark ? 'text-paper/60' : 'text-ink/55'}
          />
        </p>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 min-[1360px]:block"
      >
        <div className="relative h-56 w-3">
          <span
            className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-700 ${
              dark ? 'bg-paper/25' : 'bg-forest/20'
            }`}
          />
          <span
            className="absolute left-1/2 top-0 w-0.5 -translate-x-1/2 bg-terracotta transition-[height] duration-700 ease-out"
            style={{ height: `${(index / lastIndex) * 100}%` }}
          />
          {journeyChapters.map((item, itemIndex) => (
            <span
              key={item.id}
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ${
                itemIndex === index
                  ? 'size-3 bg-terracotta shadow-[0_0_0_5px_rgba(217,103,69,0.22)]'
                  : itemIndex < index
                    ? 'size-1.5 bg-terracotta'
                    : `size-1.5 ${dark ? 'bg-paper/45' : 'bg-forest/35'}`
              }`}
              style={{ top: `${(itemIndex / lastIndex) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
