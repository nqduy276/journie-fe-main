import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export type Toast = {
  id: number
  tone: ToastTone
  title: string
  body?: string
}

type ToastState = {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>, ttl?: number) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast, ttl = 5200) => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id }] }))
    window.setTimeout(() => get().dismiss(id), ttl)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

export const toast = (tone: ToastTone, title: string, body?: string) =>
  useToastStore.getState().push({ tone, title, body })
