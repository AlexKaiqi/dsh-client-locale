import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPseudoCatalog,
  messageSignature,
  sourceCatalogHash,
  validateTranslationCatalog,
} from '../lib/tooling.js'

const source = {
  schemaVersion: 1,
  namespace: 'example',
  sourceLocale: 'en',
  messages: {
    count: {
      id: 'count',
      defaultMessage: '{count, plural, one {# file} other {# files}}',
      description: 'Number of selected files',
    },
  },
}

test('pseudo localization preserves ICU arguments', () => {
  const catalog = createPseudoCatalog(source, 'en-XA', '2026-08-25T00:00:00.000Z')
  assert.deepEqual(messageSignature(catalog.messages.count).arguments, ['count'])
  assert.match(catalog.messages.count, /ƒïļë/u)
  assert.equal(validateTranslationCatalog(source, catalog).length, 0)
})

test('catalog validation rejects changed ICU arguments', () => {
  const catalog = createPseudoCatalog(source, 'en-XA', '2026-08-25T00:00:00.000Z')
  catalog.sourceHash = sourceCatalogHash(source)
  catalog.messages.count = '{total, plural, one {# file} other {# files}}'
  assert.ok(validateTranslationCatalog(source, catalog).some(issue => issue.code === 'argument-mismatch'))
})
