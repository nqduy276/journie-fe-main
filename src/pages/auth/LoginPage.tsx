import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Compass, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { demoAccounts, login, requestPasswordReset } from '../../api/auth'
import { ApiError } from '../../api/http'
import { Khatam, StarRule } from '../../components/art/Khatam'
import { AuthShell } from '../../components/auth/AuthShell'
import { useLight } from '../../components/auth/light-context'
import { LampToggle } from '../../components/auth/LampToggle'
import { useMascotField } from '../../components/auth/useMascotField'
import { useMascot } from '../../components/mascot/mascot-context'
import { Field } from '../../components/ui/Field'
import { useTr } from '../../hooks/useTr'
import { useAuthStore, type SessionUser } from '../../store/authStore'
import { usePortalStore } from '../../store/portalStore'
import { toast } from '../../store/toastStore'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const { tr } = useTr()
  const [formError, setFormError] = useState<string | null>(null)

  const lines = {
    idle: tr('Chào bạn! Mình là Di, chú khỉ cưỡi thảm bay của Journie.', "Hi! I'm Di, Journie's carpet-riding monkey."),
    watching: tr('Ghi email nhé. Mình chỉ nhìn thôi!', 'Pop your email in. I only watch!'),
    hiding: tr('Mình nhắm mắt rồi. Mật khẩu của bạn an toàn.', 'Eyes shut. Your password is safe.'),
    peeking: tr('Đèn sáng rồi, mình liếc một chút thôi nha.', 'The lamp is on. Just one little peek!'),
    thinking: tr('Để mình dò đường xem…', 'Let me check the route…'),
    error: formError ?? tr('Ối, có gì đó chưa khớp.', 'Oops, something does not match.'),
    joy: tr('Tuyệt! Mình đi thôi nào!', "Great! Let's go!"),
  }

  return (
    <AuthShell lines={lines}>
      <LoginForm onFormError={setFormError} />
    </AuthShell>
  )
}

function LoginForm({ onFormError }: { onFormError: (message: string | null) => void }) {
  const { tr } = useTr()
  const { setMood, setFocusPoint, originRef } = useMascot()
  const signIn = useAuthStore((state) => state.signIn)
  const openPortal = usePortalStore((state) => state.open)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const light = useLight()
  const lamp = light.on
  const setLamp = light.setOn
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [forgot, setForgot] = useState(false)
  const [done, setDone] = useState(false)
  const typingRef = useRef<number | null>(null)

  const emailField = useMascotField('text')
  const passwordField = useMascotField('secret', lamp)

  const enterApp = (user: SessionUser) => {
    const rect = originRef.current?.getBoundingClientRect()
    const origin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.4 } : undefined
    window.setTimeout(() => {
      signIn(user)
      openPortal(user.role === 'admin' ? '/app/analytics' : '/app', origin)
    }, 1100)
  }

  const mutation = useMutation({
    mutationFn: login,
    onMutate: () => {
      setMood('thinking')
      setFocusPoint(null)
      onFormError(null)
    },
    onSuccess: (user) => {
      setMood('joy')
      setDone(true)
      enterApp(user)
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : 'unknown'
      const message =
        code === 'user_not_found'
          ? tr('Email này chưa có tài khoản. Kiểm tra lại hoặc đăng ký mới.', 'No account uses this email. Check it or sign up.')
          : code === 'invalid_credentials'
            ? tr('Mật khẩu chưa đúng. Thử lại hoặc đặt lại mật khẩu.', 'That password is not right. Try again or reset it.')
            : tr('Không kết nối được máy chủ. Thử lại sau ít phút.', 'Could not reach the server. Try again shortly.')
      if (code === 'user_not_found') setErrors({ email: message })
      else if (code === 'invalid_credentials') setErrors({ password: message })
      onFormError(code === 'invalid_credentials' ? tr('Ối, mật khẩu chưa khớp. Thử lại nhé?', "Oops, that password doesn't match. Try again?") : message)
      setMood('error')
      window.setTimeout(() => setMood('idle'), 2400)
    },
  })

  const busy = mutation.isPending || done

  useEffect(() => () => {
    if (typingRef.current) window.clearTimeout(typingRef.current)
  }, [])

  const validate = () => {
    const next: typeof errors = {}
    if (!email.trim()) next.email = tr('Nhập email bạn đã đăng ký.', 'Enter the email you signed up with.')
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = tr('Email cần có dạng ten@vi-du.com.', 'Email should look like name@example.com.')
    if (!password) next.password = tr('Nhập mật khẩu của bạn.', 'Enter your password.')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (busy) return
    if (!validate()) {
      onFormError(tr('Ối, còn thiếu một chút thông tin.', 'Oops, a little something is missing.'))
      setMood('error')
      window.setTimeout(() => setMood('idle'), 2000)
      return
    }
    mutation.mutate({ email, password })
  }

  /** One-tap demo: types the credentials in character by character while Di reacts, then signs in. */
  const fillDemo = (kind: keyof typeof demoAccounts) => {
    if (busy) return
    const account = demoAccounts[kind]
    setErrors({})
    onFormError(null)
    setEmail('')
    setPassword('')
    setLamp(false)
    let step = 0
    const total = account.email.length + account.password.length
    setMood('watching')
    const tick = () => {
      step += 1
      if (step <= account.email.length) {
        setEmail(account.email.slice(0, step))
        const rect = emailField.ref.current?.getBoundingClientRect()
        if (rect) setFocusPoint({ x: rect.left + Math.min(rect.width - 28, 30 + step * 8.6), y: rect.top + rect.height / 2 })
      } else {
        if (step === account.email.length + 1) {
          setMood('hiding')
          setFocusPoint(null)
        }
        setPassword(account.password.slice(0, step - account.email.length))
      }
      if (step < total) typingRef.current = window.setTimeout(tick, 34)
      else typingRef.current = window.setTimeout(() => mutation.mutate({ email: account.email, password: account.password }), 280)
    }
    tick()
  }

  const reset = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: ({ email: sent }) => {
      toast('success', tr('Đã gửi liên kết đặt lại', 'Reset link sent'), tr(`Kiểm tra hộp thư của ${sent}.`, `Check the inbox of ${sent}.`))
      setForgot(false)
    },
  })

  const validEmail = EMAIL_PATTERN.test(email.trim())

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="h-display text-[2.2rem] text-[color:var(--a-ink)] sm:text-[2.6rem]">{tr('Đăng nhập', 'Sign in')}</h1>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[color:var(--a-muted)]">{tr('Mở tiếp những lịch trình của bạn, Di giữ chỗ sẵn rồi.', 'Pick your itineraries back up. Di saved your spot.')}</p>

      <div className="mt-6">
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="ten@vi-du.com"
          icon={<Mail size={17} />}
          value={email}
          error={errors.email}
          inputRef={emailField.ref}
          onFocus={emailField.onFocus}
          onBlur={emailField.onBlur}
          onChange={(event) => {
            setEmail(event.target.value)
            setErrors((current) => ({ ...current, email: undefined }))
            emailField.track()
          }}
          disabled={busy}
        />
        <Field
          label={tr('Mật khẩu', 'Password')}
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<KeyRound size={17} />}
          value={password}
          error={errors.password}
          inputRef={passwordField.ref}
          lit={{ on: lamp, value: password }}
          hint={lamp ? tr('Rọi đèn vào ô này để đọc mật khẩu.', 'Shine the light on this field to read the password.') : tr('Mẹo: bật đèn pin để đọc mật khẩu và tìm bí mật quanh trang.', 'Tip: switch on the torch to read the password and find secrets around the page.')}
          onFocus={passwordField.onFocus}
          onBlur={passwordField.onBlur}
          onChange={(event) => {
            setPassword(event.target.value)
            setErrors((current) => ({ ...current, password: undefined }))
            passwordField.track()
          }}
          disabled={busy}
          trailing={<LampToggle on={lamp} onToggle={(center) => { setLamp(!lamp); if (!lamp) light.aimAt(center.fieldX, center.fieldY) }} labelOn={tr('Tắt đèn pin', 'Turn the torch off')} labelOff={tr('Bật đèn pin: rọi để đọc mật khẩu', 'Turn the torch on: shine it to read the password')} />}
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-[0.8rem]">
        <label className="flex cursor-pointer items-center gap-2 text-[color:var(--a-ink)]">
          <input type="checkbox" className="peer sr-only" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          <span className="grid size-[1.15rem] place-items-center border border-[color:var(--a-line)] text-transparent transition-colors peer-checked:border-[color:var(--a-primary)] peer-checked:bg-[color:var(--a-primary)] peer-checked:text-[color:var(--a-primary-ink)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta">
            <Khatam size={11} />
          </span>
          {tr('Ghi nhớ tôi', 'Remember me')}
        </label>
        <button type="button" className="font-semibold text-[color:var(--a-accent)] underline-offset-4 hover:underline" onClick={() => setForgot((value) => !value)} aria-expanded={forgot}>
          {tr('Quên mật khẩu?', 'Forgot password?')}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {forgot && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 border border-dashed border-[color:var(--a-line)] p-3">
              <p className="text-xs leading-relaxed text-[color:var(--a-muted)]">{tr('Di sẽ gửi liên kết đặt lại mật khẩu tới email ở trên.', 'Di will send a reset link to the email above.')}</p>
              <button type="button" className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[color:var(--a-accent)] disabled:opacity-50" disabled={reset.isPending || !validEmail} onClick={() => reset.mutate(email.trim())}>
                {reset.isPending && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
                {validEmail ? tr('Gửi liên kết', 'Send link') : tr('Nhập email hợp lệ trước', 'Enter a valid email first')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button type="submit" className="auth-btn mt-5" disabled={busy}>
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.span key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2">
              <ShieldCheck size={18} aria-hidden="true" /> {tr('Đã xác thực', 'Verified')}
            </motion.span>
          ) : mutation.isPending ? (
            <motion.span key="load" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2">
              <Khatam size={16} className="!animate-[spin-slow_2.4s_linear_infinite]" /> {tr('Đang dò đường…', 'Checking the route…')}
            </motion.span>
          ) : (
            <motion.span key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {tr('Đăng nhập', 'Sign in')}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {mutation.isError && !(mutation.error instanceof ApiError) && (
          <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex items-start gap-2 overflow-hidden border-l-2 border-[color:var(--a-error)] px-3 py-2 text-xs font-medium text-[color:var(--a-error)]">
            <AlertCircle size={15} className="mt-px shrink-0" aria-hidden="true" />
            {tr('Có lỗi xảy ra. Vui lòng thử lại.', 'Something went wrong. Please try again.')}
          </motion.p>
        )}
      </AnimatePresence>

      <StarRule className="my-5 !text-[color:var(--a-accent)]" />

      <p className="mb-2.5 text-center text-xs text-[color:var(--a-muted)]">{tr('Muốn xem thử ngay? Dùng tài khoản mẫu:', 'Want a look around? Use a demo account:')}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" className="demo-chip" onClick={() => fillDemo('traveler')} disabled={busy}>
          <Compass size={16} aria-hidden="true" />
          <span>
            <strong>{tr('Lữ khách', 'Traveler')}</strong>
            <small>{tr('Lập và đi chuyến', 'Plan and travel')}</small>
          </span>
        </button>
        <button type="button" className="demo-chip" onClick={() => fillDemo('admin')} disabled={busy}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            <strong>Business Admin</strong>
            <small>{tr('Báo cáo, phân tích', 'Reports, analytics')}</small>
          </span>
        </button>
      </div>

      <p className="mt-5 text-center text-[0.84rem] text-[color:var(--a-muted)]">
        {tr('Chưa có tài khoản?', 'New here?')}{' '}
        <Link to="/register" className="font-bold text-[color:var(--a-accent)] underline-offset-4 hover:underline">
          {tr('Đăng ký miễn phí', 'Create a free account')}
        </Link>
      </p>
    </form>
  )
}
