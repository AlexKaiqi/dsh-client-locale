# Extensible DSH locale

This package is a contract-compatible replacement for
`@deepseek-ai/dsh-client-locale`. It keeps the existing `locale` service,
settings namespace, slot integration, module ID, and dictionary API while
opening the locale catalog to language-pack plugins.

## Built-in languages

- English (`en`)
- Simplified Chinese (`zh`, document tag `zh-CN`)
- Traditional Chinese (`zh-TW`)
- Japanese (`ja`)
- Korean (`ko`)
- Spanish (`es`)
- French (`fr`)
- German (`de`)
- Brazilian Portuguese (`pt-BR`)
- Russian (`ru`)
- Arabic (`ar`, RTL)
- Hindi (`hi`)

## Source-first plugin integration

Client packages keep depending on `@deepseek-ai/dsh-client-locale` and inject
the `locale` service. A plugin now needs to author only one authoritative source
catalog. `defineMessages` is statically extractable and ICU MessageFormat handles
plural, select, number, date, and time grammar:

```ts
import { defineMessages } from '@deepseek-ai/dsh-client-locale/client'

const NS = 'myPlugin'

export const messages = defineMessages({
  'items.count': {
    id: 'items.count',
    defaultMessage: '{count, plural, =0 {No items} one {# item} other {# items}}',
    description: 'Number of items visible in the plugin list',
  },
})

ctx.effect(
  () => ctx.locale.registerMessages(NS, { sourceLocale: 'en', messages }),
  'my-plugin: source messages',
)

ctx.slots.register({
  name: 'settings.section',
  id: 'my-plugin',
  locale: NS,
}, MySettings)
```

Attach `locale: NS` to each translated Slot so it refreshes after a language
change. Existing `register(NS, { en, zh })` callers remain supported.

Fallback is namespace-aware: `es-MX` looks for `es` before the namespace source
locale and the compatibility English fallback. A separate language-pack plugin
can add a selectable BCP 47 locale and a generated catalog without replacing
this service:

```ts
ctx.locale.registerLocale({
  id: 'it',
  label: 'Italiano',
  languageTag: 'it',
})

ctx.locale.registerCatalog('myPlugin', italianCatalog)
```

Registering the first catalog for an unknown BCP 47 tag automatically adds a
native-language selector label and infers RTL from its Unicode script. A
language pack therefore does not need a separate hard-coded country catalog.

The global preference is a string validated against the live catalog at
runtime. Browser detection accepts regional tags and aliases. The active
definition controls both `<html lang>` and `<html dir>`.

The runtime also exposes locale-aware formatting without requiring plugins to
construct their own global locale state:

```ts
ctx.locale.formatNumber(total, { style: 'currency', currency: 'EUR' })
ctx.locale.formatDate(createdAt, { dateStyle: 'medium' })
ctx.locale.formatList(labels, { type: 'conjunction' })
ctx.locale.formatRelativeTime(-2, 'day', { numeric: 'auto' })
```

## Translation production CLI

`dsh-i18n` keeps translation production outside the browser. It extracts source
descriptors with FormatJS, validates ICU syntax and placeholders, generates
pseudo-locales, and can send changed messages to a provider-neutral translation
endpoint.

```sh
dsh-i18n extract \
  --namespace myPlugin \
  --source-locale en \
  --out-file locales/source.json \
  'src/**/*.{ts,tsx}'

dsh-i18n pseudo \
  --source locales/source.json \
  --locale en-XA \
  --out-file locales/en-XA.json

dsh-i18n translate \
  --source locales/source.json \
  --locales zh,ja,fr,ar \
  --out-dir locales \
  --endpoint https://translator.example/v1/dsh-i18n

dsh-i18n check --source locales/source.json locales/*.json
```

The endpoint receives source text, description, source location, and the exact
ICU argument/tag signature. It must return:

```json
{
  "provider": "my-ai-translator",
  "messages": {
    "items.count": "{count, plural, =0 {Aucun élément} one {# élément} other {# éléments}}"
  }
}
```

Set `DSH_I18N_TRANSLATOR_TOKEN` when the endpoint needs a bearer token. The CLI
reads it only from the process environment and never places it in command-line
arguments or generated catalogs.

Generated catalogs carry whole-catalog and per-message source hashes. Add a key
to the catalog's `locked` array after human review; later automated translation
runs preserve that value and report it if its source changes. Machine output is
marked `machine`, mixed human/AI output is marked `mixed`, and CI validation
rejects missing keys, stale unlocked messages, malformed ICU, changed variables,
or changed rich-text tags.

## Responsibility boundary

Business plugins still own the source message, stable semantic ID, dynamic
variables, and any product meaning that a translator cannot infer. This package
automates extraction, language matching, fallback, formatting, translation
transport, source-change detection, pseudo-localization, and structural QA.
Legal, safety-critical, and market-specific copy still requires an explicit
human review; “all locales technically supported” is not a quality guarantee for
every country.

## Local profile

The web profile links this workspace package under the official package name:

```json
"@deepseek-ai/dsh-client-locale": "link:/path/to/dsh-plugins/dsh-client-locale"
```

Restart the DSH host after changing the package link; client-only dictionary
edits can then use the normal HMR path.
