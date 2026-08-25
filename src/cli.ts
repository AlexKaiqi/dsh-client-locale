#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import type {
  MessageDescriptor,
  SourceCatalog,
  TranslationCatalog,
} from './messages.ts'
import {
  createPseudoCatalog,
  messageSignature,
  messageSourceHash,
  sourceCatalogHash,
  validateTranslationCatalog,
} from './tooling.ts'

interface ParsedArguments {
  options: Map<string, string>
  positionals: string[]
}

interface TranslatorResponse {
  messages: Record<string, string>
  provider?: string
}

function parseArguments(values: string[]): ParsedArguments {
  const options = new Map<string, string>()
  const positionals: string[] = []
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!value) continue
    if (!value.startsWith('--')) {
      positionals.push(value)
      continue
    }
    const separator = value.indexOf('=')
    if (separator >= 0) {
      options.set(value.slice(2, separator), value.slice(separator + 1))
      continue
    }
    const next = values[index + 1]
    if (!next || next.startsWith('--')) throw new Error(`option ${value} requires a value`)
    options.set(value.slice(2), next)
    index += 1
  }
  return { options, positionals }
}

function required(options: Map<string, string>, name: string): string {
  const value = options.get(name)?.trim()
  if (!value) throw new Error(`missing required option --${name}`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

function sourceCatalog(value: unknown, path: string): SourceCatalog {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.namespace !== 'string'
    || typeof value.sourceLocale !== 'string' || !isRecord(value.messages)) {
    throw new Error(`${path} is not a DSH source catalog`)
  }
  const messages: Record<string, MessageDescriptor> = {}
  for (const [id, entry] of Object.entries(value.messages)) {
    if (!isRecord(entry) || typeof entry.defaultMessage !== 'string') {
      throw new Error(`${path}: message "${id}" has no defaultMessage`)
    }
    const descriptor: MessageDescriptor = { id, defaultMessage: entry.defaultMessage }
    if (typeof entry.description === 'string') descriptor.description = entry.description
    if (typeof entry.file === 'string') descriptor.file = entry.file
    if (isRecord(entry.start) && typeof entry.start.line === 'number' && typeof entry.start.column === 'number') {
      descriptor.start = {
        line: entry.start.line,
        column: entry.start.column,
        ...(typeof entry.start.offset === 'number' ? { offset: entry.start.offset } : {}),
      }
    }
    if (isRecord(entry.end) && typeof entry.end.line === 'number' && typeof entry.end.column === 'number') {
      descriptor.end = {
        line: entry.end.line,
        column: entry.end.column,
        ...(typeof entry.end.offset === 'number' ? { offset: entry.end.offset } : {}),
      }
    }
    messageSignature(descriptor.defaultMessage)
    messages[id] = descriptor
  }
  return {
    schemaVersion: 1,
    namespace: value.namespace,
    sourceLocale: value.sourceLocale,
    messages,
  }
}

function translationCatalog(value: unknown, path: string): TranslationCatalog {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.namespace !== 'string'
    || typeof value.sourceLocale !== 'string' || typeof value.locale !== 'string'
    || typeof value.sourceHash !== 'string' || !isRecord(value.sourceHashes)
    || !isRecord(value.messages) || typeof value.generatedAt !== 'string'
    || !['machine', 'mixed', 'reviewed'].includes(String(value.reviewState))) {
    throw new Error(`${path} is not a DSH translation catalog`)
  }
  const messages: Record<string, string> = {}
  for (const [key, message] of Object.entries(value.messages)) {
    if (typeof message !== 'string') throw new Error(`${path}: translation "${key}" is not a string`)
    messages[key] = message
  }
  const sourceHashes: Record<string, string> = {}
  for (const [key, hash] of Object.entries(value.sourceHashes)) {
    if (typeof hash !== 'string') throw new Error(`${path}: source hash "${key}" is not a string`)
    sourceHashes[key] = hash
  }
  const locked = Array.isArray(value.locked)
    ? value.locked.filter((key): key is string => typeof key === 'string')
    : undefined
  return {
    schemaVersion: 1,
    namespace: value.namespace,
    sourceLocale: value.sourceLocale,
    locale: value.locale,
    sourceHash: value.sourceHash,
    sourceHashes,
    messages,
    ...(locked ? { locked } : {}),
    ...(typeof value.provider === 'string' ? { provider: value.provider } : {}),
    reviewState: value.reviewState as TranslationCatalog['reviewState'],
    generatedAt: value.generatedAt,
  }
}

async function extractCommand(args: ParsedArguments): Promise<void> {
  const namespace = required(args.options, 'namespace')
  const sourceLocale = required(args.options, 'source-locale')
  const outFile = required(args.options, 'out-file')
  if (args.positionals.length === 0) throw new Error('extract requires at least one source glob')

  const temporary = await mkdtemp(join(tmpdir(), 'dsh-i18n-'))
  const extractedPath = join(temporary, 'messages.json')
  try {
    const require = createRequire(import.meta.url)
    const packagePath = require.resolve('@formatjs/cli/package.json')
    const executable = join(dirname(packagePath), 'bin', 'formatjs')
    const result = spawnSync(process.execPath, [
      executable,
      'extract',
      ...args.positionals,
      '--out-file', extractedPath,
      '--additional-function-names', 'defineMessages',
      '--extract-source-location',
      '--throws',
    ], { encoding: 'utf8' })
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || 'FormatJS extraction failed')
    }
    const extracted = await readJson(extractedPath)
    if (!isRecord(extracted)) throw new Error('FormatJS returned an invalid message map')
    const messages: Record<string, MessageDescriptor> = {}
    for (const [id, entry] of Object.entries(extracted)) {
      if (!isRecord(entry) || typeof entry.defaultMessage !== 'string') continue
      messages[id] = { ...(entry as Omit<MessageDescriptor, 'id'>), id }
    }
    const source: SourceCatalog = { schemaVersion: 1, namespace, sourceLocale, messages }
    sourceCatalog(source, 'extracted messages')
    await writeJsonAtomic(outFile, source)
    process.stdout.write(`extracted ${Object.keys(messages).length} messages to ${outFile}\n`)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

async function checkCommand(args: ParsedArguments): Promise<void> {
  const sourcePath = required(args.options, 'source')
  const source = sourceCatalog(await readJson(sourcePath), sourcePath)
  if (args.positionals.length === 0) {
    process.stdout.write(`source catalog is valid (${Object.keys(source.messages).length} messages)\n`)
    return
  }
  let issueCount = 0
  for (const path of args.positionals) {
    const translation = translationCatalog(await readJson(path), path)
    const issues = validateTranslationCatalog(source, translation)
    for (const issue of issues) process.stderr.write(`${path}: ${issue.code}: ${issue.key}: ${issue.message}\n`)
    issueCount += issues.length
  }
  if (issueCount > 0) throw new Error(`${issueCount} catalog issue(s) found`)
  process.stdout.write(`validated ${args.positionals.length} translation catalog(s)\n`)
}

async function pseudoCommand(args: ParsedArguments): Promise<void> {
  const sourcePath = required(args.options, 'source')
  const outFile = required(args.options, 'out-file')
  const localeValue = args.options.get('locale') ?? 'en-XA'
  if (localeValue !== 'en-XA' && localeValue !== 'ar-XB') {
    throw new Error('--locale must be en-XA or ar-XB')
  }
  const source = sourceCatalog(await readJson(sourcePath), sourcePath)
  await writeJsonAtomic(outFile, createPseudoCatalog(source, localeValue))
  process.stdout.write(`generated ${localeValue} pseudo catalog at ${outFile}\n`)
}

async function translateLocale(
  source: SourceCatalog,
  locale: string,
  outPath: string,
  endpoint: string,
): Promise<void> {
  let existing: TranslationCatalog | undefined
  try {
    existing = translationCatalog(await readJson(outPath), outPath)
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
  }
  if (existing && (existing.namespace !== source.namespace || existing.locale !== locale)) {
    throw new Error(`${outPath} belongs to another namespace or locale`)
  }

  const locked = new Set((existing?.locked ?? []).filter(key => source.messages[key] !== undefined))
  const requested: Record<string, unknown> = {}
  for (const [key, descriptor] of Object.entries(source.messages)) {
    const currentHash = messageSourceHash(key, descriptor)
    if (locked.has(key) || existing?.sourceHashes[key] === currentHash) continue
    requested[key] = {
      source: descriptor.defaultMessage,
      description: descriptor.description ?? '',
      signature: messageSignature(descriptor.defaultMessage),
      location: descriptor.file
        ? { file: descriptor.file, start: descriptor.start, end: descriptor.end }
        : undefined,
    }
  }

  let response: TranslatorResponse = { messages: {} }
  if (Object.keys(requested).length > 0) {
    const token = process.env.DSH_I18N_TRANSLATOR_TOKEN
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (token) headers.authorization = `Bearer ${token}`
    const result = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        schemaVersion: 1,
        task: 'translate-ui-messages',
        namespace: source.namespace,
        sourceLocale: source.sourceLocale,
        targetLocale: locale,
        instructions: [
          'Return natural UI translations as JSON.',
          'Preserve every ICU argument and rich-text tag exactly.',
          'Do not translate product names without explicit context.',
        ],
        messages: requested,
      }),
    })
    if (!result.ok) throw new Error(`translator returned HTTP ${result.status}`)
    const value = await result.json() as unknown
    if (!isRecord(value) || !isRecord(value.messages)) throw new Error('translator returned an invalid response')
    const messages: Record<string, string> = {}
    for (const [key, translated] of Object.entries(value.messages)) {
      if (!(key in requested)) throw new Error(`translator returned unexpected key "${key}"`)
      if (typeof translated !== 'string') throw new Error(`translator returned non-string key "${key}"`)
      messages[key] = translated
    }
    for (const key of Object.keys(requested)) {
      if (messages[key] === undefined) throw new Error(`translator omitted key "${key}"`)
    }
    response = { messages, ...(typeof value.provider === 'string' ? { provider: value.provider } : {}) }
  }

  const messages: Record<string, string> = {}
  const sourceHashes: Record<string, string> = {}
  for (const key of Object.keys(source.messages)) {
    const existingMessage = existing?.messages[key]
    if (existingMessage !== undefined) messages[key] = existingMessage
    const existingHash = existing?.sourceHashes[key]
    if (existingHash !== undefined) sourceHashes[key] = existingHash
  }
  Object.assign(messages, response.messages)
  for (const [key, descriptor] of Object.entries(source.messages)) {
    if (!locked.has(key) || response.messages[key] !== undefined) {
      sourceHashes[key] = messageSourceHash(key, descriptor)
    }
  }
  const catalog: TranslationCatalog = {
    schemaVersion: 1,
    namespace: source.namespace,
    sourceLocale: source.sourceLocale,
    locale,
    sourceHash: sourceCatalogHash(source),
    sourceHashes,
    messages,
    ...(locked.size > 0 ? { locked: [...locked].sort() } : {}),
    provider: response.provider ?? existing?.provider ?? 'translator-endpoint',
    reviewState: locked.size > 0 ? 'mixed' : 'machine',
    generatedAt: new Date().toISOString(),
  }
  const blockingIssues = validateTranslationCatalog(source, catalog).filter(issue =>
    !(issue.code === 'stale-source' && locked.has(issue.key)))
  if (blockingIssues.length > 0) {
    throw new Error(blockingIssues.map(issue => `${issue.code} ${issue.key}: ${issue.message}`).join('\n'))
  }
  await writeJsonAtomic(outPath, catalog)
  process.stdout.write(`updated ${locale} catalog at ${outPath}\n`)
  for (const key of locked) {
    const descriptor = source.messages[key]
    if (descriptor && sourceHashes[key] !== messageSourceHash(key, descriptor)) {
      process.stderr.write(`${outPath}: locked translation "${key}" needs review after its source changed\n`)
    }
  }
}

async function translateCommand(args: ParsedArguments): Promise<void> {
  const sourcePath = required(args.options, 'source')
  const outDir = required(args.options, 'out-dir')
  const endpoint = required(args.options, 'endpoint')
  const locales = required(args.options, 'locales').split(',').map(value => value.trim()).filter(Boolean)
  const source = sourceCatalog(await readJson(sourcePath), sourcePath)
  for (const locale of locales) {
    await translateLocale(source, locale, join(outDir, `${locale}.json`), endpoint)
  }
}

function usage(): string {
  return `DSH internationalization toolkit

Usage:
  dsh-i18n extract --namespace NAME --source-locale en --out-file FILE <globs...>
  dsh-i18n check --source FILE <translation-files...>
  dsh-i18n pseudo --source FILE --locale en-XA --out-file FILE
  dsh-i18n translate --source FILE --locales fr,ja --out-dir DIR --endpoint URL

The translation endpoint receives JSON and returns {"messages":{"id":"translation"}}.
Set DSH_I18N_TRANSLATOR_TOKEN to send a bearer token without placing it in arguments.
`
}

async function main(): Promise<void> {
  const command = process.argv[2]
  if (!command || command === 'help' || command === '--help') {
    process.stdout.write(usage())
    return
  }
  const args = parseArguments(process.argv.slice(3))
  if (command === 'extract') return extractCommand(args)
  if (command === 'check') return checkCommand(args)
  if (command === 'pseudo') return pseudoCommand(args)
  if (command === 'translate') return translateCommand(args)
  throw new Error(`unknown command "${command}"\n\n${usage()}`)
}

void main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
