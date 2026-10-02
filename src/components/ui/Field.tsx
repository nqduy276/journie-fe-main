import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle } from 'lucide-react'

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string
  icon?: ReactNode
  error?: string
  hint?: string
  /** Slot on the right edge, e.g. a show-password toggle. */
  trailing?: ReactNode
  inputRef?: Ref<HTMLInputElement>
}

/** Labelled input with an animated focus rule and an error that explains how to fix it. */
export function Field({ label, icon, error, hint, trailing, inputRef, className = '', id, onFocus, onBlur, ...rest }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [focused, setFocused] = useState(false)

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-[0.78rem] font-semibold text-ink/80">
        {label}
      </label>
      <motion.div
        animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        key={error ? 'err' : 'ok'}
        className={`field-shell relative flex items-center border bg-white/80 transition-colors duration-300 ${
          error ? 'border-pomegranate/70' : focused ? 'border-lapis/60' : 'border-forest/20 hover:border-forest/40'
        }`}
      >
        {icon && (
          <span className={`pl-3.5 transition-colors duration-300 ${focused ? 'text-lapis' : 'text-ink/40'}`} aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          ref={inputRef}
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[0.95rem] text-ink outline-none placeholder:text-ink/35"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${inputId}-note` : undefined}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          {...rest}
        />
        {trailing && <span className="pr-1.5">{trailing}</span>}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left bg-gradient-to-r from-firuze via-gold to-pomegranate transition-transform duration-500 ${
            focused ? 'scale-x-100' : 'scale-x-0'
          }`}
        />
      </motion.div>
      <div id={`${inputId}-note`} className="min-h-5 pt-1.5 text-xs" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {error ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-1.5 font-medium text-pomegranate"
            >
              <AlertCircle size={14} className="mt-px shrink-0" aria-hidden="true" />
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-ink/55">
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
