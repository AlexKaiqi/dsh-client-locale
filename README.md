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

## Plugin integration

Client packages keep depending on `@deepseek-ai/dsh-client-locale` and inject
the `locale` service. Register one namespace and attach it to every Slot entry
that renders translated copy:

```ts
const NS = 'myPlugin'

ctx.effect(
  () => ctx.locale.register(NS, { en, zh, ja }),
  'my-plugin: locale dictionaries',
)

ctx.slots.register({
  name: 'settings.section',
  id: 'my-plugin',
  locale: NS,
}, MySettings)
```

Missing locale dictionaries fall back to English. A separate language-pack
plugin can add a selectable BCP 47 locale without replacing this service:

```ts
ctx.locale.registerLocale({
  id: 'it',
  label: 'Italiano',
  languageTag: 'it',
})
```

The global preference is a string validated against the live catalog at
runtime. Browser detection accepts regional tags and aliases. The active
definition controls both `<html lang>` and `<html dir>`.

## Local profile

The web profile links this workspace package under the official package name:

```json
"@deepseek-ai/dsh-client-locale": "link:/path/to/dsh-plugins/dsh-client-locale"
```

Restart the DSH host after changing the package link; client-only dictionary
edits can then use the normal HMR path.
