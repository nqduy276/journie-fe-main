/**
 * The planner talks to a FastAPI backend in production (see report §5.3). Until that service
 * exists every endpoint in `src/api` runs against an in-browser mock with the same shapes,
 * so replacing a function body with `fetch(`${API_URL}/…`)` is the only change needed.
 */
export const API_URL: string | undefined = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export function latency<T>(value: T | (() => T), min = 280, max = 640): Promise<T> {
  const wait = min + Math.random() * (max - min)
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try {
        resolve(typeof value === 'function' ? (value as () => T)() : value)
      } catch (error) {
        reject(error)
      }
    }, wait)
  })
}

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStore<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: the in-memory session keeps working */
  }
}
