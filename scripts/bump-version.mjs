// Bumps the patch version in package.json by one.
// Invoked by the pre-commit hook so the version changes on every commit.
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(readFileSync(path, 'utf8'))

const parts = pkg.version.split('.').map(Number)
if (parts.length !== 3 || parts.some(Number.isNaN)) {
  console.error(`bump-version: unexpected version "${pkg.version}" (need MAJOR.MINOR.PATCH)`)
  process.exit(1)
}

const [major, minor, patch] = parts
pkg.version = `${major}.${minor}.${patch + 1}`

writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n')
console.log(`version → ${pkg.version}`)
