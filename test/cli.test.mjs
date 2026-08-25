import assert from 'node:assert/strict'
import { execFile, execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)

test('CLI extracts defineMessages descriptors into a source catalog', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-i18n-test-'))
  const output = join(temporary, 'source.json')
  try {
    execFileSync(process.execPath, [
      new URL('../lib/cli.js', import.meta.url).pathname,
      'extract',
      '--namespace', 'fixture',
      '--source-locale', 'en',
      '--out-file', output,
      new URL('./fixtures/messages.ts', import.meta.url).pathname,
    ], { stdio: 'pipe' })
    const catalog = JSON.parse(await readFile(output, 'utf8'))
    assert.equal(catalog.namespace, 'fixture')
    assert.equal(catalog.messages.greeting.defaultMessage, 'Hello, {name}!')
    assert.equal(catalog.messages.greeting.id, 'greeting')
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test('CLI translates through a provider-neutral endpoint and writes provenance', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-i18n-translate-test-'))
  const sourcePath = join(temporary, 'source.json')
  const outDir = join(temporary, 'locales')
  await writeFile(sourcePath, JSON.stringify({
    schemaVersion: 1,
    namespace: 'fixture',
    sourceLocale: 'en',
    messages: {
      greeting: { id: 'greeting', defaultMessage: 'Hello, {name}!', description: 'Greeting' },
    },
  }))
  const server = createServer((request, response) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', chunk => { body += chunk })
    request.on('end', () => {
      const job = JSON.parse(body)
      assert.equal(job.targetLocale, 'fr')
      assert.deepEqual(job.messages.greeting.signature.arguments, ['name'])
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({
        provider: 'fixture-translator',
        messages: { greeting: 'Bonjour, {name} !' },
      }))
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.equal(typeof address, 'object')
  try {
    await execFileAsync(process.execPath, [
      new URL('../lib/cli.js', import.meta.url).pathname,
      'translate',
      '--source', sourcePath,
      '--locales', 'fr',
      '--out-dir', outDir,
      '--endpoint', `http://127.0.0.1:${address.port}`,
    ])
    const catalog = JSON.parse(await readFile(join(outDir, 'fr.json'), 'utf8'))
    assert.equal(catalog.messages.greeting, 'Bonjour, {name} !')
    assert.equal(catalog.provider, 'fixture-translator')
    assert.equal(catalog.reviewState, 'machine')
    assert.match(catalog.sourceHash, /^sha256:/u)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await rm(temporary, { recursive: true, force: true })
  }
})
