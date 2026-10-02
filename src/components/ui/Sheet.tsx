import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useTr } from '../../hooks/useTr'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** Side sheet slides from the right (default); `center` is a modal for short confirmations. */
  placement?: 'right' | 'center'
  width?: string
  footer?: ReactNode
}

/** Accessible dialog: Escape and backdrop close it, focus moves in and returns to the trigger. */
export function Sheet({ open, onClose, title, description, children, placement = 'right', width = 'max-w-xl', footer }: SheetProps) {
  const { tr } = useTr()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const returnTo = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return
    returnTo.current = document.activeElement
    const timer = window.setTimeout(() => panelRef.current?.focus(), 30)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      ;(returnTo.current as HTMLElement | null)?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-[80] flex ${placement === 'right' ? 'justify-end' : 'items-center justify-center p-4'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button type="button" aria-label={tr('Đóng', 'Close')} tabIndex={-1} className="absolute inset-0 cursor-default bg-night/60" onClick={onClose} />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={placement === 'right' ? { x: '100%' } : { y: 24, scale: 0.96, opacity: 0 }}
            animate={placement === 'right' ? { x: 0 } : { y: 0, scale: 1, opacity: 1 }}
            exit={placement === 'right' ? { x: '100%' } : { y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className={`relative flex max-h-dvh w-full flex-col bg-paper outline-none ${width} ${
              placement === 'right' ? 'h-dvh border-l border-gold/50 shadow-2xl' : 'max-h-[88dvh] rounded-2xl border border-gold/50 shadow-2xl'
            }`}
          >
            <header className="flex items-start justify-between gap-4 border-b border-forest/10 px-5 py-4 sm:px-6">
              <div>
                <h2 id={titleId} className="h-display text-[1.45rem] text-forest">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-ink/60">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center text-ink/55 transition-colors hover:text-terracotta" aria-label={tr('Đóng', 'Close')}>
                <X size={20} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
            {footer && <footer className="border-t border-forest/10 bg-cream/50 px-5 py-4 sm:px-6">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
