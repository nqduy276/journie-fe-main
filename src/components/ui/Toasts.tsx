import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react'
import { useToastStore, type ToastTone } from '../../store/toastStore'

const TONES: Record<ToastTone, { icon: typeof Info; ring: string; text: string }> = {
  info: { icon: Info, ring: 'border-lapis/40', text: 'text-lapis' },
  success: { icon: CheckCircle2, ring: 'border-firuze/60', text: 'text-jade-ink' },
  warning: { icon: AlertTriangle, ring: 'border-sun/70', text: 'text-sun-ink' },
  danger: { icon: XCircle, ring: 'border-pomegranate/60', text: 'text-pomegranate' },
}

export function Toasts() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[95] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-8" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONES[toast.tone]
          const Icon = tone.icon
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 border-l-4 bg-paper px-4 py-3 shadow-[0_18px_40px_-16px_rgba(9,13,43,0.6)] ${tone.ring}`}
              role={toast.tone === 'danger' || toast.tone === 'warning' ? 'alert' : 'status'}
            >
              <Icon size={19} className={`mt-0.5 shrink-0 ${tone.text}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{toast.title}</p>
                {toast.body && <p className="mt-0.5 text-[0.82rem] leading-snug text-ink/70">{toast.body}</p>}
              </div>
              <button type="button" className="text-ink/40 transition-colors hover:text-ink" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
                <X size={16} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
