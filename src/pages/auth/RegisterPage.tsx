import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { KeyRound, Mail, UserRound } from 'lucide-react'
import { saveOnboarding } from '../../api/profile'
import { register } from '../../api/auth'
import { ApiError } from '../../api/http'
import { Khatam } from '../../components/art/Khatam'
import { AuthShell } from '../../components/auth/AuthShell'
import { useLight } from '../../components/auth/light-context'
import { LampToggle } from '../../components/auth/LampToggle'
import { useMascotField } from '../../components/auth/useMascotField'
import { CategoryIcon } from '../../components/icons'
import { useMascot } from '../../components/mascot/mascot-context'
import { Field } from '../../components/ui/Field'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { usePortalStore } from '../../store/portalStore'
import type { CategoryId } from '../../domain/types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const STYLES: { id: CategoryId; vi: string; en: string }[] = [
  { id: 'food', vi: 'Ăn ngon', en: 'Food' },
  { id: 'culture', vi: 'Văn hóa', en: 'Culture' },
  { id: 'nature', vi: 'Thiên nhiên', en: 'Nature' },
  { id: 'beach', vi: 'Biển', en: 'Beach' },
  { id: 'cafe', vi: 'Cà phê', en: 'Cafés' },
  { id: 'adventure', vi: 'Phiêu lưu', en: 'Adventure' },
]

/** 0-5: length plus character variety. Drives the five stars that light up. */
function strengthOf(password: string) {
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

export function RegisterPage() {
  const { tr } = useTr()
  const [formError, setFormError] = useState<string | null>(null)

  const lines = {
    idle: tr('Bạn mới à? Cho mình biết tên để còn gọi nhé!', 'A new traveler! Tell me your name so I can greet you.'),
    watching: tr('Hay quá, mình nhớ rồi.', 'Lovely, I will remember that.'),
    hiding: tr('Chọn mật khẩu mạnh nhé, mình không nhìn đâu.', "Pick a strong one. I'm not looking."),
    peeking: tr('Đèn sáng rồi, mình liếc một chút thôi!', 'The lamp is on. Just one peek!'),
    thinking: tr('Đang chuẩn bị tấm bản đồ riêng cho bạn…', 'Drawing your own map…'),
    error: formError ?? tr('Ối, kiểm tra lại giúp mình nhé.', 'Oops, please check that again.'),
    joy: tr('Chào mừng đến Journie! Đi thôi nào!', "Welcome to Journie! Let's go!"),
  }

  return (
    <AuthShell lines={lines}>
      <RegisterForm onFormError={setFormError} />
    </AuthShell>
  )
}

function RegisterForm({ onFormError }: { onFormError: (message: string | null) => void }) {
  const { tr } = useTr()
  const { setMood, originRef } = useMascot()
  const signIn = useAuthStore((state) => state.signIn)
  const openPortal = usePortalStore((state) => state.open)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const light = useLight()
  const lamp = light.on
  const setLamp = light.setOn
  const [styles, setStyles] = useState<string[]>([])
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})
  const [done, setDone] = useState(false)

  const nameField = useMascotField('text')
  const emailField = useMascotField('text')
  const passwordField = useMascotField('secret', lamp)
  const strength = strengthOf(password)
  const strengthLabel = [tr('Quá ngắn', 'Too short'), tr('Yếu', 'Weak'), tr('Tạm được', 'Fair'), tr('Khá tốt', 'Good'), tr('Mạnh', 'Strong'), tr('Rất mạnh', 'Excellent')][password ? Math.max(1, strength) : 0]

  const mutation = useMutation({
    mutationFn: register,
    onMutate: () => {
      setMood('thinking')
      onFormError(null)
    },
    onSuccess: (user) => {
      saveOnboarding(user.id, styles)
      setMood('joy')
      setDone(true)
      const rect = originRef.current?.getBoundingClientRect()
      const origin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.4 } : undefined
      window.setTimeout(() => {
        signIn(user)
        openPortal('/app', origin)
      }, 1100)
    },
    onError: (error) => {
      const taken = error instanceof ApiError && error.code === 'email_taken'
      const message = taken ? tr('Email này đã có tài khoản. Hãy đăng nhập thay vì đăng ký.', 'This email already has an account. Sign in instead.') : tr('Không kết nối được máy chủ.', 'Could not reach the server.')
      if (taken) setErrors({ email: message })
      onFormError(taken ? tr('Email này có người dùng rồi!', 'That email is already taken!') : message)
      setMood('error')
      window.setTimeout(() => setMood('idle'), 2400)
    },
  })

  const busy = mutation.isPending || done

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = tr('Cho Di biết tên bạn (ít nhất 2 ký tự).', 'Tell Di your name (2+ characters).')
    if (!EMAIL_PATTERN.test(email.trim())) next.email = tr('Email cần có dạng ten@vi-du.com.', 'Email should look like name@example.com.')
    if (password.length < 6) next.password = tr('Mật khẩu cần ít nhất 6 ký tự.', 'Password needs at least 6 characters.')
    setErrors(next)
    if (Object.keys(next).length) {
      onFormError(tr('Ối, còn vài ô chưa ổn.', 'Oops, a few fields need attention.'))
      setMood('error')
      window.setTimeout(() => setMood('idle'), 2000)
      return
    }
    mutation.mutate({ name, email, password })
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="h-display text-[2.1rem] text-[color:var(--a-ink)] sm:text-[2.5rem]">{tr('Tạo tài khoản', 'Create account')}</h1>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[color:var(--a-muted)]">{tr('Để Di lập lịch trình hợp gu bạn.', 'So Di can plan trips that fit you.')}</p>

      <div className="mt-5">
        <Field
          label={tr('Tên của bạn', 'Your name')}
          name="name"
          autoComplete="name"
          placeholder={tr('Nguyễn Minh Anh', 'Alex Nguyen')}
          icon={<UserRound size={17} />}
          value={name}
          error={errors.name}
          inputRef={nameField.ref}
          onFocus={nameField.onFocus}
          onBlur={nameField.onBlur}
          onChange={(event) => {
            setName(event.target.value)
            setErrors((current) => ({ ...current, name: undefined }))
            nameField.track()
          }}
          disabled={busy}
        />
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
          name="new-password"
          autoComplete="new-password"
          placeholder={tr('Ít nhất 6 ký tự', 'At least 6 characters')}
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
        <div className="-mt-2 mb-3 flex items-center gap-3" aria-live="polite">
          <div className="flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <motion.span key={index} animate={{ scale: strength > index ? [1, 1.35, 1] : 1, rotate: strength > index ? 45 : 0 }} transition={{ duration: 0.4 }} className={strength > index ? 'text-sun drop-shadow-[0_0_6px_rgba(240,185,75,0.9)]' : 'text-[color:var(--a-ink)] opacity-20'}>
                <Khatam size={15} />
              </motion.span>
            ))}
          </div>
          <span className="text-xs font-medium text-[color:var(--a-muted)]">{strengthLabel}</span>
        </div>
      </div>

      <fieldset className="mb-5">
        <legend className="mb-2 text-[0.78rem] font-semibold text-[color:var(--a-ink)]">{tr('Bạn thích đi kiểu nào? (không bắt buộc)', 'What kind of traveler are you? (optional)')}</legend>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((style) => {
            const active = styles.includes(style.id)
            return (
              <button key={style.id} type="button" aria-pressed={active} onClick={() => setStyles((current) => (active ? current.filter((id) => id !== style.id) : [...current, style.id]))} className="auth-chip">
                <CategoryIcon cat={style.id} size={20} />
                {tr(style.vi, style.en)}
              </button>
            )
          })}
        </div>
      </fieldset>

      <button type="submit" className="auth-btn" disabled={busy}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={done ? 'd' : mutation.isPending ? 'l' : 'i'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2">
            {mutation.isPending && <Khatam size={16} className="!animate-[spin-slow_2.4s_linear_infinite]" />}
            {done ? tr('Chào mừng!', 'Welcome!') : mutation.isPending ? tr('Đang chuẩn bị…', 'Getting ready…') : tr('Tạo tài khoản', 'Create account')}
          </motion.span>
        </AnimatePresence>
      </button>

      <p className="mt-5 text-center text-[0.84rem] text-[color:var(--a-muted)]">
        {tr('Đã có tài khoản?', 'Already have an account?')}{' '}
        <Link to="/login" className="font-bold text-[color:var(--a-accent)] underline-offset-4 hover:underline">
          {tr('Đăng nhập', 'Sign in')}
        </Link>
      </p>
    </form>
  )
}
