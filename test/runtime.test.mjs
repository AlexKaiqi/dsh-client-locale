import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

async function loadClientBundle() {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  let moduleDefinition
  const window = { __ModuleLoader__: { load(value) { moduleDefinition = value } } }
  vm.runInNewContext(source, {
    window,
    navigator: { languages: ['en'], language: 'en' },
    console,
    Intl,
    Map,
    Set,
    Object,
    Array,
    String,
    Error,
    RegExp,
    Date,
    Symbol,
    BigInt,
    Number,
    Boolean,
    JSON,
    Math,
    Promise,
    WeakMap,
    WeakSet,
  })
  return moduleDefinition.factory(id => {
    if (id === 'react') return { useState: () => [false, () => {}] }
    if (id === 'react/jsx-runtime') return { jsx: () => undefined, jsxs: () => undefined }
    if (id === '@deepseek-ai/dsh-client-runtime/client') return { defineStore: value => value }
    if (id === '@deepseek-ai/dsh-client-ui-primitives') {
      return { IconChevronDownOutline14: () => undefined, Menu: () => undefined }
    }
    return {}
  })
}

test('formats ICU plurals and falls back through locale parents', async () => {
  const { LocaleRuntime, defineMessages } = await loadClientBundle()
  const ctx = { effect: () => undefined, emit: () => undefined }
  const locale = new LocaleRuntime(ctx, undefined, [
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Español' },
    { id: 'es-MX', label: 'Español (México)' },
  ])
  const messages = defineMessages({
    items: {
      id: 'items',
      defaultMessage: '{count, plural, one {# item} other {# items}}',
    },
  })
  locale.registerMessages('inventory', {
    sourceLocale: 'en',
    messages,
    translations: [{
      schemaVersion: 1,
      namespace: 'inventory',
      sourceLocale: 'en',
      locale: 'es',
      sourceHash: 'test',
      sourceHashes: {},
      messages: { items: '{count, plural, one {# artículo} other {# artículos}}' },
      reviewState: 'reviewed',
      generatedAt: '2026-08-25T00:00:00.000Z',
    }],
  })

  locale.setLocale('es-MX')
  assert.equal(locale.bind('inventory')('items', { count: 2 }), '2 artículos')
})

test('uses each namespace source locale instead of assuming English', async () => {
  const { LocaleRuntime, defineMessages } = await loadClientBundle()
  const locale = new LocaleRuntime({ effect: () => undefined, emit: () => undefined }, undefined, [
    { id: 'en', label: 'English' },
    { id: 'zh', label: '简体中文' },
    { id: 'ja', label: '日本語' },
  ])
  locale.registerMessages('source-zh', {
    sourceLocale: 'zh',
    messages: defineMessages({ title: { id: 'title', defaultMessage: '宠物图库' } }),
  })

  locale.setLocale('ja')
  assert.equal(locale.bind('source-zh')('title'), '宠物图库')
})

test('a generated language catalog makes its locale selectable automatically', async () => {
  const { LocaleRuntime } = await loadClientBundle()
  const locale = new LocaleRuntime({ effect: () => undefined, emit: () => undefined }, undefined, [
    { id: 'en', label: 'English' },
  ])
  locale.registerCatalog('example', {
    schemaVersion: 1,
    namespace: 'example',
    sourceLocale: 'en',
    locale: 'ar-EG',
    sourceHash: 'test',
    sourceHashes: {},
    messages: { title: 'العنوان' },
    reviewState: 'machine',
    generatedAt: '2026-08-25T00:00:00.000Z',
  })

  const definition = locale.getSnapshot().locales.find(entry => entry.id === 'ar-EG')
  assert.equal(definition.direction, 'rtl')
  locale.setLocale('ar-EG')
  assert.equal(locale.bind('example')('title'), 'العنوان')
})
