import { defineConfig } from 'tsdown'

const id = '@deepseek-ai/dsh-client-locale'
const clientExternals = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-slots',
]

export default defineConfig([
  {
    entry: {
      index: 'lib/types/index.js',
      tooling: 'lib/types/tooling.js',
      cli: 'lib/types/cli.js',
    },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  {
    entry: { client: 'lib/types/client/index.js' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    deps: {
      neverBundle: clientExternals,
      alwaysBundle: dependency => !clientExternals.includes(dependency),
    },
    dts: false,
    sourcemap: true,
    minify: true,
    clean: false,
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
