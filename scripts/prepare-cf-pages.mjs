import { cpSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
const out = join(root, '.open-next', 'assets')
const src = join(root, '.open-next')

copyFileSync(join(src, 'worker.js'), join(out, '_worker.js'))

cpSync(join(src, 'server-functions'), join(out, 'server-functions'), { recursive: true })

if (existsSync(join(src, 'middleware'))) {
  cpSync(join(src, 'middleware'), join(out, 'middleware'), { recursive: true })
}

if (existsSync(join(src, '.build'))) {
  cpSync(join(src, '.build'), join(out, '.build'), { recursive: true })
}

console.log('✅ Cloudflare Pages bundle prepared')
