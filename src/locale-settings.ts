import z from '@deepseek-ai/schemastery'

/** Settings namespace retained for compatibility with the official locale package. */
export const LOCALE_SETTINGS_NAMESPACE = 'locale'

/** Field carrying an explicit locale selection; absence delegates to the browser. */
export const LOCALE_PREFERENCE_FIELD = 'preference'

/** Locales available before any language-pack plugin registers more. */
export const LOCALE_IDS = [
  'en',
  'zh',
  'zh-TW',
  'ja',
  'ko',
  'es',
  'fr',
  'de',
  'pt-BR',
  'ru',
  'ar',
  'hi',
] as const

export type BuiltInLocaleId = typeof LOCALE_IDS[number]

/** Locale IDs are open BCP 47 tags so language-pack plugins can extend the catalog. */
export type LocaleId = string

export interface LocaleSettings {
  /** Explicit locale selection; absence delegates to the browser. */
  preference?: LocaleId
}

/**
 * The host persists a string instead of a closed union. Availability is
 * validated by LocaleRuntime, whose catalog is extensible at runtime.
 */
export const LocaleSettingsSchema: z<LocaleSettings> = z.object({
  [LOCALE_PREFERENCE_FIELD]: z.string().required(false),
})
