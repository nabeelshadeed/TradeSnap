import { cpSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const root = process.cwd()
const out = join(root, '.open-next', 'assets')
const src = join(root, '.open-next')

// Bundle worker.js + all its relative imports into a single self-contained _worker.js
// Cloudflare Pages re-bundles the worker with esbuild so relative imports must be inlined
console.log('Bundling worker into single file...')
execSync(
  [
    'node_modules/.bin/esbuild',
    `${src}/worker.js`,
    '--bundle',
    `--outfile=${out}/_worker.js`,
    '--format=esm',
    '--platform=browser',
    '--conditions=worker,browser',
    '--external:node:*',
    '--external:cloudflare:*',
    '--minify',
    '--log-level=warning',
  ].join(' '),
  { stdio: 'inherit' }
)

// Still copy server-functions for any dynamic requires at runtime
if (existsSync(join(src, 'server-functions'))) {
  cpSync(join(src, 'server-functions'), join(out, 'server-functions'), { recursive: true })
}

console.log('✅ Cloudflare Pages bundle prepared')
