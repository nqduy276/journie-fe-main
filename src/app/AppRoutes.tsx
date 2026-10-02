import { Link } from 'react-router'
import { useAuthStore } from '../store/authStore'
import { usePortalStore } from '../store/portalStore'

/** Placeholder until the workspace pages land; proves login and the portal transition end to end. */
export function AppRoutes() {
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const open = usePortalStore((state) => state.open)
  return (
    <div className="grid min-h-dvh place-items-center bg-paper p-8 text-ink">
      <div className="text-center">
        <h1 className="font-display text-4xl">Xin chào, {user?.name}</h1>
        <p className="mt-2 text-ink/60">{user?.role}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="btn-ghost">Trang chủ</Link>
          <button
            className="btn-night"
            onClick={() => {
              signOut()
              open('/login')
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  )
}
