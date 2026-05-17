import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  generateFixtureFromCaseSpec,
  generateFixtureFromSeed,
} from '../index.js'

function listFixture(label, dir) {
  console.log(`\n${label}`)
  console.log(`  dir: ${dir}`)
  for (const entry of readdirSync(dir)) {
    console.log(`    - ${entry}`)
  }
}

// 1. Random graph derived from a deterministic u64 seed.
const seedDir = generateFixtureFromSeed(42n)
listFixture('seed-based fixture (seed = 42)', seedDir)

// 2. Same seed + explicit output directory.
const customDir = generateFixtureFromSeed(
  42n,
  resolve(process.cwd(), 'fixtures/seed-42'),
)
listFixture('seed-based fixture into custom dir', customDir)

// 3. Deterministic graph constructed from a case spec.
//    Spec grammar (per acyclic_output_fuzz):
//      n=<nodes>;e=<entries>;c=<cjs>;s=<static>;d=<dynamic>;
//      r=<reexport>;x=<external>;p=<preserveSig>;o=<order>;
//      t=<treeshake>;m=<minify>
//
//    This one: 3 modules, node 0 is the entry, static imports 0->1->2.
const spec = 'n=3;e=0;c=none;s=0-1,1-2;d=none;r=none;x=none;p=0;o=0;t=0;m=1'
const specDir = generateFixtureFromCaseSpec(1n, spec)
listFixture(`case-spec fixture: ${spec}`, specDir)

console.log('\nEach directory contains node*.{js,cjs} modules + rolldown.config.js.')
console.log('Run rolldown against rolldown.config.js to bundle and inspect the output.')
