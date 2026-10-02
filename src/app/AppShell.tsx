import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, LogOut } from 'lucide-react'
import { useTrips } from '../api/queries'
import { NavIcon, type NavIconName } from '../components/icons'
import { LangSwitch } from '../components/LangSwitch'
import { MagicCursor } from '../components/MagicCursor'
import { DiCompanion } from '../components/mascot/DiCompanion'
import { Toasts } from '../components/ui/Toasts'
import { SkyBody } from '../components/weather/SkyBody'
import { WeatherChip } from '../components/weather/WeatherChip'
import { WeatherLayer } from '../components/weather/WeatherLayer'
import { siteConfig } from '../content/site'
import { cityById } from '../domain/pois'
import { useTr } from '../hooks/useTr'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import { usePortalStore } from '../store/portalStore'
import { useMascotPrefs } from '../store/mascotStore'
import { useSky } from '../store/weatherStore'
import { fmtTime } from '../domain/time'

type NavItem = { to: string; end?: boolean; icon: NavIconName; vi: string; en: string }

const travelerNav: NavItem[] = [
  { to: '/app', end: true, icon: 'home', vi: 'Trang chủ', en: 'Home' },
  { to: '/app/plan', icon: 'plan', vi: 'Tạo lịch trình', en: 'New itinerary' },
  { to: '/app/trips', icon: 'trips', vi: 'Chuyến đi', en: 'My trips' },
  { to: '/app/discover', icon: 'discover', vi: 'Khám phá', en: 'Discover' },
  { to: '/app/profile', icon: 'profile', vi: 'Hồ sơ & sở thích', en: 'Profile' },
]

const adminNav: NavItem[] = [
  { to: '/app/analytics', icon: 'analytics', vi: 'Phân tích', en: 'Analytics' },
  { to: '/app/discover', icon: 'discover', vi: 'Dữ liệu điểm đến', en: 'Places data' },
  { to: '/app/profile', icon: 'profile', vi: 'Tài khoản', en: 'Account' },
]

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full border-2 border-sun bg-forest text-[0.72rem] font-bold text-sun" style={{ width: size, height: size }} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { tr } = useTr()
  return (
    <nav className="flex flex-col gap-1" aria-label={tr('Điều hướng chính', 'Main navigation')}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className="nav-link group" onClick={onNavigate}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="nav-tab" className="absolute inset-0 border-l-[3px] border-sun bg-paper/[0.09]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <motion.span className="relative block" whileHover={{ rotate: -8, scale: 1.12 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
                <NavIcon name={item.icon} size={26} />
              </motion.span>
              <span className="relative">{tr(item.vi, item.en)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/** Di's two switches: out or resting, and trailing the pointer or waiting in the corner. */
function DiControls() {
  const { tr } = useTr()
  const hidden = useMascotPrefs((state) => state.hidden)
  const follow = useMascotPrefs((state) => state.follow)
  const setHidden = useMascotPrefs((state) => state.setHidden)
  const setFollow = useMascotPrefs((state) => state.setFollow)
  return (
    <div className="mb-3 flex items-center justify-between gap-2 border border-paper/12 px-3 py-2 text-[0.72rem] text-paper/75">
      <button type="button" role="switch" aria-checked={follow && !hidden} disabled={hidden} onClick={() => setFollow(!follow)} className="flex items-center gap-2 disabled:opacity-40">
        <span className={`relative h-4 w-7 rounded-full transition-colors ${follow && !hidden ? 'bg-sun' : 'bg-paper/25'}`}>
          <span className={`absolute top-0.5 size-3 rounded-full bg-night transition-all ${follow && !hidden ? 'left-[0.875rem]' : 'left-0.5'}`} />
        </span>
        {tr('Di theo con trỏ', 'Di follows')}
      </button>
      <button type="button" onClick={() => setHidden(!hidden)} className="font-semibold text-sun transition-colors hover:text-terracotta">
        {hidden ? tr('Gọi Di', 'Call Di') : tr('Cho Di nghỉ', 'Rest Di')}
      </button>
    </div>
  )
}

function LiveChip() {
  const { tr } = useTr()
  const { data: trips } = useTrips()
  const live = trips?.find((trip) => trip.status === 'live')
  if (!live) return null
  const city = cityById[live.city]
  return (
    <Link
      to={`/app/trips/${live.id}/live`}
      className="group relative mt-6 block overflow-hidden border border-firuze/45 bg-firuze/10 p-3 transition-colors hover:bg-firuze/20"
    >
      <span className="flex items-center gap-2 text-[0.7rem] font-bold text-firuze">
        <span className="pulse-dot size-2 rounded-full bg-firuze" aria-hidden="true" />
        {tr('Đang đi', 'On the road')}
      </span>
      <span className="mt-1 block text-sm font-semibold text-paper">{live.title}</span>
      <span className="mt-0.5 block text-xs text-paper/60">
        {city.name} · {fmtTime(live.dayStart)}–{fmtTime(live.dayEnd)}
      </span>
    </Link>
  )
}

function NotificationBell({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { tr, language } = useTr()
  const { items, markAllRead, clear } = useNotificationStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = items.filter((item) => !item.read).length

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value)
          if (!open) markAllRead()
        }}
        className={`relative grid size-11 place-items-center transition-colors ${tone === 'dark' ? 'text-paper/80 hover:text-sun' : 'text-ink/70 hover:text-terracotta'}`}
        aria-label={tr('Thông báo', 'Notifications')}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-pomegranate text-[0.6rem] font-bold text-white"
          >
            {unread}
          </motion.span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-1 w-[min(22rem,calc(100vw-2rem))] origin-top-right overflow-hidden border border-forest/25 bg-paper text-ink shadow-[0_24px_50px_-20px_rgba(13,40,34,0.6)]"
          >
            <div className="flex items-center justify-between border-b border-forest/10 px-4 py-3">
              <p className="text-sm font-bold">{tr('Thông báo', 'Notifications')}</p>
              {items.length > 0 && (
                <button className="text-xs font-semibold text-terracotta hover:underline" onClick={clear}>
                  {tr('Xóa tất cả', 'Clear all')}
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink/55">{tr('Chưa có thông báo. Di sẽ báo khi kế hoạch cần đổi.', 'Nothing yet. Di will tell you when a plan needs to change.')}</li>}
              {items.map((item) => (
                <li key={item.id} className="border-b border-forest/8 px-4 py-3 last:border-0">
                  <Link to={item.to ?? '/app'} onClick={() => setOpen(false)} className="block">
                    <p className="text-sm font-semibold">{language === 'vi' ? item.vi : item.en}</p>
                    {(item.bodyVi || item.bodyEn) && <p className="mt-0.5 text-[0.8rem] leading-snug text-ink/65">{language === 'vi' ? item.bodyVi : item.bodyEn}</p>}
                    <p className="mt-1 text-[0.68rem] text-ink/45">{new Date(item.at).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AppShell() {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const signOut = useAuthStore((state) => state.signOut)
  const openPortal = usePortalStore((state) => state.open)
  const location = useLocation()
  const sky = useSky()
  const items = user.role === 'admin' ? adminNav : travelerNav

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  // The workspace theme is keyed on the root element so portals (sheets, toasts) follow it too.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.appPhase = sky.phase
    root.dataset.appWeather = sky.weather
    return () => {
      delete root.dataset.appPhase
      delete root.dataset.appWeather
    }
  }, [sky.phase, sky.weather])

  const logout = () => {
    signOut()
    openPortal('/login')
  }

  return (
    <div className="app-bg app-root min-h-dvh lg:pl-[17.5rem]" data-phase={sky.phase} data-weather={sky.weather}>
      <MagicCursor />
      <SkyBody phase={sky.phase} weather={sky.weather} />
      <WeatherLayer phase={sky.phase} weather={sky.weather} calm />
      <a href="#app-main" className="skip-link">
        {tr('Bỏ qua điều hướng', 'Skip navigation')}
      </a>

      <aside className="sidebar fixed inset-y-0 left-0 z-40 hidden w-[17.5rem] flex-col px-5 py-6 lg:flex">
        <Link to={user.role === 'admin' ? '/app/analytics' : '/app'} className="group flex items-center gap-3" aria-label="Journie">
          <img src={siteConfig.logoLockupLight} alt="" width="600" height="600" className="-ml-2 h-[5.5rem] w-auto transition-transform duration-500 group-hover:-rotate-3" />
          <span className="sr-only">Journie</span>
        </Link>

        <div className="mt-7 flex-1 overflow-y-auto">
          <NavList items={items} />
          {user.role === 'traveler' && <LiveChip />}
        </div>

        <div className="mt-4 border-t border-paper/12 pt-4">
          <DiControls />
          <WeatherChip tone="dark" direction="up" />
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-paper">{user.name}</p>
              <p className="truncate text-xs text-paper/55">{user.role === 'admin' ? 'Business Admin' : tr('Lữ khách', 'Traveler')}</p>
            </div>
            <button type="button" onClick={logout} className="grid size-10 place-items-center text-paper/55 transition-colors hover:text-terracotta" aria-label={tr('Đăng xuất', 'Sign out')} title={tr('Đăng xuất', 'Sign out')}>
              <LogOut size={18} />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <LangSwitch />
            <NotificationBell tone="dark" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-forest/12 bg-paper/90 px-3 backdrop-blur lg:hidden">
        <Link to={user.role === 'admin' ? '/app/analytics' : '/app'} className="flex items-center gap-2" aria-label="Journie">
          <img src={siteConfig.logoMark} alt="" width="384" height="512" className="h-10 w-auto" />
          <span className="h-display text-xl text-forest max-[400px]:sr-only">Journie</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <WeatherChip tone="light" align="right" compact />
          <LangSwitch tone="light" />
          <NotificationBell />
          <button type="button" onClick={logout} className="grid size-10 place-items-center text-ink/60" aria-label={tr('Đăng xuất', 'Sign out')}>
            <LogOut size={19} />
          </button>
        </div>
      </header>

      <main id="app-main" className="relative z-10 mx-auto w-full max-w-[90rem] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-9">
        <motion.div key={location.pathname.split('/').slice(0, 4).join('/')} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
          <Outlet />
        </motion.div>
      </main>

      <MobileTabs items={items} />
      <DiCompanion />
      <Toasts />
    </div>
  )
}

function MobileTabs({ items }: { items: NavItem[] }) {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  const tabs = user.role === 'admin' ? items : [items[0], items[2], items[1], items[3], items[4]]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sun/30 bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label={tr('Điều hướng di động', 'Mobile navigation')}>
      <ul className={`mx-auto grid max-w-md ${tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-3'}`}>
        {tabs.map((item, index) => {
          const center = user.role === 'traveler' && index === 2
          return (
            <li key={item.to} className="flex justify-center">
              <NavLink to={item.to} end={item.end} className="relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.62rem] font-semibold text-paper/65 aria-[current=page]:text-sun">
                {center ? (
                  <span className="-mt-7 grid size-14 place-items-center rounded-full bg-sun text-forest shadow-[0_10px_24px_-8px_rgba(240,185,75,0.8)] ring-4 ring-night">
                    <NavIcon name={item.icon} size={30} tone={{ a: '#d96745', b: '#fbf5e6' }} />
                  </span>
                ) : (
                  <NavIcon name={item.icon} size={25} />
                )}
                <span className={center ? 'sr-only' : ''}>{tr(item.vi, item.en).split(' ').slice(0, 2).join(' ')}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
