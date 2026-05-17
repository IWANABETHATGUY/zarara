# acyclic-output-fuzz

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
} = require('acyclic-output-fuzz')

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
pnpm --filter acyclic-output-fuzz example
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
