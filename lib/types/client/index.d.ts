import type { Context } from '@deepseek-ai/cordis';
import type { LocaleDictOf, LocaleNamespaceMap, Translate, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { ClientContext, SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
import { type LocaleId, type LocaleSettings } from '../locale-settings.ts';
import { type CommonKey } from '../locales/index.ts';
import { type SettingsLocaleKey } from '../locales/settings.ts';
export type { LanguageRowComponentProps, LanguageRowInjected } from './LanguageRow.tsx';
export type { LanguageOptionRow, LanguageRowState } from './settings-store.ts';
export type { CommonKey } from '../locales/index.ts';
export type { BuiltInLocaleId, LocaleId, LocaleSettings } from '../locale-settings.ts';
export type { Translate, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        common: CommonKey;
        'settings.locale': SettingsLocaleKey;
    }
}
export type LocaleDict = Record<string, string>;
export type TextDirection = 'ltr' | 'rtl';
/** Public registration shape used by language-pack plugins. */
export interface LocaleDefinitionInput {
    /** Stable BCP 47-compatible preference value. */
    id: LocaleId;
    /** Language name written in that language. */
    label: string;
    /** Document language tag; defaults to id. */
    languageTag?: string;
    /** Document direction; defaults to ltr. */
    direction?: TextDirection;
    /** Ordered dictionary fallback IDs before the global English fallback. */
    fallback?: readonly LocaleId[];
    /** Browser tags or legacy IDs that resolve to this locale. */
    aliases?: readonly string[];
}
/** Normalized immutable locale published in snapshots. */
export interface LocaleDefinition {
    id: LocaleId;
    label: string;
    languageTag: string;
    direction: TextDirection;
    fallback: readonly LocaleId[];
    aliases: readonly string[];
}
export interface LocaleSnapshot {
    active: LocaleId;
    locales: readonly LocaleDefinition[];
    revision: number;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        locale: LocaleRuntime;
    }
    interface Events {
        'locale/change'(snapshot: LocaleSnapshot): void;
    }
}
export declare const FALLBACK_LOCALE: LocaleId;
export declare const COMMON_NS = "common";
export declare const SETTINGS_NS = "settings.locale";
export declare const BUILT_IN_LOCALES: readonly LocaleDefinitionInput[];
export declare class LocaleRuntime {
    private readonly dicts;
    private readonly bound;
    private readonly listeners;
    private readonly catalog;
    private snapshot;
    private readonly ctx;
    private readonly host;
    private readonly provisional;
    private pendingPreference;
    constructor(ctx: Context, host?: SettingsScope<LocaleSettings>, definitions?: readonly LocaleDefinitionInput[]);
    getLocale(): LocaleSnapshot;
    getSnapshot(): LocaleSnapshot;
    subscribe(listener: () => void): () => void;
    setLocale(id: string): void;
    /** Add a selectable language without replacing the locale service. */
    registerLocale(input: LocaleDefinitionInput): () => void;
    registerLocales(inputs: readonly LocaleDefinitionInput[]): () => void;
    register<N extends keyof LocaleNamespaceMap & string>(namespace: N, dictionaries: Partial<Record<LocaleId, LocaleDictOf<N>>>): () => void;
    register(namespace: string, locale: string, dictionary: LocaleDict): () => void;
    bind<N extends keyof LocaleNamespaceMap & string>(namespace: N): TranslateNS<N>;
    bind(namespace: string): Translate;
    private translate;
    private lookup;
    private adopt;
    private localeList;
    private publish;
}
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map