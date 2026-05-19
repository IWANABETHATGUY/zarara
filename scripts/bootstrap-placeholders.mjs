#!/usr/bin/env node
// One-shot bootstrap: publish minimal 0.0.0 placeholders for every package
// name we'll eventually ship, so we can attach Trusted Publishers to them
// on npmjs.com BEFORE the first real release.
//
// After this runs successfully you can immediately revoke any local npm
// token, because all future releases go through GitHub Actions OIDC.
//
// Prerequisites:
//   - You are logged in to npm with `npm login` (or have ~/.npmrc set).
//   - The names below are still available on npm.
//
// Usage:
//   node scripts/bootstrap-placeholders.mjs --otp 123456     # publish (with 2FA)
//   node scripts/bootstrap-placeholders.mjs                  # publish (no 2FA on account)
//   node scripts/bootstrap-placeholders.mjs --dry-run        # show what it would do
//
// If your npm account has 2FA enabled on writes, open your authenticator,
// grab the current 6-digit code, and pass it via --otp. The same code is
// reused for all six publishes (one OTP is valid for a few minutes).

import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGES = [
  'rolldown-zarara',
  'rolldown-zarara-darwin-x64',
  'rolldown-zarara-darwin-arm64',
  'rolldown-zarara-linux-x64-gnu',
  'rolldown-zarara-linux-arm64-gnu',
  'rolldown-zarara-win32-x64-msvc',
]

const VERSION = '0.0.0'
const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const otpIndex = argv.indexOf('--otp')
const otp = otpIndex >= 0 ? argv[otpIndex + 1] : undefined

if (otpIndex >= 0 && !/^\d{6}$/.test(otp ?? '')) {
  console.error('--otp must be followed by a 6-digit code')
  process.exit(1)
}

const root = resolve(fileURLToPath(import.meta.url), '../..')
const stagingRoot = resolve(root, '.bootstrap-placeholders')
mkdirSync(stagingRoot, { recursive: true })

let skipped = 0
let published = 0
let failed = 0

for (const name of PACKAGES) {
  // Skip if this exact name already exists on npm (any version) — we just
  // need each name to exist so Trusted Publishers can be attached.
  if (!dryRun && packageExists(name)) {
    console.log(`= ${name} already on npm, skipping`)
    skipped++
    continue
  }

  const dir = resolve(stagingRoot, name)
  mkdirSync(dir, { recursive: true })

  const pkg = {
    name,
    version: VERSION,
    description: `Placeholder for ${name}; will be replaced by a real release.`,
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'git+https://github.com/IWANABETHATGUY/zarara.git',
    },
  }
  writeFileSync(
    resolve(dir, 'package.json'),
    JSON.stringify(pkg, null, 2) + '\n',
  )
  writeFileSync(
    resolve(dir, 'README.md'),
    `# ${name}\n\nPlaceholder version. Install \`rolldown-zarara@>=0.1.0\` for the real package.\n`,
  )

  const otpFlag = otp ? ` --otp=${otp}` : ''
  const cmd = `npm publish --access public${dryRun ? ' --dry-run' : ''}${otpFlag}`
  // Don't echo the OTP into stdout.
  const shown = `npm publish --access public${dryRun ? ' --dry-run' : ''}${otp ? ' --otp=******' : ''}`
  console.log(`\n> ${shown}    (cwd: ${dir})`)
  try {
    execSync(cmd, { cwd: dir, stdio: 'inherit' })
    published++
  } catch {
    failed++
    console.error(`! publish failed for ${name}, continuing with the rest`)
  }
}

function packageExists(name) {
  try {
    execSync(`npm view ${name} name`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

console.log('\n----------------------------------------')
if (dryRun) {
  console.log('Dry run complete. Re-run without --dry-run to actually publish.')
} else {
  console.log(
    `Published ${published}, skipped ${skipped} (already on npm), failed ${failed}.`,
  )
  if (failed > 0) {
    console.log('\nRe-run the script after fixing the cause of the failure.')
    process.exit(1)
  }
  console.log('\nNext steps:')
  console.log('  1. On npmjs.com, open each of the 6 packages and configure')
  console.log('     Trusted Publishers (GitHub Actions / IWANABETHATGUY / zarara /')
  console.log('     workflow: napi-publish.yml).')
  console.log('  2. Tell me when that is done and I will update the workflow to')
  console.log('     remove NPM_TOKEN and use OIDC + --provenance.')
  console.log(`  3. Clean up staging: rm -rf ${stagingRoot}`)
}
