# Entropy profile: Biased d6

EntropyLab profiles an entropy-generation process. It does not generate, inspect, or handle seed material.

## Result

**1.3747 bits per symbol** (conservative estimate, against an ideal of 2.5850 for a 6-symbol alphabet).

Limiting estimator: **Markov**.

## Dataset

| Field | Value |
| --- | --- |
| Source | BIASED |
| Observations | 6000 |
| Alphabet size | 6 |
| Collection method | synthetic fixture BIASED |
| Input hash (SHA-256) | `b5d11c562a0e9209bec7422b23bc9d07fd2a1412c6c9e2de978863e5d20760ff` |
| Algorithm version | 0.1.0 |
| Report format | 1.0.0 |

## Estimators

| Estimator | Bits per symbol | Status |
| --- | --- | --- |
| Most common value | 1.4055 | usable |
| Collision | 1.5130 | usable |
| Markov | 1.3747 | usable |
| Lag predictor | 2.1733 | usable |

## What to know about this result

- The estimators disagree by 0.80 bits per symbol. Disagreement is expected when one method detects structure the others cannot see, and the lowest figure governs.
- **Collision:** This estimate is computed over a 3-bit encoding of a 6-symbol alphabet. Because 6 is not a power of two, unreachable codewords bias the bitstring (observed one-rate 0.2994) independently of the source. The figure describes the source and this encoding together, not the source alone.
- **Markov:** Computed over a 6-symbol alphabet. SP 800-90B section 6.3.3 defines the Markov estimate for binary inputs only; this is a documented generalisation following the structure of the 2016 second draft, not the final method.

## Target guidance

| Target | Observations required at the measured rate |
| --- | --- |
| 128 bits | 94 |
| 256 bits | 187 |

These counts follow from the calibration sample. They are guidance, not a guarantee about observations that have not been made yet.

## Assumptions

- The observations were produced by the same physical process the report describes.
- Observations are recorded in the order they occurred. Every sequential estimator depends on this.
- The alphabet is fixed and every outcome was recorded, including repeats and results the operator disliked.
- The calibration sample is representative of how the process will behave during the ceremony it is meant to inform.

## Limitations

- Statistical testing cannot establish that a source is random. It can only find structure, and finding none is not proof that none exists.
- These four estimators do not exhaust the ways a physical process can be predictable. A source can pass all of them and still be predictable by a method not implemented here.
- The result describes the observed sample. It does not guarantee how the process will behave later, and human-operated processes drift.
- Small samples produce unstable estimates. Where an estimator reports instability, the figure can move substantially with more data.
- A figure at the alphabet ceiling means no structure was found, not that the source was shown to be strong.
- This is not a NIST SP 800-90B validation and confers no certification. Estimators derived from that document are noted individually, including where this implementation diverges from it.
- Entropy quality is one part of seed security. It does not address the wallet, the derivation, the operating system, or physical observation of the ceremony.
