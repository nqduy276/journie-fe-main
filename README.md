## Running the Project

Node.js 20.19 or later is required. The project is currently tested with Node.js 24 and npm 11.

```bash
npm install
npm run dev
```

Main commands:

```bash
npm run dev      # Start the development server
npm run lint     # Check the source code with Oxlint
npm run build    # Type-check and create a production build
npm run preview  # Preview the production build locally
```

## Main Structure

```text
src/
├── api/                 # FastAPI-shaped mock endpoints (auth, trips, planner, places, profile, analytics) + TanStack Query hooks
├── app/                 # Signed-in workspace: AppShell, routes, route guards
├── assets/images/       # Destination images and Journie brand assets
├── components/
│   ├── art/             # Khatam star, dividers
│   ├── auth/            # Auth shell (split card, day/night sky), lamp toggle, mascot-aware fields
│   ├── icons/           # Journie's own duotone icon set: categories, weather, navigation (preview at /__icons in dev)
│   ├── mascot/          # Jo, the living map-pin mascot, and JoCompanion, the floating pet inside the app
│   ├── map/             # Leaflet route map (OSRM geometry with an offline-safe fallback)
│   ├── motion/          # Reusable motion: RevealHeading, Magnetic, Tilt, CountUp, Coordinates
│   ├── place/           # POI detail sheet (info, reviews, add to trip)
│   ├── scenes/          # Place-based animated backdrops for the landing page
│   ├── trip/            # Timeline (drag and drop), day tabs, stats, plan explanation
│   ├── ui/              # Sheet, toasts, field, segmented control, switch, stars, meters
│   └── weather/         # WeatherLayer (rain, storm, sun, clouds, night) and WeatherChip
├── content/site.ts      # Brand content, destinations and journey chapters
├── domain/              # Pure planning logic: POIs, scoring, solver, replanner, intent extraction, edits
├── hooks/               # Shared React hooks (language, motion preferences, inline translation)
├── i18n/messages.ts     # Vietnamese and English copy for the landing page
├── layouts/             # Landing page chrome
├── pages/               # auth/, app/ (workspace pages) and the landing page
├── sections/            # One file per landing page section
├── store/               # Zustand stores: session, UI state, toasts, notifications, portal transition, weather
├── styles/app.css       # Workspace, auth and mascot styling (landing palette)
├── App.tsx
├── index.css
└── main.tsx
```

## The Journie App

The landing page lives at `/`. Everything else follows the system description in the project report
(React + TypeScript + Vite SPA, TanStack Query for server state, Zustand for transient UI state).

| Route | Report module | What it does |
| --- | --- | --- |
| `/login`, `/register` | Login / Registration | Verify password (with error states), onboarding interests. A split card (Trang An arch photo with Jo on one side, the form on the other) under a live sky. Jo follows the pointer, watches the field you are typing in, covers its eyes for passwords, shakes its head on errors and celebrates success before a portal transition into the app. The lamp button in the password field switches on a beam of light that reveals the password. Day or night, sun, clouds or rain follow the real clock and forecast, or the weather chip. |
| `/app` | Dashboard | Quick trip box, live and upcoming trips, destination picks based on the taste profile. |
| `/app/plan` | Itinerary creation | Natural-language request → extracted constraints (hard vs soft) → editable parameters → pipeline (LLM, data gathering, scoring, CP-SAT-style solve, OSRM routing, time slots) → result with solver status and explanation. |
| `/app/trips/:id` | Itinerary customization | Drag-and-drop (or Alt+Arrow / buttons) reorder, duration stepper, lock mandatory stops, add or remove places. Every edit is re-timed and validated against opening hours and the day window; invalid edits are rejected with the reason. "Ask Jo to adjust" rebuilds the plan from new requests and shows a diff before applying. Undo is available. |
| `/app/trips/:id/live` | Trip management and adaptive replanning | Simulated clock and GPS position, time-budget ring, condition monitor log, and a disruption simulator (traffic, heavy rain, closure, running late). Replanning solves `I' = argmax [Utility(I) − λ·ChangeCost(I, I_old)]` for the λ you pick on a slider. |
| `/app/discover` | Search and discovery | Keyword and contextual search ("coffee near Chùa Cầu"), filters by area, type, price and rating, list and map views, venue details with reviews. |
| `/app/profile` | Profile management | Deliberately short: a name, a few tappable tastes (or a sentence in your own words, which Jo turns into interests and avoid-tags and shows back live), pace, daily budget, foods to avoid, one alerts switch and saved places. |
| `/app/analytics` | Data collection and analytics (Business Admin) | KPIs, trips and replans per day, interaction heatmap, funnel, replan reasons with acceptance and average λ for model tuning, CSV export. |

Demo accounts (also available as one-tap chips on the login page): `lu.khach@journie.vn` (traveler) and
`ba@journie.vn` (Business Admin), both with password `journie123`.

### Planning logic (`src/domain`)

- `scoring.ts` implements Eq. (3) of the report, `S = αC + βR + γP + δB + εG`.
- `solver.ts` is an exact depth-first branch-and-bound for the orienteering problem with time windows. It enforces opening hours, travel time, the day window, budget and mandatory stops. A single-day plan whose search completes is reported `OPTIMAL`; multi-day plans are decomposed per day and reported `FEASIBLE`. It mirrors the OR-Tools CP-SAT model that the backend will use.
- `replan.ts` implements the dynamic incremental replanning objective with a change cost for dropped, added, shifted and re-ordered stops.
- `nlp.ts` stands in for Gemini intent extraction. It is deterministic and only used until the backend exists.
- POI data, hours and prices are approximate demo data.

### Connecting the real backend

`src/api/*` runs against an in-browser mock with the same shapes as the planned FastAPI endpoints, persisted in
`localStorage`. To switch, set `VITE_API_URL` and replace each function body with a `fetch` call; the pages and
TanStack Query hooks do not change. The map requests tiles from `tile.openstreetmap.org` and road geometry from the
public OSRM demo server; when either is unreachable the map still shows pins and straight route hops.

### Design notes

Everything follows the landing page: `paper` ground, `forest` green ink, `terracotta` for action and accents, `sun`
yellow, `jade` and the occasional `dusk` purple. The app tokens (`night`, `midnight`, `lapis`, `firuze`, `pomegranate`,
`gold`) are aliases of those colours, so nothing in the workspace drifts off palette. Corners are near-square with
hairline borders (the `.app-root` scope remaps Tailwind's radius scale), and photos sit in arches like the Trang An
card. Charts use landing-palette hues that were checked with the dataviz validator.

- **Jo** (`components/mascot`) is a living map-pin: a face that blinks and follows the pointer, arms that cover its
  eyes for passwords or wave hello, moods (idle, watching, hiding, peeking, thinking, error, joy, sleepy, wave) and
  outfits taken from the weather (sunglasses, umbrella, night cap). Inside the app `JoCompanion` lives in the corner,
  dozes off after a while, hops when poked and offers tips that fit the sky and the page. It can be sent to rest and
  called back.
- **Weather** (`components/weather`, `store/weatherStore.ts`) is one shared sky for the whole app: `auto` follows the
  clock (night after dusk) and the deterministic forecast, or pin sunny, cloudy, rain, storm or night from the weather
  chip. `WeatherLayer` draws clouds and sun rays with CSS and everything that moves (rain with ground ripples,
  lightning, fireflies, stars, sun motes) on a single canvas that stops itself when idle and pauses when the tab is
  hidden. On the live-trip page, "heavy rain" turns the whole app rainy until the traveler decides on a replan.
- **Icons** (`components/icons`) are drawn on a 48 grid with one ink line and two flat colours printed slightly off
  register. Category, weather and navigation icons share it; open `/__icons` in dev to see the sheet.
- **Discover** is a postcard wall: city "passport stamps" with round photos, sticker-style category buttons, price
  coins that flip when picked, and cards with a postmark, a dotted route that runs on hover and a ticket edge.

## Motion and Scenes

Scrolling the page reads as travelling through Vietnam. Each section has a backdrop drawn for a place:

| Section | Place | Scene |
| --- | --- | --- |
| Hero | Ninh Binh | Limestone towers in layered mist, low sun, birds |
| Story | Ha Giang | Terraced hillsides drifting at different speeds |
| How it works | Hoi An | Swaying lantern canopy and lanterns rising from the river |
| Sample itinerary | Saigon | Skyline at dusk with Landmark 81, Bitexco, twinkling windows and traffic light trails |
| Always adapting | Ha Long | Islets, a junk on the swell, light rain |
| Explore | Six destinations | Photo backdrop with weather and life that change per destination |
| Closing call to action | Phu Quoc | Setting sun, waves and palms |

Notes for working on it:

- Motion uses [`motion`](https://motion.dev) for scroll-linked and in-view animation and [`lenis`](https://lenis.darkroom.engineering) for smooth scrolling. Ambient loops (mist, waves, lanterns) are plain CSS keyframes in `src/index.css`.
- Every scene is wrapped in `SceneFrame`, which pauses its CSS animations while off-screen.
- Under `prefers-reduced-motion`, smooth scroll, parallax, autoplay and particle layers are turned off and content shows in its final state.
- Pointer effects (tilt, magnetic buttons, cursor parallax) only run on devices with a fine pointer and hover.
- Custom CSS classes in `index.css` live in `@layer components`, so Tailwind utilities can override them.
- Scene sizes that must stay visible next to content are set in `rem`, not as a percentage of the section height.
- Landing details: `MagicCursor` (glow ring and a dust trail, mouse only; other components can scatter dust with the `journie:sparkle` window event), `WishLamp` in the hero (rub the lamp for a trip wish), a shooting star in the Saigon sky and a night-sky footer.
- Smoothness: Lenis is driven by motion's frame loop, scroll layers that move are promoted with `will-change`, only the active Explore photo is mounted (Ken Burns runs in CSS), and most animation is transform/opacity so it stays on the compositor. Avoid adding `backdrop-filter` or animated SVG attributes on large areas.
- The footer uses `journie-lockup-light.png`, a recoloured copy of the lockup (forest green to paper) so the logo reads on the dark footer. Regenerate it if the logo changes.
- To add a destination, extend `destinations` in `src/content/site.ts` and add its copy to both languages in `src/i18n/messages.ts`.

## Images and Licenses

Images are downloaded from Wikimedia Commons and stored locally. Each image retains its author's license and is not automatically covered by the source code license.

| Destination | Author | License | Source |
| --- | --- | --- | --- |
| Trang An, Ninh Binh | Jakub Hałun | CC BY 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Trang_An_Landscape_Complex,_Ninh_Binh_Province,_Vietnam,_20240202_1456_5313.jpg) |
| Ha Thanh, Ha Giang | Benjamin Smith | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:H%E1%BA%A1_Th%C3%A0nh,_H%C3%A0_Giang,_Vietnam_-_1.jpg) |
| Hoi An Ancient Town | Steffen Schmitz (Carschten) | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:H%E1%BB%99i_An,_Ancient_Town,_2020-01_CN-06.jpg) |
| Ha Long Bay | Vyacheslav Argenberg | CC BY 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ha_Long_Bay,_Vietnam,_View_from_above.jpg) |
| Phu Quoc Beach | dronepicr | CC BY 2.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Beautiful_beach_on_Phu_Quoc_island_Vietnam_(39543775721).jpg) |
| Saigon River, Ho Chi Minh City | Diego Delso | CC BY-SA 3.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:R%C3%ADo_Saig%C3%B3n,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_29.JPG) |

When replacing an image, update the corresponding file in `src/assets/images`, the data in `src/content/site.ts`, the attribution in the footer, and this image source table

## Agent Skills

Frontend skills installed for this project live in `.claude/skills` (see `skills-lock.json`): `frontend-design`, `vercel-react-best-practices`, `vercel-composition-patterns`, `vercel-react-view-transitions`, `web-design-guidelines`, `webapp-testing`, `theme-factory`, `canvas-design`, `algorithmic-art`, `web-artifacts-builder` and `brand-guidelines`. Restore them with `npx skills experimental_install`.

## Before Deployment

- Run `npm run lint` and `npm run build`.
- Configure the domain, canonical URL, and Open Graph image.
- Test responsiveness at 360px, 768px, 1024px, and 1440px.
- Verify attribution if any images have changed.
- Choose a license for the source code before making the repository public.
