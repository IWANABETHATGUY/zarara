# rolldown-zarara

Node.js bindings for the `acyclic_output_fuzz` Rust crate. Generates synthetic
ES-module fixtures (modules + `rolldown.config.js`) intended to surface
circular-reference outputs from the rolldown bundler.

## Prerequisites

The underlying crate depends on `rolldown` via a git submodule. From the
workspace root:

```sh
git submodule update --init --recursive
```

## Build

From the workspace root:

```sh
pnpm install
pnpm build:dev       # fast, unoptimized — good for iteration
pnpm build:release   # optimized + LTO — slow to compile, fast at runtime
```

`pnpm build` is an alias for `pnpm build:release`.

Either command produces a platform-specific `.node` addon plus the generated
`index.js` and `index.d.ts`.

## Usage

```js
const {
  generateFixtureFromSeed,
  generateFixtureFromCaseSpec,
} = require('rolldown-zarara')

// Random graph from a u64 seed.
const dir1 = generateFixtureFromSeed(42n)
console.log(dir1)

// Optional explicit output directory.
const dir2 = generateFixtureFromSeed(42n, '/tmp/my-fixture')

// Deterministic graph from a case spec string.
const spec = 'n=3;e=0;c=none;s=0-1,1-2;d=none;r=none;x=none;p=0;o=0;t=0;m=1'
const dir3 = generateFixtureFromCaseSpec(1n, spec)
```

Each call writes `rolldown.config.js` plus `node*.{js,cjs}` files into the
returned directory.

A runnable example lives at `examples/generate.mjs`:

```sh
pnpm --filter rolldown-zarara example
```

## API

```ts
function generateFixtureFromSeed(
  seed: bigint,
  outputDir?: string | null,
): string

function generateFixtureFromCaseSpec(
  seed: bigint,
  caseSpec: string,
  outputDir?: string | null,
): string
```

## Publishing

CI publishes to npm via `.github/workflows/napi-publish.yml`. Two triggers:

1. **Tag push** — push a tag like `napi-v0.1.0`.
2. **Manual** — run the workflow from the GitHub UI ("Run workflow").

The workflow builds the binary on five targets in a matrix
(`x86_64-apple-darwin`, `aarch64-apple-darwin`, `x86_64-unknown-linux-gnu`,
`aarch64-unknown-linux-gnu`, `x86_64-pc-windows-msvc`), collects the
`.node` artifacts into `napi/npm/<triple>/`, and runs `npm publish` on
the main package plus each per-platform sub-package.

### One-time setup

Create an automation token at npmjs.com and add it as a repository secret
named `NPM_TOKEN`. The workflow reads it through `${{ secrets.NPM_TOKEN }}`.

### Cutting a release

1. From the repo root, bump every package in lockstep:
   ```sh
   pnpm bump 0.1.1
   ```
   This rewrites `napi/package.json` and each `napi/npm/<triple>/package.json`
   so they share the same version.
2. Commit and tag:
   ```sh
   git commit -am "napi: v0.1.1"
   git tag napi-v0.1.1
   git push --follow-tags
   ```
3. Watch the `napi-publish` workflow run; check npm for the new versions.

### Adding or removing a target

Edit the matrix in `.github/workflows/napi-publish.yml` **and** the
`napi.triples.additional` list in `napi/package.json`. For new triples,
also create `napi/npm/<triple>/package.json` mirroring the existing files.
