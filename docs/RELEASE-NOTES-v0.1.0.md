# v0.1.0 release notes (draft)

**Not released.** This is a draft. See the checklist at the end for what is
still outstanding.

---

EntropyLab profiles a physical entropy process before it is trusted with a
Bitcoin seed. It measures bias and sequential predictability in dice, coins,
and other discrete physical sources, reports a conservative min-entropy lower
bound, and says which method limited it.

## The result this exists for

A dice sequence with a perfectly flat histogram, rated by frequency analysis at
2.4815 bits per roll against a 2.5850 ceiling. The same sequence, read in
order, is `1,2,3,4,5,6` repeating: the next roll is never in doubt. Sequential
analysis reports it at 0.0000.

Counting rolls is the check most people apply, and it rates this source as
good.

## What is in this release

**Analysis engine.** Four estimator families from NIST SP 800-90B: most common
value, collision, Markov, and the lag predictor. The conservative figure is the
lowest applicable estimate, and the method that produced it is named.

**Verified against the reference.** Every comparable estimator agrees with the
NIST SP 800-90B reference implementation to ten decimal places on all five test
datasets, using a binary built from NIST's own C++ rather than a
reimplementation.

**Offline application.** Define a process, record observations by keyboard or
import, analyse, read what was found and what to do about it, export a report.
No account, no backend, no telemetry. No request leaves the origin, which a
browser test asserts.

**Reports.** Canonical JSON with a SHA-256 of the dataset and the algorithm
version, plus Markdown generated from it. The observations are not included
unless you ask.

**Integrator API.** A wallet or signer can profile a user's dice in twelve
lines using the same entry point the application uses.

**Adversarial test campaign.** Five synthetic datasets with known defects, and
a proof campaign regenerated from code, so any published figure can be checked
by regenerating and diffing.

## What this is not

Not a NIST validation and not a certification. Four estimators do not exhaust
the ways a process can be predictable, and a result at the alphabet ceiling
means these methods found nothing rather than that a source is unpredictable.
SP 800-90B assumes around a million samples; a dice ceremony produces hundreds.

EntropyLab does not generate seeds, ask for a mnemonic, or touch private keys.

Calibration observations must never be reused as seed material.

## Known boundaries

Documented in full at
[docs/METHODOLOGY.md](./METHODOLOGY.md#methodology-boundaries).

- The Markov estimator is a k-ary generalisation, not the binary method in the
  final specification, and does not reduce to it at k=2.
- The collision estimator requires binary input, so a d6 is encoded to three
  bits first, and that encoding leaves its own mark on the result.
- Sample-size gates are this project's own judgement, not the specification's.

## Install

Requires Node 20 or later and pnpm.

```bash
git clone https://github.com/winsznx/entropylab
cd entropylab
pnpm install
pnpm --filter @entropylab/web dev
```

Verify the build:

```bash
pnpm test        # unit and regression
pnpm test:e2e    # browser, including offline
pnpm campaign    # regenerates the published results
pnpm benchmark   # regenerates the published timings
```

## Before tagging

- [ ] Physical dice campaign recorded, analysed, and committed
- [ ] Campaign F report published with real observations
- [x] Deployment succeeded and the link added to the README
- [ ] Demo recorded
- [ ] CHANGELOG moved from Unreleased to 0.1.0
