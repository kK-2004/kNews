import { createGzip } from 'node:zlib'
import { createReadStream, createWriteStream, promises as fs } from 'node:fs'
import { extname, join } from 'node:path'

const ROOT = new URL('../dist', import.meta.url)
const allowed = new Set(['.js', '.css', '.html', '.json', '.svg'])

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full)
      continue
    }

    if (!allowed.has(extname(entry.name))) continue

    await new Promise((resolve, reject) => {
      createReadStream(full)
        .pipe(createGzip({ level: 9 }))
        .pipe(createWriteStream(`${full}.gz`))
        .on('finish', resolve)
        .on('error', reject)
    })
  }
}

await walk(ROOT)
console.log('Created gzip artifacts for dist assets')
