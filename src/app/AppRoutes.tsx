import { lazy, Suspense } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router'
import { Skeleton } from '../components/ui/primitives'
import { useTr } from '../hooks/useTr'
import { useAuthStore } from '../store/authStore'
import { AppShell } from './AppShell'
import { RequireAuth } from './guards'

const lazyPage = <T extends Record<string, React.ComponentType>>(loader: () => Promise<T>, name: keyof T & string) =>
  lazy(() => loader().then((module) => ({ default: module[name] })))

const Dashboard = lazyPage(() => import('../pages/app/Dashboard'), 'Dashboard')
const PlanPage = lazyPage(() => import('../pages/app/PlanPage'), 'PlanPage')
const TripsPage = lazyPage(() => import('../pages/app/TripsPage'), 'TripsPage')
const TripPage = lazyPage(() => import('../pages/app/TripPage'), 'TripPage')
const LivePage = lazyPage(() => import('../pages/app/LivePage'), 'LivePage')
const DiscoverPage = lazyPage(() => import('../pages/app/DiscoverPage'), 'DiscoverPage')
const ProfilePage = lazyPage(() => import('../pages/app/ProfilePage'), 'ProfilePage')
const AnalyticsPage = lazyPage(() => import('../pages/app/AnalyticsPage'), 'AnalyticsPage')

function PageFallback() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 pt-4 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  )
}

function Home() {
  const role = useAuthStore((state) => state.user?.role)
  return role === 'admin' ? <Navigate to="/app/analytics" replace /> : <Dashboard />
}

function NotFound() {
  const { tr } = useTr()
  return (
    <div className="panel mx-auto mt-10 max-w-lg px-6 py-12 text-center">
      <p className="h-display text-5xl text-gold">404</p>
      <h1 className="h-display mt-2 text-2xl text-forest">{tr('Lạc đường rồi', 'You wandered off the map')}</h1>
      <p className="mt-2 text-sm text-ink/60">{tr('Trang này không tồn tại hoặc đã được dời đi.', 'This page does not exist or has moved.')}</p>
      <Link to="/app" className="btn-gold mt-6">
        {tr('Về trang chủ', 'Back home')}
      </Link>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <Suspense fallback={<PageFallback />}>
              <Home />
            </Suspense>
          }
        />
        {[
          ['plan', PlanPage],
          ['trips', TripsPage],
          ['trips/:id', TripPage],
          ['trips/:id/live', LivePage],
          ['discover', DiscoverPage],
          ['profile', ProfilePage],
        ].map(([path, Page]) => {
          const Component = Page as React.ComponentType
          return (
            <Route
              key={path as string}
              path={path as string}
              element={
                <Suspense fallback={<PageFallback />}>
                  <Component />
                </Suspense>
              }
            />
          )
        })}
        <Route
          path="analytics"
          element={
            <RequireAuth role="admin">
              <Suspense fallback={<PageFallback />}>
                <AnalyticsPage />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
