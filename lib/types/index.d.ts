import type { Context } from '@deepseek-ai/cordis';
export { LOCALE_IDS, LOCALE_PREFERENCE_FIELD, LOCALE_SETTINGS_NAMESPACE, type BuiltInLocaleId, type LocaleId, type LocaleSettings, } from './locale-settings.ts';
export { defineMessages, type MessageDescriptor, type MessageDescriptors, type MessageRegistration, type SourceCatalog, type TranslationCatalog, type TranslationReviewState, } from './messages.ts';
/** Register the durable locale section when a settings provider exists. */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map