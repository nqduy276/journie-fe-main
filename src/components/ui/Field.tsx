import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle } from 'lucide-react'

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string
  icon?: ReactNode
  error?: string
  hint?: string
  /** Slot on the right edge, e.g. the lamp that reveals a password. */
  trailing?: ReactNode
  /** Drawn over the field (the lamp's light beam). */
  beam?: ReactNode
  inputRef?: Ref<HTMLInputElement>
  inputClassName?: string
}

/** Labelled input for the auth pages. Colours come from the `--a-*` variables so it works by day and by night. */
export function Field({ label, icon, error, hint, trailing, beam, inputRef, inputClassName = '', className = '', id, ...rest }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-[0.78rem] font-semibold text-[color:var(--a-ink)]">
        {label}
      </label>
      <motion.div
        animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        key={error ? 'err' : 'ok'}
        data-error={error ? 'true' : undefined}
        className="field-shell relative flex items-center"
      >
        {icon && (
          <span className="pl-3.5 text-[color:var(--a-muted)]" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          ref={inputRef}
          className={`field-input h-12 min-w-0 flex-1 bg-transparent px-3 text-[0.95rem] outline-none ${inputClassName}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${inputId}-note` : undefined}
          {...rest}
        />
        {trailing && <span className="relative z-[3] pr-1.5">{trailing}</span>}
        {beam}
      </motion.div>
      <div id={`${inputId}-note`} className="min-h-5 pt-1.5 text-xs" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {error ? (
            <motion.p key="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-1.5 font-medium text-[color:var(--a-error)]">
              <AlertCircle size={14} className="mt-px shrink-0" aria-hidden="true" />
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[color:var(--a-muted)]">
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
