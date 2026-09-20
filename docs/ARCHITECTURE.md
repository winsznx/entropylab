# Architecture

## Implementation stack

**Decision: TypeScript-first, single language across the core library and the eventual web
application.** Rust plus WebAssembly was the considered alternative.

Evaluated against the criteria in the project brief:

| Criterion                     | TypeScript                                                                                               | Rust + WASM                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Correctness of the estimators | Equivalent. These are `f64` arithmetic over small arrays, not code where Rust's guarantees buy anything. | Equivalent.                                                                         |
| Ease of testing               | One runner (Vitest) covering library and app.                                                            | Two test surfaces, Rust and JS, plus a boundary between them.                       |
| Deterministic local execution | Deterministic. No floating-point reassociation across platforms in the operations used.                  | Deterministic.                                                                      |
| Browser portability           | Direct. The core is plain ESM that a bundler consumes.                                                   | Requires a WASM build step, a loader, and an async init the UI must thread through. |
| Integration API               | An integrator adds one dependency and calls a function.                                                  | An integrator additionally ships and initialises a `.wasm` artifact.                |
| Delivery speed                | No build step between writing an estimator and running it in the browser.                                | Toolchain setup and glue before the first estimator runs.                           |

The workload is the deciding factor. The estimators run over calibration samples of roughly
10^2 to 10^6 symbols with O(L) or O(L·k) passes. That is milliseconds of arithmetic in either
language, so Rust's performance advantage does not reach the user. What the WASM path does add is
a compilation boundary sitting between the code and the offline browser target, which is the one
environment the product must work in.

Rust becomes worth revisiting if the core is later embedded in a hardware signer, where a
no-JS-runtime target is a hard requirement. That is post-v1 and is listed as a stretch item.

## Repository shape

```text
entropylab/
├── packages/
│   ├── core/        @entropylab/core      types, validation, estimators, analysis pipeline
│   ├── fixtures/    @entropylab/fixtures  deterministic adversarial datasets
│   └── report/      @entropylab/report    canonical JSON result and Markdown rendering
├── scripts/                               proof-campaign runner and reference-comparison tooling
├── docs/                                  methodology, architecture, scope, campaign results
└── apps/web/                              offline application (not yet started)
```

Packages are pnpm workspace members. They are consumed from TypeScript source rather than from a
build output, which removes a compile step from the edit-test loop; the bundler that builds the web
application compiles them alongside the app.

## Core library constraints

The core is a pure computational layer and is held to these rules:

- No I/O, no clock reads, no network, no randomness inside estimator code paths. An estimator's
  output is a function of its input alone, which is what makes a report reproducible from the
  dataset plus a version number.
- No browser or Node-specific globals, so the same code runs in a test process, in a bundled web
  application, and in an integrator's environment.
- An estimator never throws on adversarial input. Input it cannot handle is reported as
  `applicable: false` with a machine-readable reason, because a thrown exception would either crash
  the pipeline or tempt a caller into substituting a default value.
- An estimator never substitutes a placeholder number when it cannot run. Reporting a fabricated
  value is the specific failure this product exists to prevent.

## Determinism and reproducibility

Fixture generation uses a seeded PRNG implemented in-repo rather than `Math.random`, so every
dataset in the proof campaign regenerates byte-identically on any machine. Analysis results carry
an algorithm version and a hash of the input, which together let a third party re-derive a report
from the same repository state.
