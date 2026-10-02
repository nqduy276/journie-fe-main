import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { PortalWipe } from './components/PortalWipe'
import { SiteLayout } from './layouts/SiteLayout'
import { LandingPage } from './pages/LandingPage'
import { useAuthStore, type Role } from './store/authStore'
import { usePortalStore } from './store/portalStore'

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const AppRoutes = lazy(() => import('./app/AppRoutes').then((m) => ({ default: m.AppRoutes })))

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-night" role="status" aria-label="Loading">
      <div className="size-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
    </div>
  )
}

/** Signed-in visitors skip the auth pages, but only once the portal transition has finished. */
function GuestOnly({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const phase = usePortalStore((state) => state.phase)
  if (user && phase === 'idle') return <Navigate to={user.role === 'admin' ? '/app/analytics' : '/app'} replace />
  return <>{children}</>
}

export function RequireAuth({ children, role }: { children: React.ReactNode; role?: Role }) {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (role && user.role !== role) return <Navigate to="/app" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <PortalWipe />
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route
            path="/"
            element={
              <SiteLayout>
                <LandingPage />
              </SiteLayout>
            }
          />
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route
            path="/app/*"
            element={
              <RequireAuth>
                <AppRoutes />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
