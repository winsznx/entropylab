# Entropy profile: Periodic balanced d6

EntropyLab profiles an entropy-generation process. It does not generate, inspect, or handle seed material.

## Result

**0.0000 bits per symbol** (conservative estimate, against an ideal of 2.5850 for a 6-symbol alphabet).

Limiting estimator: **Lag predictor**.

### Recommended next step

**Change how you roll before using this process for a seed.**

The pattern is in the procedure, not in the sample size. Rolling more the same way will confirm it rather than remove it. Shake longer, use a cup, change the surface, then calibrate again.

## Dataset

| Field | Value |
| --- | --- |
| Provenance | **Synthetic test fixture** |
| Source | PERIODIC_BALANCED |
| Observations | 6000 |
| Alphabet size | 6 |
| Collection method | synthetic fixture PERIODIC_BALANCED |
| Input hash (SHA-256) | `6d4320e059e0ce9b8043f9982b4453f01cf67837a2d1779d0bed4db89aae88f0` |
| Algorithm version | 0.1.0 |
| Report format | 1.0.0 |

## Estimators

| Estimator | Bits per symbol | Status |
| --- | --- | --- |
| Most common value | 2.4815 | usable |
| Collision | 2.5850 | usable |
| Markov | 0.0194 | usable |
| Lag predictor | 0.0000 | usable |

## What to know about this result

- The estimators disagree by 2.58 bits per symbol. Disagreement is expected when one method detects structure the others cannot see, and the lowest figure governs.
- **Collision:** Mean collision time exceeded the range the method can resolve, so the estimate is capped at one bit per bit rather than measured.
- **Collision:** This method found no exploitable collision structure, so the estimate sits at the 2.585 bit ceiling for a 6-symbol alphabet. A ceiling value means this estimator found nothing, not that the source was shown to be strong.
- **Collision:** This estimate is computed over a 3-bit encoding of a 6-symbol alphabet. Because 6 is not a power of two, unreachable codewords bias the bitstring (observed one-rate 0.3889) independently of the source. The figure describes the source and this encoding together, not the source alone.
- **Markov:** Computed over a 6-symbol alphabet. SP 800-90B section 6.3.3 defines the Markov estimate for binary inputs only; this is a documented generalisation following the structure of the 2016 second draft, not the final method.

## Target guidance

No observation count is given. The measured rate does not support reaching a target by collecting more data from this process; the process itself needs to change.

## Methodology boundaries

Not every figure above carries the same authority. This report is not a NIST SP 800-90B validation and confers no certification.

- Most common value: SP 800-90B section 6.3.1, used directly. Defined over any alphabet. Agrees with the NIST reference implementation to ten decimal places.
- Lag predictor: SP 800-90B section 6.3.8, used directly, with the predictor conversion of 6.3.7 to 6.3.10. Agrees with the NIST reference implementation to ten decimal places.
- Collision: SP 800-90B section 6.3.2, adapted. Binary-only in the specification, so a non-binary alphabet is serialised first, and the result is capped at the alphabet ceiling. For a non-power-of-two alphabet the figure measures the source and that encoding together.
- Markov: a generalisation, not the published method. The final specification restricts it to binary; this follows the structure of the 2016 second draft over a k-symbol alphabet and does not reduce to the published method even at two symbols. It is excluded from the reference comparison because the two compute different quantities.
- Sample-size gates are this project's own judgement, not the specification's. SP 800-90B assumes around 1,000,000 samples throughout.

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
