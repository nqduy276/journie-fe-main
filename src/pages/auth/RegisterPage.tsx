import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, EyeOff, KeyRound, Mail, UserRound } from 'lucide-react'
import { register } from '../../api/auth'
import { ApiError } from '../../api/http'
import { ArchCard } from '../../components/auth/ArchCard'
import { AuthShell } from '../../components/auth/AuthShell'
import { useGenie } from '../../components/auth/genie-context'
import { useGenieField } from '../../components/auth/useGenieField'
import { Khatam } from '../../components/art/Khatam'
import { Field } from '../../components/ui/Field'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { usePortalStore } from '../../store/portalStore'
import { saveOnboarding } from '../../api/profile'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const STYLES = [
  { id: 'food', vi: 'Ăn ngon', en: 'Food' },
  { id: 'culture', vi: 'Văn hóa', en: 'Culture' },
  { id: 'nature', vi: 'Thiên nhiên', en: 'Nature' },
  { id: 'beach', vi: 'Biển', en: 'Beach' },
  { id: 'cafe', vi: 'Cà phê', en: 'Cafés' },
  { id: 'adventure', vi: 'Phiêu lưu', en: 'Adventure' },
] as const

/** 0-4: length plus character variety. Drives the five stars that light up like a lamp. */
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
    idle: tr('Chào bạn mới! Cho tôi biết tên để tôi còn gọi chứ.', "A new traveler! Tell me your name so I can greet you."),
    watching: tr('Tuyệt, tôi ghi nhớ rồi.', 'Lovely, I will remember that.'),
    hiding: tr('Chọn mật khẩu mạnh nhé, tôi không nhìn đâu.', "Pick a strong one. I'm not looking."),
    peeking: tr('Chỉ một con mắt thôi, hứa!', 'One eye only, promise!'),
    thinking: tr('Đang thắp một ngọn đèn mới cho bạn…', 'Lighting a new lamp for you…'),
    error: formError ?? tr('Ối, kiểm tra lại giúp tôi nhé.', 'Oops, please check that again.'),
    joy: tr('Chào mừng đến Journie! Hành trình đầu tiên đang chờ.', 'Welcome to Journie! Your first journey awaits.'),
  }

  return (
    <AuthShell lines={lines}>
      <RegisterForm onFormError={setFormError} />
    </AuthShell>
  )
}

function RegisterForm({ onFormError }: { onFormError: (message: string | null) => void }) {
  const { tr } = useTr()
  const { setMood, originRef } = useGenie()
  const signIn = useAuthStore((state) => state.signIn)
  const openPortal = usePortalStore((state) => state.open)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [styles, setStyles] = useState<string[]>([])
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})
  const [done, setDone] = useState(false)

  const nameField = useGenieField('text')
  const emailField = useGenieField('text')
  const passwordField = useGenieField('secret', reveal)
  const strength = strengthOf(password)
  const strengthLabel = [
    tr('Quá ngắn', 'Too short'),
    tr('Yếu', 'Weak'),
    tr('Tạm được', 'Fair'),
    tr('Khá tốt', 'Good'),
    tr('Mạnh', 'Strong'),
    tr('Rất mạnh', 'Excellent'),
  ][password ? Math.max(1, strength) : 0]

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
      const origin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.35 } : undefined
      window.setTimeout(() => {
        signIn(user)
        openPortal('/app', origin)
      }, 1100)
    },
    onError: (error) => {
      const taken = error instanceof ApiError && error.code === 'email_taken'
      const message = taken
        ? tr('Email này đã có tài khoản. Hãy đăng nhập thay vì đăng ký.', 'This email already has an account. Sign in instead.')
        : tr('Không kết nối được máy chủ.', 'Could not reach the server.')
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
    if (name.trim().length < 2) next.name = tr('Cho Jinnie biết tên bạn (ít nhất 2 ký tự).', 'Tell Jinnie your name (2+ characters).')
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
    <ArchCard className="mx-auto w-full max-w-[28rem]">
      <form onSubmit={submit} noValidate className="px-6 pb-7 pt-2 sm:px-9">
        <div className="text-center">
          <h1 className="font-display text-[2rem] font-medium leading-[1.05] tracking-[-0.03em] text-forest sm:text-[2.35rem]">
            {tr('Thắp ngọn đèn của bạn', 'Light your own lamp')}
          </h1>
          <p className="mx-auto mt-2 max-w-[19rem] text-sm leading-relaxed text-ink/65">
            {tr('Tạo tài khoản để Jinnie lập lịch trình hợp gu bạn.', 'Create an account so Jinnie can plan trips that fit you.')}
          </p>
        </div>

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
            type={reveal ? 'text' : 'password'}
            name="new-password"
            autoComplete="new-password"
            placeholder={tr('Ít nhất 6 ký tự', 'At least 6 characters')}
            icon={<KeyRound size={17} />}
            value={password}
            error={errors.password}
            inputRef={passwordField.ref}
            onFocus={passwordField.onFocus}
            onBlur={passwordField.onBlur}
            onChange={(event) => {
              setPassword(event.target.value)
              setErrors((current) => ({ ...current, password: undefined }))
              passwordField.track()
            }}
            disabled={busy}
            trailing={
              <button
                type="button"
                className="grid size-9 place-items-center text-ink/50 transition-colors hover:text-lapis"
                aria-label={reveal ? tr('Ẩn mật khẩu', 'Hide password') : tr('Hiện mật khẩu', 'Show password')}
                aria-pressed={reveal}
                onClick={() => setReveal((value) => !value)}
              >
                {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          <div className="-mt-2 mb-3 flex items-center gap-3" aria-live="polite">
            <div className="flex gap-1" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <motion.span
                  key={index}
                  animate={{ scale: strength > index ? [1, 1.35, 1] : 1, rotate: strength > index ? 45 : 0 }}
                  transition={{ duration: 0.4 }}
                  className={strength > index ? 'text-gold drop-shadow-[0_0_6px_rgba(246,203,90,0.9)]' : 'text-ink/15'}
                >
                  <Khatam size={16} />
                </motion.span>
              ))}
            </div>
            <span className="text-xs font-medium text-ink/60">{strengthLabel}</span>
          </div>
        </div>

        <fieldset className="mb-5">
          <legend className="mb-2 text-[0.78rem] font-semibold text-ink/80">
            {tr('Bạn thích đi kiểu nào? (không bắt buộc)', 'What kind of traveler are you? (optional)')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((style) => {
              const active = styles.includes(style.id)
              return (
                <button
                  key={style.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStyles((current) => (active ? current.filter((id) => id !== style.id) : [...current, style.id]))}
                  className={`chip ${active ? 'chip-on' : ''}`}
                >
                  {tr(style.vi, style.en)}
                </button>
              )
            })}
          </div>
        </fieldset>

        <button type="submit" className="btn-gold w-full" disabled={busy}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={done ? 'd' : mutation.isPending ? 'l' : 'i'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2">
              {mutation.isPending && <Khatam size={16} className="!animate-[spin-slow_2.4s_linear_infinite]" />}
              {done ? tr('Chào mừng!', 'Welcome!') : mutation.isPending ? tr('Đang thắp đèn…', 'Lighting the lamp…') : tr('Tạo tài khoản', 'Create account')}
            </motion.span>
          </AnimatePresence>
        </button>

        <p className="mt-5 text-center text-[0.84rem] text-ink/65">
          {tr('Đã có tài khoản?', 'Already have an account?')}{' '}
          <Link to="/login" className="font-bold text-lapis underline-offset-4 hover:underline">
            {tr('Đăng nhập', 'Sign in')}
          </Link>
        </p>
      </form>
    </ArchCard>
  )
}
