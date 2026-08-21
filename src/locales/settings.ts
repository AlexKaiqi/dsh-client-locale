export const en = { 'language.title': 'Language' } as const
export type SettingsLocaleKey = keyof typeof en
type SettingsDict = Record<SettingsLocaleKey, string>

export const settingsDictionaries = {
  en,
  zh: { 'language.title': '语言' },
  'zh-TW': { 'language.title': '語言' },
  ja: { 'language.title': '言語' },
  ko: { 'language.title': '언어' },
  es: { 'language.title': 'Idioma' },
  fr: { 'language.title': 'Langue' },
  de: { 'language.title': 'Sprache' },
  'pt-BR': { 'language.title': 'Idioma' },
  ru: { 'language.title': 'Язык' },
  ar: { 'language.title': 'اللغة' },
  hi: { 'language.title': 'भाषा' },
} satisfies Record<string, SettingsDict>
