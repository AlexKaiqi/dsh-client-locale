import IntlMessageFormat from 'intl-messageformat';
import { LOCALE_PREFERENCE_FIELD, LOCALE_SETTINGS_NAMESPACE, } from "../locale-settings.js";
import { commonDictionaries } from "../locales/index.js";
import { settingsDictionaries } from "../locales/settings.js";
import {} from "../messages.js";
import { LanguageRow } from "./LanguageRow.js";
import { createLanguageRowStore } from "./settings-store.js";
export { defineMessages, } from "../messages.js";
export const FALLBACK_LOCALE = 'en';
export const COMMON_NS = 'common';
export const SETTINGS_NS = 'settings.locale';
export const BUILT_IN_LOCALES = Object.freeze([
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
]);
function normalizedKey(value) {
    return value.trim().replaceAll('_', '-').toLowerCase();
}
function normalizeDefinition(input) {
    const id = input.id.trim();
    const label = input.label.trim();
    if (!id || !label)
        throw new Error('locale id and label must be non-empty');
    return Object.freeze({
        id,
        label,
        languageTag: input.languageTag?.trim() || id,
        direction: input.direction ?? 'ltr',
        fallback: Object.freeze([...(input.fallback ?? [])]),
        aliases: Object.freeze([...(input.aliases ?? [])]),
    });
}
function localeParents(value) {
    let baseName = value.trim().replaceAll('_', '-');
    try {
        baseName = new Intl.Locale(baseName).baseName;
    }
    catch {
        // A registered legacy alias can still participate in a best-effort chain.
    }
    const parts = baseName.split('-').filter(Boolean);
    const parents = [];
    while (parts.length > 1) {
        parts.pop();
        parents.push(parts.join('-'));
    }
    return parents;
}
const RTL_SCRIPTS = new Set(['Adlm', 'Arab', 'Hebr', 'Mand', 'Nkoo', 'Rohg', 'Syrc', 'Thaa']);
function inferLocaleDefinition(id) {
    let canonical = id;
    let direction = 'ltr';
    try {
        const locale = new Intl.Locale(id).maximize();
        canonical = new Intl.Locale(id).baseName;
        direction = locale.script && RTL_SCRIPTS.has(locale.script) ? 'rtl' : 'ltr';
    }
    catch {
        // The catalog validator owns strict tag validation; retain legacy IDs here.
    }
    let label = canonical;
    try {
        label = new Intl.DisplayNames([canonical], { type: 'language', fallback: 'code' }).of(canonical) ?? canonical;
    }
    catch {
        // A platform without DisplayNames can still expose the stable locale ID.
    }
    return { id: canonical, label, languageTag: canonical, direction };
}
function lookupDefinition(definitions, requested) {
    const key = normalizedKey(requested);
    const exact = definitions.find(definition => normalizedKey(definition.id) === key
        || normalizedKey(definition.languageTag) === key
        || definition.aliases.some(alias => normalizedKey(alias) === key));
    if (exact)
        return exact;
    if (key.startsWith('zh-')) {
        const traditional = key.includes('hant') || /-(tw|hk|mo)(?:-|$)/u.test(key);
        return definitions.find(definition => normalizedKey(definition.id) === (traditional ? 'zh-tw' : 'zh'));
    }
    const primary = key.split('-')[0];
    return definitions.find(definition => normalizedKey(definition.id).split('-')[0] === primary);
}
export class LocaleRuntime {
    dicts = new Map();
    bound = new Map();
    formatters = new Map();
    listeners = new Set();
    catalog = new Map();
    sourceLocales = new Map();
    snapshot;
    ctx;
    host;
    provisional;
    pendingPreference;
    constructor(ctx, host, definitions = BUILT_IN_LOCALES) {
        this.ctx = ctx;
        this.host = host;
        for (const input of definitions) {
            const definition = normalizeDefinition(input);
            const key = normalizedKey(definition.id);
            if (this.catalog.has(key))
                throw new Error(`locale "${definition.id}" is already registered`);
            this.catalog.set(key, definition);
        }
        const locales = this.localeList();
        const provisional = detectBrowserLocale(locales) ?? lookupDefinition(locales, FALLBACK_LOCALE)?.id;
        if (!provisional)
            throw new Error(`fallback locale "${FALLBACK_LOCALE}" is not registered`);
        this.provisional = provisional;
        this.snapshot = Object.freeze({ active: provisional, locales, revision: 0 });
        if (host) {
            ctx.effect(() => host.subscribe(() => { this.adopt(host); }), 'locale: settings scope adoption');
            this.adopt(host);
        }
    }
    getLocale() {
        return this.snapshot;
    }
    getSnapshot() {
        return this.snapshot;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    setLocale(id) {
        const match = lookupDefinition(this.snapshot.locales, id);
        if (!match)
            throw new Error(`locale "${id}" is not registered`);
        this.pendingPreference = undefined;
        if (this.snapshot.active !== match.id)
            this.publish(match.id, true);
        void this.host?.set(LOCALE_PREFERENCE_FIELD, match.id);
    }
    /** Register one authoritative source catalog plus any generated translations. */
    registerMessages(namespace, registration) {
        if (this.sourceLocales.has(namespace)) {
            throw new Error(`locale namespace "${namespace}" already has a source locale`);
        }
        const sourceLocale = registration.sourceLocale.trim();
        if (!sourceLocale)
            throw new Error('message source locale must be non-empty');
        const source = this.dictionaryFromDescriptors(registration.messages);
        const dictionaries = { [sourceLocale]: source };
        for (const translation of registration.translations ?? []) {
            if (translation.namespace !== namespace) {
                throw new Error(`translation namespace "${translation.namespace}" does not match "${namespace}"`);
            }
            if (normalizedKey(translation.sourceLocale) !== normalizedKey(sourceLocale)) {
                throw new Error(`translation source locale "${translation.sourceLocale}" does not match "${sourceLocale}"`);
            }
            if (dictionaries[translation.locale] !== undefined) {
                throw new Error(`message registration has duplicate locale "${translation.locale}"`);
            }
            dictionaries[translation.locale] = translation.messages;
        }
        this.sourceLocales.set(namespace, sourceLocale);
        try {
            const dispose = this.register(namespace, dictionaries);
            return () => {
                if (this.sourceLocales.get(namespace) === sourceLocale)
                    this.sourceLocales.delete(namespace);
                dispose();
            };
        }
        catch (error) {
            if (this.sourceLocales.get(namespace) === sourceLocale)
                this.sourceLocales.delete(namespace);
            throw error;
        }
    }
    /** Register a generated catalog from a separately shipped language pack. */
    registerCatalog(namespace, catalog) {
        if (catalog.namespace !== namespace) {
            throw new Error(`translation namespace "${catalog.namespace}" does not match "${namespace}"`);
        }
        const disposeMessages = this.register(namespace, catalog.locale, catalog.messages);
        let disposeLocale;
        try {
            if (!this.catalog.has(normalizedKey(catalog.locale))) {
                disposeLocale = this.registerLocale(inferLocaleDefinition(catalog.locale));
            }
        }
        catch (error) {
            disposeMessages();
            throw error;
        }
        return () => {
            disposeMessages();
            disposeLocale?.();
        };
    }
    /** Locale-aware number formatting using the active document language tag. */
    formatNumber(value, options) {
        return new Intl.NumberFormat(this.activeLanguageTag(), options).format(value);
    }
    /** Locale-aware date/time formatting using the active document language tag. */
    formatDate(value, options) {
        return new Intl.DateTimeFormat(this.activeLanguageTag(), options).format(value);
    }
    /** Locale-aware list formatting using the active document language tag. */
    formatList(values, options) {
        return new Intl.ListFormat(this.activeLanguageTag(), options).format(values);
    }
    /** Locale-aware relative time formatting using the active document language tag. */
    formatRelativeTime(value, unit, options) {
        return new Intl.RelativeTimeFormat(this.activeLanguageTag(), options).format(value, unit);
    }
    /** Add a selectable language without replacing the locale service. */
    registerLocale(input) {
        const definition = normalizeDefinition(input);
        const key = normalizedKey(definition.id);
        if (this.catalog.has(key))
            throw new Error(`locale "${definition.id}" is already registered`);
        this.catalog.set(key, definition);
        let nextActive = this.snapshot.active;
        let localeChanged = false;
        if (this.pendingPreference) {
            const pending = lookupDefinition(this.localeList(), this.pendingPreference);
            if (pending) {
                nextActive = pending.id;
                this.pendingPreference = undefined;
                localeChanged = nextActive !== this.snapshot.active;
            }
        }
        this.publish(nextActive, localeChanged);
        return () => {
            if (this.catalog.get(key) !== definition)
                return;
            this.catalog.delete(key);
            const activeRemoved = normalizedKey(this.snapshot.active) === key;
            const replacement = activeRemoved
                ? lookupDefinition(this.localeList(), FALLBACK_LOCALE)?.id ?? this.provisional
                : this.snapshot.active;
            this.publish(replacement, activeRemoved);
        };
    }
    registerLocales(inputs) {
        const disposers = [];
        try {
            for (const input of inputs)
                disposers.push(this.registerLocale(input));
        }
        catch (error) {
            for (const dispose of disposers.reverse())
                dispose();
            throw error;
        }
        return () => {
            for (const dispose of disposers.reverse())
                dispose();
        };
    }
    register(namespace, localeOrDictionaries, dictionary) {
        const pairs = typeof localeOrDictionaries === 'string'
            ? [[localeOrDictionaries, dictionary]]
            : Object.entries(localeOrDictionaries).filter((pair) => pair[1] !== undefined);
        let locales = this.dicts.get(namespace);
        if (!locales) {
            locales = new Map();
            this.dicts.set(namespace, locales);
        }
        for (const [locale] of pairs) {
            if (locales.has(locale)) {
                throw new Error(`locale namespace "${namespace}" already has locale "${locale}"`);
            }
        }
        for (const [locale, entries] of pairs)
            locales.set(locale, entries);
        this.publish(this.snapshot.active, false);
        return () => {
            const owner = this.dicts.get(namespace);
            if (!owner)
                return;
            let removed = false;
            for (const [locale, entries] of pairs) {
                if (owner.get(locale) === entries) {
                    owner.delete(locale);
                    removed = true;
                }
            }
            if (removed)
                this.publish(this.snapshot.active, false);
        };
    }
    bind(namespace) {
        let translate = this.bound.get(namespace);
        if (!translate) {
            translate = (key, params) => this.translate(namespace, key, params);
            this.bound.set(namespace, translate);
        }
        return translate;
    }
    translate(namespace, key, params) {
        const template = this.lookup(namespace, key)
            ?? (namespace !== COMMON_NS ? this.lookup(COMMON_NS, key) : undefined)
            ?? key;
        if (!template.includes('{'))
            return template;
        const languageTag = this.activeLanguageTag();
        const cacheKey = `${languageTag}\u0000${template}`;
        let formatter = this.formatters.get(cacheKey);
        if (!formatter) {
            formatter = new IntlMessageFormat(template, languageTag);
            this.formatters.set(cacheKey, formatter);
        }
        try {
            const formatted = formatter.format(params);
            return Array.isArray(formatted) ? formatted.join('') : String(formatted);
        }
        catch (error) {
            console.error(`failed to format locale message "${namespace}.${key}":`, error);
            return template;
        }
    }
    lookup(namespace, key) {
        const dictionaries = this.dicts.get(namespace);
        if (!dictionaries)
            return undefined;
        const active = lookupDefinition(this.snapshot.locales, this.snapshot.active);
        const declared = active?.fallback ?? [];
        const sourceLocale = this.sourceLocales.get(namespace);
        const chain = [
            active?.id,
            ...(active ? localeParents(active.languageTag) : []),
            ...declared.flatMap(locale => [locale, ...localeParents(locale)]),
            sourceLocale,
            ...(sourceLocale ? localeParents(sourceLocale) : []),
            FALLBACK_LOCALE,
        ].filter((locale, index, values) => Boolean(locale) && values.indexOf(locale) === index);
        for (const locale of chain) {
            const exact = dictionaries.get(locale)?.[key];
            if (exact !== undefined)
                return exact;
            const caseInsensitive = [...dictionaries.entries()].find(([registered]) => normalizedKey(registered) === normalizedKey(locale))?.[1]?.[key];
            if (caseInsensitive !== undefined)
                return caseInsensitive;
        }
        return undefined;
    }
    adopt(host) {
        const section = host.getSnapshot().value;
        if (!section)
            return;
        const requested = section.preference;
        if (!requested) {
            this.pendingPreference = undefined;
            if (this.snapshot.active !== this.provisional)
                this.publish(this.provisional, true);
            return;
        }
        const match = lookupDefinition(this.snapshot.locales, requested);
        if (!match) {
            this.pendingPreference = requested;
            return;
        }
        this.pendingPreference = undefined;
        if (this.snapshot.active !== match.id)
            this.publish(match.id, true);
    }
    localeList() {
        return Object.freeze([...this.catalog.values()]);
    }
    activeLanguageTag() {
        return lookupDefinition(this.snapshot.locales, this.snapshot.active)?.languageTag
            ?? this.snapshot.active;
    }
    dictionaryFromDescriptors(descriptors) {
        const dictionary = {};
        for (const [key, descriptor] of Object.entries(descriptors)) {
            if (key !== descriptor.id) {
                throw new Error(`message descriptor key "${key}" must match id "${descriptor.id}"`);
            }
            if (!descriptor.defaultMessage)
                throw new Error(`message "${key}" has an empty defaultMessage`);
            dictionary[key] = descriptor.defaultMessage;
        }
        return dictionary;
    }
    publish(active, localeChanged) {
        if (localeChanged)
            this.formatters.clear();
        this.snapshot = Object.freeze({
            active,
            locales: this.localeList(),
            revision: this.snapshot.revision + 1,
        });
        if (localeChanged)
            this.ctx.emit('locale/change', this.snapshot);
        for (const listener of [...this.listeners]) {
            try {
                listener();
            }
            catch (error) {
                console.error('locale subscriber crashed:', error);
            }
        }
    }
}
function detectBrowserLocale(locales) {
    if (typeof window === 'undefined')
        return undefined;
    for (const tag of [...(navigator.languages ?? []), navigator.language]) {
        const match = lookupDefinition(locales, tag);
        if (match)
            return match.id;
    }
    return undefined;
}
function syncDocumentLocale(snapshot) {
    if (typeof document === 'undefined')
        return;
    const active = lookupDefinition(snapshot.locales, snapshot.active);
    if (!active)
        return;
    document.documentElement.lang = active.languageTag;
    document.documentElement.dir = active.direction;
}
export const inject = ['slots', 'connection', 'remote', 'settingsScope'];
export function apply(ctx) {
    const host = ctx.settingsScope.bind({ namespace: LOCALE_SETTINGS_NAMESPACE });
    const locale = new LocaleRuntime(ctx, host);
    locale.register(COMMON_NS, commonDictionaries);
    locale.register(SETTINGS_NS, settingsDictionaries);
    ctx.provide('locale', locale);
    ctx.slots.installLocale(locale);
    const store = createLanguageRowStore();
    let bound;
    const sync = () => {
        const snapshot = locale.getSnapshot();
        syncDocumentLocale(snapshot);
        bound?.sync(snapshot.active, snapshot.locales.map(definition => ({ id: definition.id, label: definition.label })), snapshot.revision);
    };
    ctx.effect(() => locale.subscribe(sync), 'locale: language row and document synchronization');
    sync();
    const injected = (actions) => {
        bound = actions;
        sync();
        return { setLocale: id => { locale.setLocale(id); } };
    };
    ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'language',
        order: 0,
        store,
        locale: SETTINGS_NS,
        inject: injected,
    }, LanguageRow));
}
//# sourceMappingURL=index.js.map