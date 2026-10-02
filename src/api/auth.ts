import type { SessionUser } from '../store/authStore'
import { ApiError, latency, readStore, writeStore } from './http'

type Account = SessionUser & { password: string }

const ACCOUNTS_KEY = 'journie-accounts-v1'

/** Demo accounts shown as one-tap chips on the login page. */
export const demoAccounts = {
  traveler: { email: 'lu.khach@journie.vn', password: 'journie123' },
  admin: { email: 'ba@journie.vn', password: 'journie123' },
} as const

const seed: Account[] = [
  { id: 'u-traveler', name: 'Lữ Khách', email: demoAccounts.traveler.email, role: 'traveler', password: demoAccounts.traveler.password },
  { id: 'u-admin', name: 'Business Admin', email: demoAccounts.admin.email, role: 'admin', password: demoAccounts.admin.password },
]

const accounts = () => readStore<Account[]>(ACCOUNTS_KEY, seed)

const publicUser = ({ password: _password, ...user }: Account): SessionUser => user

export type LoginInput = { email: string; password: string }
export type RegisterInput = LoginInput & { name: string }

/** Use case "Log in": verify password, extend with an error the UI can display. */
export function login({ email, password }: LoginInput) {
  return latency(() => {
    const account = accounts().find((entry) => entry.email.toLowerCase() === email.trim().toLowerCase())
    if (!account) throw new ApiError('user_not_found', 'No account uses this email')
    if (account.password !== password) throw new ApiError('invalid_credentials', 'Password does not match')
    return publicUser(account)
  }, 900, 1300)
}

export function register({ name, email, password }: RegisterInput) {
  return latency(() => {
    const list = accounts()
    if (list.some((entry) => entry.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new ApiError('email_taken', 'Email already registered')
    }
    const account: Account = {
      id: `u-${Date.now().toString(36)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'traveler',
      password,
    }
    writeStore(ACCOUNTS_KEY, [...list, account])
    return publicUser(account)
  }, 900, 1300)
}

export function requestPasswordReset(email: string) {
  return latency(() => ({ email }), 600, 900)
}
