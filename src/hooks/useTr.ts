import { useCallback } from 'react'
import { useLanguage } from './useLanguage'

/** Inline bilingual copy: `tr('Đăng nhập', 'Sign in')`. Keeps each string next to where it is used. */
export function useTr() {
  const { language, locale } = useLanguage()
  const tr = useCallback((vi: string, en: string) => (language === 'vi' ? vi : en), [language])
  return { tr, language, locale }
}
