import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuthStore, type Role } from '../store/authStore'
import { usePortalStore } from '../store/portalStore'

/** Signed-in visitors skip the auth pages, but only once the portal transition has finished. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const phase = usePortalStore((state) => state.phase)
  if (user && phase === 'idle') return <Navigate to={user.role === 'admin' ? '/app/analytics' : '/app'} replace />
  return <>{children}</>
}

export function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (role && user.role !== role) return <Navigate to="/app" replace />
  return <>{children}</>
}
