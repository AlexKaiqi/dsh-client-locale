import { createHash } from 'node:crypto'
import {
  TYPE,
  parse,
  type MessageFormatElement,
} from '@formatjs/icu-messageformat-parser'
import { printAST } from '@formatjs/icu-messageformat-parser/printer.js'
import type {
  MessageDescriptor,
  SourceCatalog,
  TranslationCatalog,
} from './messages.ts'

export type CatalogIssueCode =
  | 'invalid-message'
  | 'missing-key'
  | 'extra-key'
  | 'argument-mismatch'
  | 'tag-mismatch'
  | 'stale-source'

export interface CatalogIssue {
  code: CatalogIssueCode
  key: string
  message: string
}

export interface MessageSignature {
  arguments: readonly string[]
  tags: readonly string[]
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    )
  }
  return value
}

function digest(value: unknown): string {
  const content = JSON.stringify(stableValue(value))
  return `sha256:${createHash('sha256').update(content).digest('hex')}`
}

export function messageSourceHash(id: string, descriptor: MessageDescriptor): string {
  return digest({ id, defaultMessage: descriptor.defaultMessage, description: descriptor.description ?? '' })
}

export function sourceCatalogHash(source: SourceCatalog): string {
  return digest({
    namespace: source.namespace,
    sourceLocale: source.sourceLocale,
    messages: Object.fromEntries(Object.entries(source.messages).map(([id, descriptor]) => [
      id,
      { defaultMessage: descriptor.defaultMessage, description: descriptor.description ?? '' },
    ])),
  })
}

function walkSignature(
  elements: readonly MessageFormatElement[],
  argumentsFound: Set<string>,
  tagsFound: Set<string>,
): void {
  for (const element of elements) {
    switch (element.type) {
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
        argumentsFound.add(element.value)
        break
      case TYPE.select:
      case TYPE.plural:
        argumentsFound.add(element.value)
        for (const option of Object.values(element.options)) {
          walkSignature(option.value, argumentsFound, tagsFound)
        }
        break
      case TYPE.tag:
        tagsFound.add(element.value)
        walkSignature(element.children, argumentsFound, tagsFound)
        break
      case TYPE.literal:
      case TYPE.pound:
        break
    }
  }
}

export function messageSignature(message: string): MessageSignature {
  const argumentsFound = new Set<string>()
  const tagsFound = new Set<string>()
  walkSignature(parse(message), argumentsFound, tagsFound)
  return {
    arguments: [...argumentsFound].sort(),
    tags: [...tagsFound].sort(),
  }
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

/** Validate syntax, source freshness, placeholders, tags, and catalog coverage. */
export function validateTranslationCatalog(
  source: SourceCatalog,
  translation: TranslationCatalog,
): CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const sourceKeys = Object.keys(source.messages)
  const targetKeys = Object.keys(translation.messages)

  if (translation.sourceHash !== sourceCatalogHash(source)) {
    issues.push({ code: 'stale-source', key: '*', message: 'translation sourceHash is stale' })
  }

  for (const key of sourceKeys) {
    const descriptor = source.messages[key]
    const translated = translation.messages[key]
    if (!descriptor) continue
    if (translation.sourceHashes[key] !== messageSourceHash(key, descriptor)) {
      issues.push({ code: 'stale-source', key, message: `translation for "${key}" is stale` })
    }
    if (translated === undefined) {
      issues.push({ code: 'missing-key', key, message: `missing translation for "${key}"` })
      continue
    }
    try {
      const sourceSignature = messageSignature(descriptor.defaultMessage)
      const targetSignature = messageSignature(translated)
      if (!sameValues(sourceSignature.arguments, targetSignature.arguments)) {
        issues.push({
          code: 'argument-mismatch',
          key,
          message: `arguments differ: source [${sourceSignature.arguments.join(', ')}], translation [${targetSignature.arguments.join(', ')}]`,
        })
      }
      if (!sameValues(sourceSignature.tags, targetSignature.tags)) {
        issues.push({
          code: 'tag-mismatch',
          key,
          message: `tags differ: source [${sourceSignature.tags.join(', ')}], translation [${targetSignature.tags.join(', ')}]`,
        })
      }
    } catch (error) {
      issues.push({
        code: 'invalid-message',
        key,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  for (const key of targetKeys) {
    if (!source.messages[key]) {
      issues.push({ code: 'extra-key', key, message: `translation contains unknown key "${key}"` })
    }
  }
  return issues
}

const ACCENTS: Record<string, string> = {
  a: 'à', A: 'À', b: 'ƀ', B: 'Ɓ', c: 'ç', C: 'Ç', d: 'ð', D: 'Ð', e: 'ë', E: 'Ë',
  f: 'ƒ', F: 'Ƒ', g: 'ğ', G: 'Ğ', h: 'ħ', H: 'Ħ', i: 'ï', I: 'Ï', j: 'ĵ', J: 'Ĵ',
  k: 'ķ', K: 'Ķ', l: 'ļ', L: 'Ļ', m: 'ɱ', M: 'Ṁ', n: 'ñ', N: 'Ñ', o: 'ô', O: 'Ô',
  p: 'þ', P: 'Þ', q: 'ʠ', Q: 'Ɋ', r: 'ŕ', R: 'Ŕ', s: 'š', S: 'Š', t: 'ŧ', T: 'Ŧ',
  u: 'ü', U: 'Ü', v: 'ṽ', V: 'Ṽ', w: 'ŵ', W: 'Ŵ', x: 'ẋ', X: 'Ẋ', y: 'ÿ', Y: 'Ÿ',
  z: 'ž', Z: 'Ž',
}

function accentLiteral(value: string): string {
  const accented = [...value].map(character => ACCENTS[character] ?? character).join('')
  const expansion = ' !!!'.repeat(Math.max(1, Math.ceil(value.length / 18)))
  return `［${accented}${expansion}］`
}

function transformLiterals(elements: MessageFormatElement[]): void {
  for (const element of elements) {
    switch (element.type) {
      case TYPE.literal:
        element.value = accentLiteral(element.value)
        break
      case TYPE.select:
      case TYPE.plural:
        for (const option of Object.values(element.options)) transformLiterals(option.value)
        break
      case TYPE.tag:
        transformLiterals(element.children)
        break
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
      case TYPE.pound:
        break
    }
  }
}

export function pseudoLocalize(message: string, locale: 'en-XA' | 'ar-XB' = 'en-XA'): string {
  const ast = parse(message)
  transformLiterals(ast)
  const transformed = printAST(ast)
  return locale === 'ar-XB' ? `\u202e${transformed}\u202c` : transformed
}

export function createPseudoCatalog(
  source: SourceCatalog,
  locale: 'en-XA' | 'ar-XB' = 'en-XA',
  generatedAt = new Date().toISOString(),
): TranslationCatalog {
  const messages: Record<string, string> = {}
  const sourceHashes: Record<string, string> = {}
  for (const [key, descriptor] of Object.entries(source.messages)) {
    messages[key] = pseudoLocalize(descriptor.defaultMessage, locale)
    sourceHashes[key] = messageSourceHash(key, descriptor)
  }
  return {
    schemaVersion: 1,
    namespace: source.namespace,
    sourceLocale: source.sourceLocale,
    locale,
    sourceHash: sourceCatalogHash(source),
    sourceHashes,
    messages,
    provider: 'dsh-pseudo',
    reviewState: 'machine',
    generatedAt,
  }
}
