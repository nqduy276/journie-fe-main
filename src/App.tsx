import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { PortalWipe } from './components/PortalWipe'
import { SiteLayout } from './layouts/SiteLayout'
import { LandingPage } from './pages/LandingPage'
import { GuestOnly, RequireAuth } from './app/guards'

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const IconSheet = lazy(() => import('./pages/IconSheet').then((m) => ({ default: m.IconSheet })))
const AppRoutes = lazy(() => import('./app/AppRoutes').then((m) => ({ default: m.AppRoutes })))

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-night" role="status" aria-label="Loading">
      <div className="size-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
    </div>
  )
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
          {import.meta.env.DEV && <Route path="/__icons" element={<IconSheet />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
