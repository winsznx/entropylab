# Integrating EntropyLab

For a wallet, signer, or seed tool that wants to profile a user's physical
entropy process before it is trusted with a seed.

Run this example:

```bash
pnpm install
pnpm --filter @entropylab/example-integrator start
```

## Minimum integration

One import and one call. This is the same entry point the EntropyLab
application uses; there is no separate embedding API.

```ts
import { analyze, explain } from "@entropylab/core";

const analysis = analyze(
  // Observations are zero-based symbol ids. Faces a person reads are one-based.
  { alphabetSize: 6, observations: faces.map((face) => face - 1) },
  { targetBits: [128] },
);

const limiting = analysis.estimators.find((e) => e.id === analysis.limitingEstimator);

analysis.conservativeBitsPerSymbol; // bits per roll, or undefined
limiting?.label; // which method produced it
analysis.targetGuidance[0]?.estimatedSamplesRequired; // rolls needed, or undefined
analysis.estimators.filter((e) => !e.applicable); // methods that could not run
analysis.warnings; // what the user has to be told
explain(analysis).recommendationText; // one next step, in plain language
```

`analyze` is synchronous, pure, and has no dependencies. It performs no I/O,
reads no clock, and uses no randomness, so the same input always produces the
same output.

## What comes back

```ts
interface EntropyAnalysis {
  version: string; // algorithm version; put this in your records
  sampleCount: number;
  alphabetSize: number;
  idealBitsPerSymbol: number; // log2(alphabetSize)
  estimators: EstimatorResult[]; // every method, including ones that declined
  limitingEstimator?: string; // id of the method that governed
  conservativeBitsPerSymbol?: number; // the lowest applicable estimate
  targetGuidance: TargetGuidance[];
  warnings: string[];
}
```

Three fields are optional, and the reason matters.

`conservativeBitsPerSymbol` is absent when no method could run. Do not
substitute zero. Zero means measured as worthless; absent means not measured.
A wallet that treats them the same will tell a user their dice are broken when
the real answer is that they have not rolled enough yet.

`estimatedSamplesRequired` is absent when the measured rate is zero. There is
no roll count that reaches a target at zero bits per roll, and printing a very
large number would imply otherwise.

`EstimatorResult.bitsPerSymbol` is absent when `applicable` is false. Each
result also carries `quality`, which is `usable`, `unstable`, or
`not-applicable`. A figure marked `unstable` came from a sample smaller than
the method is comfortable with; it is still the honest lowest bound, but it
should not be presented as settled.

## Offline and local

The core has no dependencies, opens no sockets, and touches no storage. It runs
in a browser, in Node, in a service worker, or on an air-gapped machine.

Calibration observations are the user's. Do not transmit them. If your product
needs to store a result, the report format in `@entropylab/report` carries a
SHA-256 of the dataset, which identifies it without containing it.

## What not to claim

EntropyLab measures evidence of bias and predictability in a calibration
sample. Building it into a product does not let that product say more than the
library does.

- **Do not describe a result as certified, validated, or NIST-approved.** This
  is not an SP 800-90B validation and confers no certification.
- **Do not present a high figure as proof of randomness.** A result at
  `idealBitsPerSymbol` means these four methods found no structure, which is
  not the same as there being none.
- **Do not hide estimator disagreement behind one score.** The disagreement is
  the signal; a source can look ideal to one method and be worthless under
  another.
- **Do not reuse calibration observations as seed material.** They have been
  recorded, analysed, and possibly exported.
- **Do not present guidance as a guarantee.** `estimatedSamplesRequired`
  follows from a sample of a process that behaved a certain way once. Human
  processes drift.

The estimators' sources, adaptations and limits are in
[docs/METHODOLOGY.md](../../docs/METHODOLOGY.md); the boundaries section is
worth reading before writing any user-facing copy.
