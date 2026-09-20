# Project Scope

## The problem

Physical entropy ceremonies are recommended widely and verified almost never. A user rolls dice,
flips coins, or draws cards, and the only check applied is a count of how many rolls were made.
That count assumes every roll carries full entropy. Real physical sources break that assumption in
ways a casual look will not catch:

- a die weighted toward one face
- a flipping habit that correlates each outcome with the previous one
- a sequence that is balanced overall but periodic
- too few samples to say anything with confidence

Any of these reduce the real entropy of the resulting seed while the ceremony still looks correct.

## v1 boundaries

EntropyLab v1 profiles a physical entropy **process** and reports a conservative min-entropy lower
bound per sample, plus guidance derived from it.

In scope:

- discrete physical sources (dice, coins, and similar small alphabets)
- offline analysis of a recorded observation sequence
- multiple independent estimators, with the most pessimistic result governing
- a structured, reproducible report

Out of scope for v1:

- seed or mnemonic generation
- wallet integration
- continuous hardware RNG monitoring
- hardware entropy source certification

## What EntropyLab will not claim

- It will not certify a source as truly random. Absence of detected structure is not proof of
  randomness.
- It will not produce or handle seeds, mnemonics, or private keys.
- It will not report a single authoritative entropy number as fact. Estimates are lower bounds
  with stated assumptions and sample-size limits.
- It will not transmit observations anywhere.

## Core proof idea

The way to show the profiler works is to feed it sources whose defects are known in advance and
check that it separates them. The planned comparison set:

| Source class      | Defect                               | What a correct profiler should do                    |
| ----------------- | ------------------------------------ | ---------------------------------------------------- |
| fair-like         | none injected                        | report a bound near the theoretical maximum          |
| biased            | skewed face probabilities            | penalize via the most-common-value estimator         |
| periodic-balanced | uniform marginals, repeating pattern | pass a frequency check, fail a sequential check      |
| correlated        | outcome depends on the previous one  | penalize via the Markov estimator and lag predictor  |
| low-sample        | too few observations                 | report low confidence rather than a confident number |

The periodic-balanced case is the one that matters most. A source that looks perfectly uniform in a
histogram and is still fully predictable is exactly what a count-the-rolls approach misses.
