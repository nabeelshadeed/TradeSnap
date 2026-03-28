import { cpSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
const out = join(root, '.open-next', 'assets')
const src = join(root, '.open-next')

// _worker.js (required by Cloudflare Pages advanced mode)
copyFileSync(join(src, 'worker.js'), join(out, '_worker.js'))

// server function handler
cpSync(join(src, 'server-functions'), join(out, 'server-functions'), { recursive: true })

// middleware handler
if (existsSync(join(src, 'middleware'))) {
  cpSync(join(src, 'middleware'), join(out, 'middleware'), { recursive: true })
}

// durable objects (queue, tag-cache, etc.)
if (existsSync(join(src, '.build'))) {
  cpSync(join(src, '.build'), join(out, '.build'), { recursive: true })
}

console.log('✅ Cloudflare Pages bundle prepared')
