#!/usr/bin/env node
// Sync the `version` field across the main napi package and every
// per-platform sub-package under napi/npm/<triple>/package.json.
//
// Usage:
//   pnpm bump <new-version>
//   node scripts/bump-version.mjs <new-version>

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

const newVersion = process.argv[2]
if (!newVersion) {
  console.error('Usage: pnpm bump <new-version>')
  process.exit(1)
}
if (!SEMVER_RE.test(newVersion)) {
  console.error(`Invalid semver: ${newVersion}`)
  process.exit(1)
}

const root = resolve(fileURLToPath(import.meta.url), '../..')
const napiDir = resolve(root, 'napi')
const npmDir = resolve(napiDir, 'npm')

const targets = [
  resolve(napiDir, 'package.json'),
  ...readdirSync(npmDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => resolve(npmDir, d.name, 'package.json')),
]

let changed = 0
for (const file of targets) {
  const raw = readFileSync(file, 'utf8')
  const pkg = JSON.parse(raw)
  const previous = pkg.version

  if (previous === newVersion) {
    console.log(`= ${relative(file)} (already ${newVersion})`)
    continue
  }

  pkg.version = newVersion
  const trailingNewline = raw.endsWith('\n') ? '\n' : ''
  writeFileSync(file, JSON.stringify(pkg, null, 2) + trailingNewline)
  console.log(`~ ${relative(file)}: ${previous} -> ${newVersion}`)
  changed++
}

if (changed === 0) {
  console.log('\nNothing to do.')
} else {
  console.log(`\nUpdated ${changed} file(s). Next:`)
  console.log(`  git commit -am "napi: v${newVersion}"`)
  console.log(`  git tag napi-v${newVersion}`)
  console.log(`  git push --follow-tags`)
}

function relative(p) {
  return p.replace(root + '\\', '').replace(root + '/', '').replaceAll('\\', '/')
}
