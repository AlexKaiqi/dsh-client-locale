import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { LOCALE_SETTINGS_NAMESPACE, LocaleSettingsSchema } from "./locale-settings.js";
export { LOCALE_IDS, LOCALE_PREFERENCE_FIELD, LOCALE_SETTINGS_NAMESPACE, } from "./locale-settings.js";
/** Register the durable locale section when a settings provider exists. */
export function apply(ctx) {
    ctx.inject(['settings'], settingsCtx => {
        settingsCtx.settings.register(settingsNamespace(LOCALE_SETTINGS_NAMESPACE), LocaleSettingsSchema);
    });
}
//# sourceMappingURL=index.js.map