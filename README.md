# EntropyLab

Offline profiling for physical Bitcoin entropy processes before they are trusted with a seed.

## What it is

EntropyLab is an offline profiler for physical Bitcoin entropy ceremonies. It measures bias and
sequential predictability in dice, coin flips, and other discrete physical sources, estimates a
conservative min-entropy lower bound using multiple estimators, and turns that result into
reproducible guidance before a wallet seed is created.

EntropyLab profiles the entropy-generation **process**. It does not:

- generate a production Bitcoin seed
- request a mnemonic
- request private keys
- upload calibration observations
- claim to certify true randomness

## Why it exists

Self-custody guides tell people to roll dice or flip coins, then stop there. Nobody checks whether
the dice are actually fair, whether the roller has a hand habit that repeats, or whether a "balanced
looking" sequence is in fact periodic. A source can look uniform in a histogram and still be highly
predictable.

The usual failure is counting rolls instead of measuring entropy. 99 rolls of a shaved die is not
256 bits. EntropyLab measures the process first, so the number of rolls is derived from evidence
rather than from a rule of thumb.

## BOSS Battle 2026

- Track: Cypherpunk
- Official problem: Physical Entropy Profiler
- Build status: early development
- This repository will be developed in public throughout the hack window.

## Current status

Repository initialized. No estimator implementation exists yet.

## Planned first milestone

Scope for the first working slice:

- process-profile data model
- synthetic adversarial fixtures
- most-common-value estimator
- collision estimator
- Markov estimator
- lag predictor
- structured entropy-analysis report

None of these are implemented yet. This section is the plan, not a changelog.

## Privacy model

EntropyLab runs offline. Calibration observations stay on the machine that produced them. There is
no telemetry, no account, and no upload path. Observations used for profiling are calibration data
and must never be reused as seed material.

## License

MIT. See [LICENSE](LICENSE).
