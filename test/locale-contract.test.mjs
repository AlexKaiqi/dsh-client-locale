import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { LOCALE_IDS } from '../lib/index.js'
import { LocaleSettingsSchema } from '../lib/types/locale-settings.js'

const expected = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'de', 'pt-BR', 'ru', 'ar', 'hi']

test('ships the twelve initial locale IDs in stable display order', () => {
  assert.deepEqual(LOCALE_IDS, expected)
  assert.equal(new Set(LOCALE_IDS).size, LOCALE_IDS.length)
})

test('host preference schema accepts a future language-pack locale', () => {
  assert.deepEqual(LocaleSettingsSchema({ preference: 'it-IT' }), { preference: 'it-IT' })
})

test('browser bundle preserves the official module id and open catalog API', async () => {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(source, /@deepseek-ai\/dsh-client-locale/u)
  assert.match(source, /registerLocales/u)
  for (const label of ['繁體中文', '日本語', '한국어', 'Español', 'العربية', 'हिन्दी']) {
    assert.ok(source.includes(label), `missing label: ${label}`)
  }
})
