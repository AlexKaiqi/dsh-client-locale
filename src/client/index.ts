import type { Context } from '@deepseek-ai/cordis'
import type {
  BoundActions,
  LocaleDictOf,
  LocaleNamespaceMap,
  Translate,
  TranslateNS,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { ClientContext, SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  LOCALE_PREFERENCE_FIELD,
  LOCALE_SETTINGS_NAMESPACE,
  type LocaleId,
  type LocaleSettings,
} from '../locale-settings.ts'
import { commonDictionaries, type CommonKey } from '../locales/index.ts'
import { settingsDictionaries, type SettingsLocaleKey } from '../locales/settings.ts'
import type { LanguageRowInjected } from './LanguageRow.tsx'
import { LanguageRow } from './LanguageRow.tsx'
import { createLanguageRowStore } from './settings-store.ts'

export type { LanguageRowComponentProps, LanguageRowInjected } from './LanguageRow.tsx'
export type { LanguageOptionRow, LanguageRowState } from './settings-store.ts'
export type { CommonKey } from '../locales/index.ts'
export type { BuiltInLocaleId, LocaleId, LocaleSettings } from '../locale-settings.ts'
export type { Translate, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    common: CommonKey
    'settings.locale': SettingsLocaleKey
  }
}

export type LocaleDict = Record<string, string>
export type TextDirection = 'ltr' | 'rtl'

/** Public registration shape used by language-pack plugins. */
export interface LocaleDefinitionInput {
  /** Stable BCP 47-compatible preference value. */
  id: LocaleId
  /** Language name written in that language. */
  label: string
  /** Document language tag; defaults to id. */
  languageTag?: string
  /** Document direction; defaults to ltr. */
  direction?: TextDirection
  /** Ordered dictionary fallback IDs before the global English fallback. */
  fallback?: readonly LocaleId[]
  /** Browser tags or legacy IDs that resolve to this locale. */
  aliases?: readonly string[]
}

/** Normalized immutable locale published in snapshots. */
export interface LocaleDefinition {
  id: LocaleId
  label: string
  languageTag: string
  direction: TextDirection
  fallback: readonly LocaleId[]
  aliases: readonly string[]
}

export interface LocaleSnapshot {
  active: LocaleId
  locales: readonly LocaleDefinition[]
  revision: number
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    locale: LocaleRuntime
  }
  interface Events {
    'locale/change'(snapshot: LocaleSnapshot): void
  }
}

export const FALLBACK_LOCALE: LocaleId = 'en'
export const COMMON_NS = 'common'
export const SETTINGS_NS = 'settings.locale'

export const BUILT_IN_LOCALES: readonly LocaleDefinitionInput[] = Object.freeze([
  { id: 'en', label: 'English', languageTag: 'en' },
  { id: 'zh', label: '简体中文', languageTag: 'zh-CN', aliases: ['zh-CN', 'zh-Hans', 'zh-SG'] },
  { id: 'zh-TW', label: '繁體中文', languageTag: 'zh-TW', fallback: ['zh'], aliases: ['zh-Hant', 'zh-HK', 'zh-MO'] },
  { id: 'ja', label: '日本語', languageTag: 'ja' },
  { id: 'ko', label: '한국어', languageTag: 'ko' },
  { id: 'es', label: 'Español', languageTag: 'es' },
  { id: 'fr', label: 'Français', languageTag: 'fr' },
  { id: 'de', label: 'Deutsch', languageTag: 'de' },
  { id: 'pt-BR', label: 'Português (Brasil)', languageTag: 'pt-BR', aliases: ['pt'] },
  { id: 'ru', label: 'Русский', languageTag: 'ru' },
  { id: 'ar', label: 'العربية', languageTag: 'ar', direction: 'rtl' },
  { id: 'hi', label: 'हिन्दी', languageTag: 'hi' },
])

function normalizedKey(value: string): string {
  return value.trim().replaceAll('_', '-').toLowerCase()
}

function normalizeDefinition(input: LocaleDefinitionInput): LocaleDefinition {
  const id = input.id.trim()
  const label = input.label.trim()
  if (!id || !label) throw new Error('locale id and label must be non-empty')
  return Object.freeze({
    id,
    label,
    languageTag: input.languageTag?.trim() || id,
    direction: input.direction ?? 'ltr',
    fallback: Object.freeze([...(input.fallback ?? [])]),
    aliases: Object.freeze([...(input.aliases ?? [])]),
  })
}

function lookupDefinition(
  definitions: readonly LocaleDefinition[],
  requested: string,
): LocaleDefinition | undefined {
  const key = normalizedKey(requested)
  const exact = definitions.find(definition =>
    normalizedKey(definition.id) === key
    || normalizedKey(definition.languageTag) === key
    || definition.aliases.some(alias => normalizedKey(alias) === key))
  if (exact) return exact

  if (key.startsWith('zh-')) {
    const traditional = key.includes('hant') || /-(tw|hk|mo)(?:-|$)/u.test(key)
    return definitions.find(definition => normalizedKey(definition.id) === (traditional ? 'zh-tw' : 'zh'))
  }

  const primary = key.split('-')[0]
  return definitions.find(definition => normalizedKey(definition.id).split('-')[0] === primary)
}

export class LocaleRuntime {
  private readonly dicts = new Map<string, Map<string, LocaleDict>>()
  private readonly bound = new Map<string, Translate>()
  private readonly listeners = new Set<() => void>()
  private readonly catalog = new Map<string, LocaleDefinition>()
  private snapshot: LocaleSnapshot
  private readonly ctx: Context
  private readonly host: SettingsScope<LocaleSettings> | undefined
  private readonly provisional: LocaleId
  private pendingPreference: LocaleId | undefined

  constructor(
    ctx: Context,
    host?: SettingsScope<LocaleSettings>,
    definitions: readonly LocaleDefinitionInput[] = BUILT_IN_LOCALES,
  ) {
    this.ctx = ctx
    this.host = host
    for (const input of definitions) {
      const definition = normalizeDefinition(input)
      const key = normalizedKey(definition.id)
      if (this.catalog.has(key)) throw new Error(`locale "${definition.id}" is already registered`)
      this.catalog.set(key, definition)
    }
    const locales = this.localeList()
    const provisional = detectBrowserLocale(locales) ?? lookupDefinition(locales, FALLBACK_LOCALE)?.id
    if (!provisional) throw new Error(`fallback locale "${FALLBACK_LOCALE}" is not registered`)
    this.provisional = provisional
    this.snapshot = Object.freeze({ active: provisional, locales, revision: 0 })
    if (host) {
      ctx.effect(() => host.subscribe(() => { this.adopt(host) }), 'locale: settings scope adoption')
      this.adopt(host)
    }
  }

  getLocale(): LocaleSnapshot {
    return this.snapshot
  }

  getSnapshot(): LocaleSnapshot {
    return this.snapshot
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  setLocale(id: string): void {
    const match = lookupDefinition(this.snapshot.locales, id)
    if (!match) throw new Error(`locale "${id}" is not registered`)
    this.pendingPreference = undefined
    if (this.snapshot.active !== match.id) this.publish(match.id, true)
    void this.host?.set(LOCALE_PREFERENCE_FIELD, match.id)
  }

  /** Add a selectable language without replacing the locale service. */
  registerLocale(input: LocaleDefinitionInput): () => void {
    const definition = normalizeDefinition(input)
    const key = normalizedKey(definition.id)
    if (this.catalog.has(key)) throw new Error(`locale "${definition.id}" is already registered`)
    this.catalog.set(key, definition)
    let nextActive = this.snapshot.active
    let localeChanged = false
    if (this.pendingPreference) {
      const pending = lookupDefinition(this.localeList(), this.pendingPreference)
      if (pending) {
        nextActive = pending.id
        this.pendingPreference = undefined
        localeChanged = nextActive !== this.snapshot.active
      }
    }
    this.publish(nextActive, localeChanged)
    return () => {
      if (this.catalog.get(key) !== definition) return
      this.catalog.delete(key)
      const activeRemoved = normalizedKey(this.snapshot.active) === key
      const replacement = activeRemoved
        ? lookupDefinition(this.localeList(), FALLBACK_LOCALE)?.id ?? this.provisional
        : this.snapshot.active
      this.publish(replacement, activeRemoved)
    }
  }

  registerLocales(inputs: readonly LocaleDefinitionInput[]): () => void {
    const disposers: Array<() => void> = []
    try {
      for (const input of inputs) disposers.push(this.registerLocale(input))
    } catch (error) {
      for (const dispose of disposers.reverse()) dispose()
      throw error
    }
    return () => {
      for (const dispose of disposers.reverse()) dispose()
    }
  }

  register<N extends keyof LocaleNamespaceMap & string>(
    namespace: N,
    dictionaries: Partial<Record<LocaleId, LocaleDictOf<N>>>,
  ): () => void
  register(namespace: string, locale: string, dictionary: LocaleDict): () => void
  register(
    namespace: string,
    localeOrDictionaries: string | Partial<Record<LocaleId, LocaleDict>>,
    dictionary?: LocaleDict,
  ): () => void {
    const pairs: Array<[string, LocaleDict]> = typeof localeOrDictionaries === 'string'
      ? [[localeOrDictionaries, dictionary as LocaleDict]]
      : Object.entries(localeOrDictionaries).filter(
        (pair): pair is [string, LocaleDict] => pair[1] !== undefined,
      )
    let locales = this.dicts.get(namespace)
    if (!locales) {
      locales = new Map()
      this.dicts.set(namespace, locales)
    }
    for (const [locale] of pairs) {
      if (locales.has(locale)) {
        throw new Error(`locale namespace "${namespace}" already has locale "${locale}"`)
      }
    }
    for (const [locale, entries] of pairs) locales.set(locale, entries)
    this.publish(this.snapshot.active, false)
    return () => {
      const owner = this.dicts.get(namespace)
      if (!owner) return
      let removed = false
      for (const [locale, entries] of pairs) {
        if (owner.get(locale) === entries) {
          owner.delete(locale)
          removed = true
        }
      }
      if (removed) this.publish(this.snapshot.active, false)
    }
  }

  bind<N extends keyof LocaleNamespaceMap & string>(namespace: N): TranslateNS<N>
  bind(namespace: string): Translate
  bind(namespace: string): Translate {
    let translate = this.bound.get(namespace)
    if (!translate) {
      translate = (key, params) => this.translate(namespace, key, params)
      this.bound.set(namespace, translate)
    }
    return translate
  }

  private translate(namespace: string, key: string, params?: Record<string, unknown>): string {
    const template = this.lookup(namespace, key)
      ?? (namespace !== COMMON_NS ? this.lookup(COMMON_NS, key) : undefined)
      ?? key
    if (!params) return template
    return template.replace(/\{(\w+)\}/gu, (match, name: string) =>
      name in params ? String(params[name]) : match)
  }

  private lookup(namespace: string, key: string): string | undefined {
    const dictionaries = this.dicts.get(namespace)
    if (!dictionaries) return undefined
    const active = lookupDefinition(this.snapshot.locales, this.snapshot.active)
    const chain = [
      active?.id,
      ...(active?.fallback ?? []),
      FALLBACK_LOCALE,
    ].filter((locale, index, values): locale is string =>
      Boolean(locale) && values.indexOf(locale) === index)
    for (const locale of chain) {
      const exact = dictionaries.get(locale)?.[key]
      if (exact !== undefined) return exact
      const caseInsensitive = [...dictionaries.entries()].find(
        ([registered]) => normalizedKey(registered) === normalizedKey(locale),
      )?.[1]?.[key]
      if (caseInsensitive !== undefined) return caseInsensitive
    }
    return undefined
  }

  private adopt(host: SettingsScope<LocaleSettings>): void {
    const section = host.getSnapshot().value
    if (!section) return
    const requested = section.preference
    if (!requested) {
      this.pendingPreference = undefined
      if (this.snapshot.active !== this.provisional) this.publish(this.provisional, true)
      return
    }
    const match = lookupDefinition(this.snapshot.locales, requested)
    if (!match) {
      this.pendingPreference = requested
      return
    }
    this.pendingPreference = undefined
    if (this.snapshot.active !== match.id) this.publish(match.id, true)
  }

  private localeList(): readonly LocaleDefinition[] {
    return Object.freeze([...this.catalog.values()])
  }

  private publish(active: LocaleId, localeChanged: boolean): void {
    this.snapshot = Object.freeze({
      active,
      locales: this.localeList(),
      revision: this.snapshot.revision + 1,
    })
    if (localeChanged) this.ctx.emit('locale/change', this.snapshot)
    for (const listener of [...this.listeners]) {
      try {
        listener()
      } catch (error) {
        console.error('locale subscriber crashed:', error)
      }
    }
  }
}

function detectBrowserLocale(locales: readonly LocaleDefinition[]): LocaleId | undefined {
  if (typeof window === 'undefined') return undefined
  for (const tag of [...(navigator.languages ?? []), navigator.language]) {
    const match = lookupDefinition(locales, tag)
    if (match) return match.id
  }
  return undefined
}

function syncDocumentLocale(snapshot: LocaleSnapshot): void {
  if (typeof document === 'undefined') return
  const active = lookupDefinition(snapshot.locales, snapshot.active)
  if (!active) return
  document.documentElement.lang = active.languageTag
  document.documentElement.dir = active.direction
}

export const inject = ['slots', 'connection', 'remote', 'settingsScope']

export function apply(ctx: ClientContext): void {
  const host = ctx.settingsScope.bind<LocaleSettings>({ namespace: LOCALE_SETTINGS_NAMESPACE })
  const locale = new LocaleRuntime(ctx, host)
  locale.register(COMMON_NS, commonDictionaries)
  locale.register(SETTINGS_NS, settingsDictionaries)
  ctx.provide('locale', locale)
  ctx.slots.installLocale(locale)

  const store = createLanguageRowStore()
  let bound: BoundActions<typeof store> | undefined
  const sync = (): void => {
    const snapshot = locale.getSnapshot()
    syncDocumentLocale(snapshot)
    bound?.sync(
      snapshot.active,
      snapshot.locales.map(definition => ({ id: definition.id, label: definition.label })),
      snapshot.revision,
    )
  }
  ctx.effect(() => locale.subscribe(sync), 'locale: language row and document synchronization')
  sync()

  const injected = (actions: BoundActions<typeof store>): LanguageRowInjected => {
    bound = actions
    sync()
    return { setLocale: id => { locale.setLocale(id) } }
  }
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'language',
    order: 0,
    store,
    locale: SETTINGS_NS,
    inject: injected,
  }, LanguageRow))
}
