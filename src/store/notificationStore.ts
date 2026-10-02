import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationKind = 'traffic' | 'closure' | 'weather' | 'delay' | 'info' | 'success'

export type AppNotification = {
  id: string
  kind: NotificationKind
  vi: string
  en: string
  bodyVi?: string
  bodyEn?: string
  at: string
  read: boolean
  to?: string
}

type State = {
  items: AppNotification[]
  push: (item: Omit<AppNotification, 'id' | 'at' | 'read'>) => void
  markAllRead: () => void
  clear: () => void
}

export const useNotificationStore = create<State>()(
  persist(
    (set) => ({
      items: [],
      push: (item) =>
        set((state) => ({
          items: [{ ...item, id: `n${Date.now().toString(36)}`, at: new Date().toISOString(), read: false }, ...state.items].slice(0, 20),
        })),
      markAllRead: () => set((state) => ({ items: state.items.map((item) => ({ ...item, read: true })) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'journie-notifications', version: 1 },
  ),
)
