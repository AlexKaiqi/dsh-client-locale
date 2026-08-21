import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
//#region lib/types/locale-settings.js
/** Settings namespace retained for compatibility with the official locale package. */
const LOCALE_SETTINGS_NAMESPACE = "locale";
/** Field carrying an explicit locale selection; absence delegates to the browser. */
const LOCALE_PREFERENCE_FIELD = "preference";
/** Locales available before any language-pack plugin registers more. */
const LOCALE_IDS = [
	"en",
	"zh",
	"zh-TW",
	"ja",
	"ko",
	"es",
	"fr",
	"de",
	"pt-BR",
	"ru",
	"ar",
	"hi"
];
/**
* The host persists a string instead of a closed union. Availability is
* validated by LocaleRuntime, whose catalog is extensible at runtime.
*/
const LocaleSettingsSchema = z.object({ [LOCALE_PREFERENCE_FIELD]: z.string().required(false) });
//#endregion
//#region lib/types/index.js
/** Register the durable locale section when a settings provider exists. */
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(settingsNamespace(LOCALE_SETTINGS_NAMESPACE), LocaleSettingsSchema);
	});
}
//#endregion
export { LOCALE_IDS, LOCALE_PREFERENCE_FIELD, LOCALE_SETTINGS_NAMESPACE, apply };
