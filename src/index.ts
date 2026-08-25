import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { LOCALE_SETTINGS_NAMESPACE, LocaleSettingsSchema } from './locale-settings.ts'

export {
  LOCALE_IDS,
  LOCALE_PREFERENCE_FIELD,
  LOCALE_SETTINGS_NAMESPACE,
  type BuiltInLocaleId,
  type LocaleId,
  type LocaleSettings,
} from './locale-settings.ts'

export {
  defineMessages,
  type MessageDescriptor,
  type MessageDescriptors,
  type MessageRegistration,
  type SourceCatalog,
  type TranslationCatalog,
  type TranslationReviewState,
} from './messages.ts'

/** Register the durable locale section when a settings provider exists. */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], settingsCtx => {
    settingsCtx.settings.register(
      settingsNamespace(LOCALE_SETTINGS_NAMESPACE),
      LocaleSettingsSchema,
    )
  })
}
